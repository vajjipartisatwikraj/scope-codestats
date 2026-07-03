const cron = require("node-cron");
const mongoose = require("mongoose");
const path = require("path");

// Import models
const User = require("../models/User");
const DailyStats = require("../models/DailyStats");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const PlatformAnalytics = require("../models/PlatformAnalytics");
const PlatformPerformance = require("../models/PlatformPerformance");
const PerformanceOverview = require("../models/PerformanceOverview");
const RankTrend = require("../models/RankTrend");
const DailyStatsStatus = require("../models/DailyStatsStatus");

// Database connection
const connectDB = require("../config/db");
const UserCohort = require("../models/UserCohort");

// Logging utility
const log = (message, level = "INFO") => {
  const timestamp = new Date().toISOString();
  const logLevel = level.padEnd(5);
  console.log(`[${timestamp}] [${logLevel}] ${message}`);
};

const logError = (message, error = null) => {
  log(message, "ERROR");
  if (error) {
    console.error("Error details:", error);
  }
};

const logSuccess = (message) => {
  log(message, "SUCCESS");
};

const logWarning = (message) => {
  log(message, "WARN");
};

/**
 * Calculate and update ranks for all users based on their total scores
 * Ranks are assigned in ascending order: Rank 1 = highest score
 */
async function calculateAndUpdateUserRanks() {
  try {
    log("🏆 Starting rank calculation for all users...");

    // Get academic year configuration to identify graduated users
    const AcademicYearConfig = require("../models/AcademicYearConfig");
    const academicConfig = await AcademicYearConfig.getConfig();

    // Get all graduation years that are marked as "Graduated"
    const graduatedYears = academicConfig.yearMappings
      .filter((mapping) => mapping.academicYear === "Graduated")
      .map((mapping) => mapping.graduationYear);

    // Get all users sorted by totalScore in descending order (highest score first)
    // Exclude admin, teacher, and graduated users from rankings
    const allUsers = await User.find({
      userType: { $nin: ["admin", "teacher"] },
      $or: [
        { graduatingYear: { $exists: false } },
        { graduatingYear: { $nin: graduatedYears } },
      ],
    })
      .select("_id name email department graduatingYear totalScore rankingInfo")
      .sort({ totalScore: -1, _id: 1 }) // Secondary sort by _id for consistent ordering
      .exec();

    if (allUsers.length === 0) {
      logWarning("⚠️  No users found for rank calculation");
      return { success: true, processedUsers: 0 };
    }

    log(
      `📊 Found ${allUsers.length} active users for rank calculation (excluding admins/teachers/graduated)`,
    );

    // Group users by department for department ranking
    const usersByDepartment = {};
    allUsers.forEach((user) => {
      const dept = user.department || "UNKNOWN";
      if (!usersByDepartment[dept]) {
        usersByDepartment[dept] = [];
      }
      usersByDepartment[dept].push(user);
    });

    // Calculate overall ranks
    let currentRank = 1;
    let previousScore = null;
    let usersWithSameScore = 0;

    const rankUpdates = [];

    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      const currentScore = user.totalScore || 0;

      // Handle tied scores - users with same score get the same rank
      if (previousScore !== null && currentScore !== previousScore) {
        currentRank = i + 1; // Move rank to actual position
      }

      // Calculate percentile (higher score = higher percentile)
      const percentile =
        allUsers.length > 1
          ? Math.round(((allUsers.length - i) / allUsers.length) * 100)
          : 100;

      // Get previous ranking info for rank change calculation
      const previousRank = user.rankingInfo?.overallRank;
      const rankChange = previousRank ? previousRank - currentRank : 0; // Positive = improved

      rankUpdates.push({
        userId: user._id,
        overallRank: currentRank,
        rankChange: rankChange,
        percentile: percentile,
        totalUsers: allUsers.length,
      });

      previousScore = currentScore;
    }

    // Calculate department ranks
    for (const [department, deptUsers] of Object.entries(usersByDepartment)) {
      // Sort department users by score (already sorted from main query)
      deptUsers.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

      let deptRank = 1;
      let prevDeptScore = null;

      for (let i = 0; i < deptUsers.length; i++) {
        const user = deptUsers[i];
        const currentScore = user.totalScore || 0;

        // Handle tied scores in department
        if (prevDeptScore !== null && currentScore !== prevDeptScore) {
          deptRank = i + 1;
        }

        // Find the corresponding rank update
        const rankUpdate = rankUpdates.find(
          (update) => update.userId.toString() === user._id.toString(),
        );

        if (rankUpdate) {
          const previousDeptRank = user.rankingInfo?.departmentRank;
          const deptRankChange = previousDeptRank
            ? previousDeptRank - deptRank
            : 0;

          rankUpdate.departmentRank = deptRank;
          rankUpdate.departmentRankChange = deptRankChange;
          rankUpdate.departmentUsers = deptUsers.length;
        }

        prevDeptScore = currentScore;
      }
    }

    // Bulk update all user rankings
    log(`🔄 Updating rankings for ${rankUpdates.length} users...`);

    const bulkOperations = rankUpdates.map((update) => ({
      updateOne: {
        filter: { _id: update.userId },
        update: {
          $set: {
            "rankingInfo.overallRank": update.overallRank,
            "rankingInfo.departmentRank": update.departmentRank || null,
            "rankingInfo.rankChange": update.rankChange,
            "rankingInfo.departmentRankChange":
              update.departmentRankChange || 0,
            "rankingInfo.totalUsers": update.totalUsers,
            "rankingInfo.departmentUsers": update.departmentUsers || 0,
            "rankingInfo.percentile": update.percentile,
            "rankingInfo.lastRankUpdate": new Date(),
          },
        },
      },
    }));

    const bulkResult = await User.bulkWrite(bulkOperations);

    // Calculate and update consistency index and seven day score for all users
    log(
      "🔄 Starting consistency index and seven day score calculation for all users...",
    );

    let consistencySuccessCount = 0;
    let consistencyErrorCount = 0;
    let sevenDaySuccessCount = 0;
    let sevenDayErrorCount = 0;
    const userMetricsUpdates = [];

    for (const user of allUsers) {
      try {
        // Calculate consistency index
        const consistencyIndex = await calculateConsistencyIndex(user._id);

        // Calculate seven day score
        const sevenDayScore = await calculateSevenDayScore(user._id);

        userMetricsUpdates.push({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $set: {
                consistencyIndex: consistencyIndex,
                sevenDayScore: sevenDayScore,
              },
            },
          },
        });

        consistencySuccessCount++;
        sevenDaySuccessCount++;

        log(
          `  ✅ ${user.name}: Consistency=${consistencyIndex}/5, SevenDayScore=${sevenDayScore}`,
        );
      } catch (error) {
        consistencyErrorCount++;
        sevenDayErrorCount++;
        logError(`  ❌ Failed to calculate metrics for ${user.name}:`, error);
      }
    }

    // Bulk update user metrics
    if (userMetricsUpdates.length > 0) {
      const metricsBulkResult = await User.bulkWrite(userMetricsUpdates);
      log(
        `📊 User metrics updated: ${metricsBulkResult.modifiedCount} users (consistency + sevenDayScore)`,
      );
    }

    // Log summary statistics
    log("✅ Rank calculation completed successfully!");
    log(`📈 Rankings Updated:`);
    log(`   📊 Total Users: ${allUsers.length}`);
    log(
      `   🏆 Rank #1: ${allUsers[0].name} (Score: ${
        allUsers[0].totalScore || 0
      })`,
    );
    log(`   🏢 Departments: ${Object.keys(usersByDepartment).length}`);
    log(`   💾 Database Updates: ${bulkResult.modifiedCount} users updated`);
    log(`📊 User Metrics Updates:`);
    log(`   ✅ Consistency calculated: ${consistencySuccessCount} users`);
    log(`   ❌ Consistency failed: ${consistencyErrorCount} users`);
    log(`   ✅ Seven day scores calculated: ${sevenDaySuccessCount} users`);
    log(`   ❌ Seven day scores failed: ${sevenDayErrorCount} users`);

    // Log top 5 users
    if (allUsers.length > 0) {
      log("🏅 Top 5 Users:");
      for (let i = 0; i < Math.min(5, allUsers.length); i++) {
        const user = allUsers[i];
        const rank = i + 1;
        log(
          `   #${rank}: ${user.name} - ${user.totalScore || 0} points (${
            user.department
          })`,
        );
      }
    }

    return {
      success: true,
      processedUsers: allUsers.length,
      departmentCount: Object.keys(usersByDepartment).length,
      updatedUsers: bulkResult.modifiedCount,
      consistencySuccessCount: consistencySuccessCount,
      consistencyErrorCount: consistencyErrorCount,
      sevenDaySuccessCount: sevenDaySuccessCount,
      sevenDayErrorCount: sevenDayErrorCount,
    };
  } catch (error) {
    logError("❌ Failed to calculate user rankings:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get current user data from their profiles for DailyStats creation
 * This function stores current user data directly without calculating changes from previous days
 * All data is taken from the current User document state
 */
async function getCurrentUserData(user) {
  try {
    log(`  📊 Extracting current data for user: ${user.name} (${user.email})`);

    // Get platform scores from user.platformScores (Map type)
    const platformScores = user.platformScores || new Map();

    // Extract platform data with proper fallbacks - platformScores is a Map!
    const leetcodeData = platformScores.get("leetcode") || {};
    const codechefData = platformScores.get("codechef") || {};
    const codeforcesData = platformScores.get("codeforces") || {};
    const hackerrankData = platformScores.get("hackerrank") || {};
    const scopecodestatsData = platformScores.get("scopecodestats") || {};

    // Extract GitHub data from user.githubStats (separate object, not in platformScores Map)
    const githubData = user.githubStats || {};

    // Calculate totals from actual user data
    const totalProblems =
      user.totalProblemsSolved || user.problemStats?.totalSolved || 0;
    const totalScore = user.totalScore || 0;
    const easyProblems = user.problemStats?.easySolved || 0;
    const mediumProblems = user.problemStats?.mediumSolved || 0;
    const hardProblems = user.problemStats?.hardSolved || 0;

    // Calculate contest totals
    const totalContests = user.contestStats?.totalContestsParticipated || 0;

    log(`    💯 Total Score: ${totalScore}`);
    log(
      `    🧩 Total Problems: ${totalProblems} (Easy: ${easyProblems}, Medium: ${mediumProblems}, Hard: ${hardProblems})`,
    );
    log(`    🏆 Total Contests: ${totalContests}`);
    log(`    🔍 Platform Data Check:`);
    log(
      `      LeetCode: ${leetcodeData.problemsSolved || 0} problems, score: ${
        leetcodeData.score || 0
      }`,
    );
    log(
      `      CodeChef: ${codechefData.problemsSolved || 0} problems, score: ${
        codechefData.score || 0
      }`,
    );
    log(
      `      Codeforces: ${
        codeforcesData.problemsSolved || 0
      } problems, score: ${codeforcesData.score || 0}`,
    );
    log(
      `      ScopeCODESTATS: ${
        scopecodestatsData.problemsSolved || 0
      } problems, score: ${scopecodestatsData.score || 0}, cohorts: ${
        scopecodestatsData.totalCohortsCompleted || 0
      }, PA contests: ${scopecodestatsData.totalPracticeArenaContests || 0}`,
    );

    const dailyStatsData = {
      userId: user._id,
      date: new Date(),

      // SCOPE metrics - store current user data directly
      scopeMetrics: {
        totalScore: totalScore,
        overallRank: user.rankingInfo?.overallRank || 0,
        departmentRank: user.rankingInfo?.departmentRank || 0,
        percentile: user.rankingInfo?.percentile || 0,
        totalUsers: user.rankingInfo?.totalUsers || 0,
        departmentUsers: user.rankingInfo?.departmentUsers || 0,
      },

      // Problem stats - store current user data directly
      problemStats: {
        totalProblems: totalProblems,
        easyProblems: easyProblems,
        mediumProblems: mediumProblems,
        hardProblems: hardProblems,
        dailyStreak: 0,
        maxStreak: 0,
        weeklyActivity: [],
      },

      // Contest stats - store current user data directly
      contestStats: {
        totalContests: totalContests,
        averageRating: 0,
        maxRating: Math.max(
          leetcodeData.rating || 0,
          codechefData.rating || 0,
          codeforcesData.maxRating || codeforcesData.rating || 0,
        ),
        recentContests: [],
      },

      // Platform-specific stats - store current user data from platformScores Map
      platformStats: {
        leetcode: {
          totalSolved: leetcodeData.problemsSolved || 0,
          easySolved: leetcodeData.easyProblemsSolved || 0,
          mediumSolved: leetcodeData.mediumProblemsSolved || 0,
          hardSolved: leetcodeData.hardProblemsSolved || 0,
          rating: leetcodeData.rating || 0,
          contestsAttended: leetcodeData.contestsParticipated || 0,
          scopeScore: leetcodeData.score || 0,
          lastUpdated: new Date(),
        },

        codechef: {
          totalSolved: codechefData.problemsSolved || 0,
          rating: codechefData.rating || 0,
          maxRating: codechefData.maxRating || 0,
          globalRank: codechefData.global_rank || 0,
          countryRank: codechefData.country_rank || 0,
          contestsRated: codechefData.contestsParticipated || 0,
          scopeScore: codechefData.score || 0,
          lastUpdated: new Date(),
        },

        codeforces: {
          totalSolved: codeforcesData.problemsSolved || 0,
          rating: codeforcesData.rating || 0,
          maxRating: codeforcesData.maxRating || 0,
          rank: codeforcesData.rank || "unrated",
          contestsRated: codeforcesData.contestsParticipated || 0,
          scopeScore: codeforcesData.score || 0,
          lastUpdated: new Date(),
        },

        hackerrank: {
          totalSolved: hackerrankData.problemsSolved || 0,
          badges: hackerrankData.badges || 0,
          certificates: hackerrankData.certificates || 0,
          contests: hackerrankData.contestsParticipated || 0,
          scopeScore: hackerrankData.score || 0,
          lastUpdated: new Date(),
        },

        github: {
          totalCommits: githubData.totalCommits || 0,
          commitsChange: 0, // Will be calculated from previous day
          publicRepos: githubData.publicRepos || 0,
          reposChange: 0, // Will be calculated from previous day
          followers: githubData.followers || 0,
          followersChange: 0, // Will be calculated from previous day
          starsReceived: githubData.starsReceived || 0,
          starsChange: 0, // Will be calculated from previous day
          contributionStreak: 0, // Not tracked in User model yet
          yearlyContributions: githubData.contributionsLastYear || 0,
          weeklyContributions: [], // Not tracked in User model yet
          scopeScore: 0, // Can be calculated based on commits/repos/etc
          scoreChange: 0,
          lastUpdated: new Date(),
        },

        scopecodestats: {
          totalSolved: scopecodestatsData.problemsSolved || 0,
          totalPracticeArenaContests:
            scopecodestatsData.totalPracticeArenaContests || 0,
          rating: scopecodestatsData.rating || 0,
          maxRating:
            scopecodestatsData.maxRating || scopecodestatsData.rating || 0,
          totalCohortsCompleted: scopecodestatsData.totalCohortsCompleted || 0,
          totalCohortProblemsSolved:
            scopecodestatsData.totalCohortProblemsolved || 0, // Note: lowercase 's' in User model
          totalCohortScore: scopecodestatsData.totalCohortScore || 0,
          consistencyIndex: scopecodestatsData.consistencyIndex || 0,
          consistencyScore: scopecodestatsData.consistencyScore || 0,
          rank: scopecodestatsData.rank || "unrated", // Can be "unrated" or number
          scopeScore: scopecodestatsData.score || 0,
          lastUpdated: new Date(),
        },
      },

      // User context snapshot - store current user information
      userSnapshot: {
        name: user.name,
        department: user.department,
        rollNumber: user.rollNumber,
        graduatingYear: user.graduatingYear,
        userType: user.userType || "user",
      },

      // Activity flags - determine based on actual data
      activityFlags: {
        wasActive:
          totalProblems > 0 ||
          totalContests > 0 ||
          (user.githubStats?.totalCommits || 0) > 0,
        hasSubmissions: totalProblems > 0,
        hasContests: totalContests > 0,
        hasAchievements: false,
      },
    };

    log(
      `    🎯 Activity Status: ${
        dailyStatsData.activityFlags.wasActive ? "Active" : "Inactive"
      }`,
    );
    log(
      `    📊 Generated SCOPE Score: ${dailyStatsData.scopeMetrics.totalScore}`,
    );

    return dailyStatsData;
  } catch (error) {
    logError(`Failed to get current user data for user ${user._id}:`, error);
    throw error;
  }
}

/**
 * Calculate user's score from exactly 7 days ago
 * @param {ObjectId} userId - User ID
 * @returns {Number} Score from 7 days ago (0 if no data available)
 */
async function calculateSevenDayScore(userId) {
  try {
    log(`  🔄 Calculating seven day score for user: ${userId}`);

    // Calculate the date exactly 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Set to midnight for consistent comparison

    log(
      `    📅 Looking for score on date: ${
        sevenDaysAgo.toISOString().split("T")[0]
      }`,
    );

    // Find DailyStats document from exactly 7 days ago
    const sevenDayStats = await DailyStats.findOne({
      userId: userId,
      date: {
        $gte: sevenDaysAgo,
        $lt: new Date(sevenDaysAgo.getTime() + 24 * 60 * 60 * 1000), // Next day
      },
    })
      .select("date scopeMetrics.totalScore")
      .lean();

    let sevenDayScore = 0;
    if (sevenDayStats) {
      sevenDayScore = sevenDayStats.scopeMetrics?.totalScore || 0;
      log(
        `    ✅ Found seven day score: ${sevenDayScore} (from ${
          sevenDayStats.date.toISOString().split("T")[0]
        })`,
      );
    } else {
      log(`    ❌ No data found for 7 days ago, defaulting to 0`);
    }

    return sevenDayScore;
  } catch (error) {
    logError(`Failed to calculate seven day score for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Calculate user consistency index based on score GROWTH in the last 7 days.
 *
 * Instead of checking whether totalScore > 0 (which would always be true for
 * any user who has ever scored, since scores are cumulative), this measures
 * whether the user GAINED score on each day compared to the previous day.
 *
 * IMPORTANT: To prevent a feedback loop, we subtract the consistency bonus
 * (and historical PA bonus) from totalScore before comparing. Without this,
 * the consistency bonus itself would show as "score growth" in DailyStats,
 * sustaining the streak without any real user activity.
 *
 * A day counts as "active" if the BASE score (totalScore minus self-referential
 * bonuses) increased from the previous day's DailyStats.
 *
 * @param {ObjectId} userId - User ID
 * @returns {Number} Consistency index between 0-5
 */
async function calculateConsistencyIndex(userId) {
  try {
    log(`  🔄 Calculating consistency index for user: ${userId}`);

    // Get last 8 days of DailyStats (need 8 to calculate 7 daily differences)
    // Sorted newest to oldest
    // Also fetch platformStats.scopecodestats to subtract self-referential bonuses
    const recentStats = await DailyStats.find({
      userId: userId,
    })
      .sort({ date: -1 })
      .limit(8)
      .select(
        "date scopeMetrics.totalScore platformStats.scopecodestats.consistencyScore platformStats.scopecodestats.totalPracticeArenaContests",
      )
      .lean();

    if (recentStats.length < 2) {
      log(
        `    ⚠️  Not enough data (${recentStats.length} docs) - returning consistency index: 0`,
      );
      return 0;
    }

    // Calculate score differences between consecutive days
    // recentStats[0] = today, recentStats[1] = yesterday, etc.
    //
    // KEY FIX: Subtract the consistency bonus and PA bonus from each day's totalScore
    // before comparing. This prevents the feedback loop where:
    //   consistency bonus → score growth → higher consistency → more bonus → repeat
    //
    // Only REAL activity (external platforms, cohort work) should count as growth.
    const dailyGrowth = [];
    for (let i = 0; i < recentStats.length - 1 && i < 7; i++) {
      const todayTotal = recentStats[i]?.scopeMetrics?.totalScore || 0;
      const todayConsistencyBonus =
        recentStats[i]?.platformStats?.scopecodestats?.consistencyScore || 0;
      const todayPABonus =
        (recentStats[i]?.platformStats?.scopecodestats
          ?.totalPracticeArenaContests || 0) * 10;
      const todayBaseScore = todayTotal - todayConsistencyBonus - todayPABonus;

      const yesterdayTotal = recentStats[i + 1]?.scopeMetrics?.totalScore || 0;
      const yesterdayConsistencyBonus =
        recentStats[i + 1]?.platformStats?.scopecodestats?.consistencyScore ||
        0;
      const yesterdayPABonus =
        (recentStats[i + 1]?.platformStats?.scopecodestats
          ?.totalPracticeArenaContests || 0) * 10;
      const yesterdayBaseScore =
        yesterdayTotal - yesterdayConsistencyBonus - yesterdayPABonus;

      const growth = todayBaseScore - yesterdayBaseScore;
      dailyGrowth.push(growth);
    }

    log(
      `    📊 Daily growth (base scores, newest to oldest): [${dailyGrowth.join(", ")}]`,
    );

    // Count consecutive days with positive score growth, starting from today
    let streak = 0;
    for (let i = 0; i < dailyGrowth.length; i++) {
      if (dailyGrowth[i] > 0) {
        streak++;
      } else {
        break;
      }
    }

    log(`    🔥 Active growth streak: ${streak} day(s)`);

    // Map streak to consistency index (0-5)
    let consistencyIndex = 0;

    if (streak === 0 || streak === 1) {
      consistencyIndex = 0;
    } else if (streak === 2 || streak === 3) {
      consistencyIndex = 1;
    } else if (streak === 4) {
      consistencyIndex = 2;
    } else if (streak === 5) {
      consistencyIndex = 3;
    } else if (streak === 6) {
      consistencyIndex = 4;
    } else if (streak >= 7) {
      consistencyIndex = 5;
    }

    log(
      `    ⭐ Consistency Index: ${consistencyIndex}/5 (based on ${streak} day growth streak)`,
    );

    return consistencyIndex;
  } catch (error) {
    logError(
      `Failed to calculate consistency index for user ${userId}:`,
      error,
    );
    return 0;
  }
}

/**
 * Calculate positive differences between current and previous DailyStats for PlatformPerformance
 * Returns only positive changes (0 if negative or no change)
 */
async function calculatePlatformDifferences(
  userId,
  currentStats,
  previousStats,
) {
  try {
    const platforms = [
      "leetcode",
      "codechef",
      "codeforces",
      "hackerrank",
      "github",
      "scopecodestats",
    ];
    const differences = {};

    platforms.forEach((platform) => {
      const currentScore =
        currentStats?.platformStats?.[platform]?.scopeScore || 0;
      const previousScore =
        previousStats?.platformStats?.[platform]?.scopeScore || 0;
      const difference = currentScore - previousScore;

      // Store only positive differences, otherwise 0
      differences[platform] = difference > 0 ? difference : 0;
    });

    // Calculate total difference
    differences.total = Object.values(differences).reduce(
      (sum, val) => sum + val,
      0,
    );

    log(`    🔍 Platform differences calculated - Total: ${differences.total}`);
    platforms.forEach((platform) => {
      if (differences[platform] > 0) {
        log(`      ${platform}: +${differences[platform]}`);
      }
    });

    return differences;
  } catch (error) {
    logError(
      `Failed to calculate platform differences for user ${userId}:`,
      error,
    );
    return {
      leetcode: 0,
      codechef: 0,
      codeforces: 0,
      hackerrank: 0,
      github: 0,
      scopecodestats: 0,
      total: 0,
    };
  }
}

/**
 * Get current and previous day DailyStats for difference calculation
 */
async function getCurrentAndPreviousDailyStats(userId) {
  try {
    // Get the latest 2 DailyStats documents (current and previous day)
    const stats = await DailyStats.find({ userId: userId })
      .sort({ date: -1 })
      .limit(2)
      .lean();

    const currentStats = stats[0] || null;
    const previousStats = stats[1] || null;

    if (currentStats) {
      log(
        `    📊 Current stats: ${
          currentStats.date.toISOString().split("T")[0]
        } - Score: ${currentStats.scopeMetrics?.totalScore || 0}`,
      );
    }
    if (previousStats) {
      log(
        `    📊 Previous stats: ${
          previousStats.date.toISOString().split("T")[0]
        } - Score: ${previousStats.scopeMetrics?.totalScore || 0}`,
      );
    }

    return { currentStats, previousStats };
  } catch (error) {
    logError(
      `Failed to get current and previous DailyStats for user ${userId}:`,
      error,
    );
    return { currentStats: null, previousStats: null };
  }
}

/**
 * Maintain 365-day rolling window for a specific user
 * Rolling window: (currentDay - 364) to currentDay
 * Example: Oct 4, 2025 → Oct 3, 2024 to Oct 4, 2025
 */
async function maintainUserDailyStats(user) {
  try {
    // Get today's date in IST timezone properly
    const today = new Date();
    // Convert to IST (UTC+5:30) and extract just the date part
    const istDateString = today.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Parse the IST date string (MM/DD/YYYY format)
    const [month, day, year] = istDateString.split("/");
    // To store an IST date in UTC: subtract 5.5 hours from midnight IST
    // Oct 10, 12:00 AM IST = Oct 9, 6:30 PM UTC (18:30:00 UTC)
    const todayIST = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0),
    );
    // Subtract 5.5 hours (5 hours 30 minutes = 19800000 milliseconds) to convert IST midnight to UTC
    todayIST.setTime(todayIST.getTime() - 5.5 * 60 * 60 * 1000);

    // Calculate the start date of the 365-day window
    // For EXACTLY 365 days including both start and end dates:
    // If today is Oct 4, 2025 (day 365), then day 1 is Oct 4, 2024
    // Formula: windowStart = today - 364 days (this gives us 365 total days)
    // Example: Oct 4, 2025 - 364 = Oct 5, 2024 (day 1), Oct 4, 2025 (day 365)
    // Count: Oct 5, 2024 to Oct 4, 2025 = 364 days difference, but 365 days inclusive!
    const windowStartDate = new Date(todayIST);
    windowStartDate.setDate(todayIST.getDate() - 364); // Creates a 365-day window when looping i=0 to i=364

    log(`Processing user: ${user.name} (${user.email})`);
    log(
      `  📅 Rolling window: ${windowStartDate.toISOString().split("T")[0]} to ${
        todayIST.toISOString().split("T")[0]
      } (365 days)`,
    );

    // Check existing documents count
    const existingDocs = await DailyStats.find({ userId: user._id })
      .select("date")
      .sort({ date: 1 })
      .lean();

    const existingCount = existingDocs.length;
    log(`  📊 User has ${existingCount} existing DailyStats documents`);

    // Get current user stats from User.js
    const currentUserData = await getCurrentUserData(user);

    if (existingCount === 0) {
      // Case 1: No documents exist - Create 365 documents total
      // Window: (currentDay - 364) to currentDay (inclusive)
      // Example: Oct 5, 2024 to Oct 4, 2025 = 365 days
      log(`  🆕 Creating initial 365 documents (364 zeros + 1 current stats)`);
      log(
        `  🗓️  Date range: ${windowStartDate.toISOString().split("T")[0]} to ${
          todayIST.toISOString().split("T")[0]
        }`,
      );

      const documentsToCreate = [];

      // Create ALL 365 documents from windowStartDate to todayIST (inclusive)
      // Loop from i=0 to i=364 (365 iterations total)
      // IMPORTANT: Use getTime() + milliseconds to properly add days
      // setDate() doesn't work correctly for adding large day offsets!
      for (let i = 0; i <= 364; i++) {
        // Use <= to include i=364, giving us windowStart + 0 to windowStart + 364 = 365 days
        const targetDate = new Date(
          windowStartDate.getTime() + i * 24 * 60 * 60 * 1000,
        ); // Add i days in milliseconds
        targetDate.setHours(0, 0, 0, 0);

        // Check if this is today's document (last iteration, i should be 364)
        const isToday = i === 364;

        if (isToday) {
          // Last document (today) - use current user stats
          const todayData = { ...currentUserData };
          todayData.date = targetDate;
          documentsToCreate.push(todayData);
          log(
            `  📅 Document ${i + 1}/365: ${
              targetDate.toISOString().split("T")[0]
            } - TODAY (current stats)`,
          );
        } else {
          // First 364 documents - use zeros with REQUIRED fields
          documentsToCreate.push({
            userId: user._id,
            date: targetDate,

            // SCOPE metrics with REQUIRED fields
            scopeMetrics: {
              totalScore: 0,
              scoreChange: 0,
              overallRank: 0, // REQUIRED FIELD
              rankChange: 0,
              departmentRank: 0, // REQUIRED FIELD
              departmentRankChange: 0,
              percentile: 0,
              totalUsers: 0, // REQUIRED FIELD
              departmentUsers: 0, // REQUIRED FIELD
            },

            // Problem stats
            problemStats: {
              totalProblems: 0,
              problemsChange: 0,
              easyProblems: 0,
              mediumProblems: 0,
              hardProblems: 0,
              dailyStreak: 0,
              maxStreak: 0,
              weeklyActivity: [],
            },

            // Contest stats
            contestStats: {
              totalContests: 0,
              contestsChange: 0,
              averageRating: 0,
              maxRating: 0,
              recentContests: [],
            },

            // Platform-specific stats with proper structure
            platformStats: {
              leetcode: {
                totalSolved: 0,
                solvedChange: 0,
                easySolved: 0,
                mediumSolved: 0,
                hardSolved: 0,
                rating: 0,
                ratingChange: 0,
                maxRating: 0,
                globalRanking: 0,
                contestsAttended: 0,
                totalSubmissions: 0,
                acceptedSubmissions: 0,
                acceptanceRate: 0,
                scopeScore: 0,
                scoreChange: 0,
                lastUpdated: targetDate,
              },
              codechef: {
                totalSolved: 0,
                solvedChange: 0,
                rating: 0,
                ratingChange: 0,
                maxRating: 0,
                globalRank: 0,
                stars: "",
                contestsRated: 0,
                countryRank: 0,
                scopeScore: 0,
                scoreChange: 0,
                lastUpdated: targetDate,
              },
              codeforces: {
                totalSolved: 0,
                solvedChange: 0,
                rating: 0,
                ratingChange: 0,
                maxRating: 0,
                rank: "",
                contestsRated: 0,
                contributionPoints: 0,
                scopeScore: 0,
                scoreChange: 0,
                lastUpdated: targetDate,
              },
              hackerrank: {
                totalSolved: 0,
                solvedChange: 0,
                hackos: 0,
                badges: 0,
                certifications: 0,
                contests: 0,
                domains: [],
                scopeScore: 0,
                scoreChange: 0,
                lastUpdated: targetDate,
              },
              github: {
                totalCommits: 0,
                commitsChange: 0,
                publicRepos: 0,
                reposChange: 0,
                followers: 0,
                followersChange: 0,
                starsReceived: 0,
                starsChange: 0,
                contributionStreak: 0,
                yearlyContributions: 0,
                weeklyContributions: [],
                scopeScore: 0,
                scoreChange: 0,
                lastUpdated: targetDate,
              },
            },

            // User context snapshot
            userSnapshot: {
              name: user.name,
              department: user.department,
              rollNumber: user.rollNumber,
              graduatingYear: user.graduatingYear,
              userType: user.userType || "user",
            },

            // Activity flags
            activityFlags: {
              wasActive: false,
              activePlatforms: [],
              inactivityDays: 0,
              lastActiveDate: null,
            },
          });
          // Log first 3 and last 3 zero documents to avoid spam
          if (i < 3 || i >= 361) {
            log(
              `  📅 Document ${i + 1}/365: ${
                targetDate.toISOString().split("T")[0]
              } - zeros`,
            );
          } else if (i === 3) {
            log(`  📅 ... (documents 4-361 with zeros) ...`);
          }
        }
      }

      log(`  💾 Total documents to insert: ${documentsToCreate.length}`);
      log(
        `  📝 First document date: ${
          documentsToCreate[0].date.toISOString().split("T")[0]
        }`,
      );
      log(
        `  📝 Last document date: ${
          documentsToCreate[documentsToCreate.length - 1].date
            .toISOString()
            .split("T")[0]
        }`,
      );

      // Bulk insert all 365 documents
      try {
        const result = await DailyStats.insertMany(documentsToCreate, {
          ordered: false,
        });
        log(
          `  ✅ Created ${result.length} DailyStats documents (364 zeros + 1 current stats)`,
        );
        log(
          `  📝 First document date: ${
            documentsToCreate[0].date.toISOString().split("T")[0]
          }`,
        );
        log(
          `  📝 Last document date: ${
            documentsToCreate[documentsToCreate.length - 1].date
              .toISOString()
              .split("T")[0]
          }`,
        );
      } catch (insertError) {
        logError(`  ❌ Failed to insert documents:`, insertError);
        if (insertError.writeErrors) {
          log(`  📝 Write errors: ${insertError.writeErrors.length}`);
          insertError.writeErrors.slice(0, 3).forEach((err) => {
            log(`    - ${err.errmsg}`);
          });
        }
        throw insertError;
      }
    } else if (existingCount < 365) {
      // Case 2: User has some documents but less than 365 - Backfill missing documents
      log(
        `  ⚠️  User has only ${existingCount} documents, backfilling to 365...`,
      );

      // Get existing dates to avoid duplicates
      const existingDateSet = new Set(
        existingDocs.map(
          (doc) => new Date(doc.date).toISOString().split("T")[0],
        ),
      );

      const documentsToCreate = [];

      // Create missing documents from windowStartDate to todayIST (inclusive)
      // Loop from i=0 to i=364 (365 iterations total)
      // IMPORTANT: Use getTime() + milliseconds to properly add days
      for (let i = 0; i <= 364; i++) {
        // Use <= to include i=364
        const targetDate = new Date(
          windowStartDate.getTime() + i * 24 * 60 * 60 * 1000,
        ); // Add i days in milliseconds
        targetDate.setHours(0, 0, 0, 0);

        const dateString = targetDate.toISOString().split("T")[0];
        const isToday = i === 364;

        // Only create if document doesn't exist for this date
        if (!existingDateSet.has(dateString)) {
          if (isToday) {
            // Last document (today) - use current stats
            const todayData = { ...currentUserData };
            todayData.date = targetDate;
            documentsToCreate.push(todayData);
            log(
              `  📅 Creating document ${
                i + 1
              }/365: ${dateString} - TODAY (current stats)`,
            );
          } else {
            // Historical documents - use zeros with REQUIRED fields
            documentsToCreate.push({
              userId: user._id,
              date: targetDate,

              // SCOPE metrics with REQUIRED fields
              scopeMetrics: {
                totalScore: 0,
                scoreChange: 0,
                overallRank: 0, // REQUIRED FIELD
                rankChange: 0,
                departmentRank: 0, // REQUIRED FIELD
                departmentRankChange: 0,
                percentile: 0,
                totalUsers: 0, // REQUIRED FIELD
                departmentUsers: 0, // REQUIRED FIELD
              },

              // Problem stats
              problemStats: {
                totalProblems: 0,
                problemsChange: 0,
                easyProblems: 0,
                mediumProblems: 0,
                hardProblems: 0,
                dailyStreak: 0,
                maxStreak: 0,
                weeklyActivity: [],
              },

              // Contest stats
              contestStats: {
                totalContests: 0,
                contestsChange: 0,
                averageRating: 0,
                maxRating: 0,
                recentContests: [],
              },

              // Platform-specific stats with proper structure
              platformStats: {
                leetcode: {
                  totalSolved: 0,
                  solvedChange: 0,
                  easySolved: 0,
                  mediumSolved: 0,
                  hardSolved: 0,
                  rating: 0,
                  ratingChange: 0,
                  maxRating: 0,
                  globalRanking: 0,
                  contestsAttended: 0,
                  totalSubmissions: 0,
                  acceptedSubmissions: 0,
                  acceptanceRate: 0,
                  scopeScore: 0,
                  scoreChange: 0,
                  lastUpdated: targetDate,
                },
                codechef: {
                  totalSolved: 0,
                  solvedChange: 0,
                  rating: 0,
                  ratingChange: 0,
                  maxRating: 0,
                  globalRank: 0,
                  stars: "",
                  contestsRated: 0,
                  countryRank: 0,
                  scopeScore: 0,
                  scoreChange: 0,
                  lastUpdated: targetDate,
                },
                codeforces: {
                  totalSolved: 0,
                  solvedChange: 0,
                  rating: 0,
                  ratingChange: 0,
                  maxRating: 0,
                  rank: "",
                  contestsRated: 0,
                  contributionPoints: 0,
                  scopeScore: 0,
                  scoreChange: 0,
                  lastUpdated: targetDate,
                },
                hackerrank: {
                  totalSolved: 0,
                  solvedChange: 0,
                  hackos: 0,
                  badges: 0,
                  certifications: 0,
                  contests: 0,
                  domains: [],
                  scopeScore: 0,
                  scoreChange: 0,
                  lastUpdated: targetDate,
                },
                github: {
                  totalCommits: 0,
                  commitsChange: 0,
                  publicRepos: 0,
                  reposChange: 0,
                  followers: 0,
                  followersChange: 0,
                  starsReceived: 0,
                  starsChange: 0,
                  contributionStreak: 0,
                  yearlyContributions: 0,
                  weeklyContributions: [],
                  scopeScore: 0,
                  scoreChange: 0,
                  lastUpdated: targetDate,
                },
              },

              // User context snapshot
              userSnapshot: {
                name: user.name,
                department: user.department,
                rollNumber: user.rollNumber,
                graduatingYear: user.graduatingYear,
                userType: user.userType || "user",
              },

              // Activity flags
              activityFlags: {
                wasActive: false,
                activePlatforms: [],
                inactivityDays: 0,
                lastActiveDate: null,
              },
            });
          }
        }
      }

      // Update today's document if it already exists
      if (existingDateSet.has(todayIST.toISOString().split("T")[0])) {
        const todayData = { ...currentUserData };
        todayData.date = todayIST;

        await DailyStats.updateOne(
          { userId: user._id, date: todayIST },
          { $set: todayData },
        );
        log(`  🔄 Updated today's document with current stats`);
      }

      // Bulk insert missing documents
      if (documentsToCreate.length > 0) {
        try {
          const result = await DailyStats.insertMany(documentsToCreate, {
            ordered: false,
          });
          log(`  ✅ Created ${result.length} missing DailyStats documents`);
        } catch (insertError) {
          logError(`  ❌ Failed to insert backfill documents:`, insertError);
          if (insertError.writeErrors) {
            log(`  📝 Write errors: ${insertError.writeErrors.length}`);
          }
          throw insertError;
        }
      }

      // Clean up any documents outside the rolling window
      const deleteOldResult = await DailyStats.deleteMany({
        userId: user._id,
        date: { $lt: windowStartDate },
      });

      if (deleteOldResult.deletedCount > 0) {
        log(
          `  🧹 Cleaned up ${deleteOldResult.deletedCount} documents outside the rolling window`,
        );
      }

      const finalCount = await DailyStats.countDocuments({ userId: user._id });
      log(`  📊 Final document count: ${finalCount} (target: 365)`);
    } else {
      // Case 3: User already has 365 documents - Rolling window maintenance
      log(`  ♻️  Maintaining rolling window (${existingCount} documents)`);

      // Step 1: Delete the oldest document (the one before windowStartDate)
      const oldestDoc = existingDocs[0];
      if (oldestDoc && new Date(oldestDoc.date) < windowStartDate) {
        await DailyStats.deleteOne({
          userId: user._id,
          date: oldestDoc.date,
        });
        log(
          `  🗑️  Deleted oldest document: ${
            new Date(oldestDoc.date).toISOString().split("T")[0]
          }`,
        );
      }

      // Step 2: Check if today's document already exists
      const todayExists = await DailyStats.findOne({
        userId: user._id,
        date: todayIST,
      });

      if (todayExists) {
        // Update today's document with current user stats
        const todayData = { ...currentUserData };
        todayData.date = todayIST;

        await DailyStats.updateOne(
          { userId: user._id, date: todayIST },
          { $set: todayData },
        );
        log(
          `  🔄 Updated today's document (${
            todayIST.toISOString().split("T")[0]
          }) with current stats`,
        );
      } else {
        // Create today's document with current user stats
        const todayData = { ...currentUserData };
        todayData.date = todayIST;

        await DailyStats.create(todayData);
        log(
          `  ✅ Created today's document (${
            todayIST.toISOString().split("T")[0]
          }) with current stats`,
        );
      }

      // Step 3: Clean up any documents outside the rolling window (safety)
      const deleteOldResult = await DailyStats.deleteMany({
        userId: user._id,
        date: { $lt: windowStartDate },
      });

      if (deleteOldResult.deletedCount > 0) {
        log(
          `  🧹 Cleaned up ${deleteOldResult.deletedCount} documents outside the rolling window`,
        );
      }

      const finalCount = await DailyStats.countDocuments({ userId: user._id });
      log(`  📊 Final document count: ${finalCount} (should be ≤ 365)`);
    }

    return true;
  } catch (error) {
    logError(`Failed to maintain DailyStats for user ${user._id}:`, error);
    return false;
  }
}

/**
 * Regenerate all analytics for a user using comprehensive calculation logic
 * ✅ ONLY USES DailyStats DOCUMENTS - NO User.js DATA
 */
async function regenerateUserAnalytics(user) {
  try {
    log(`  📊 Regenerating analytics for user: ${user.name}`);
    const userEmail = user.email;

    // Get all DailyStats for the user (up to 365 days) - sorted by date DESC (newest first)
    const allStats = await DailyStats.find({ userId: user._id })
      .sort({ date: -1 })
      .limit(365);

    if (allStats.length === 0) {
      log(`    ⚠️  No DailyStats found for user ${user.name}`);
      return true; // Not an error, just no data yet
    }

    const latestStats = allStats[0]; // Most recent stats
    log(`    📊 Found ${allStats.length} daily stats records`);
    log(`    📅 Latest date: ${latestStats.date.toISOString().split("T")[0]}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. REGENERATE PERFORMANCE OVERVIEW (from DailyStats ONLY)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      log(`    🔄 Calculating PerformanceOverview from DailyStats...`);

      // Get current values from LATEST DailyStats
      const currentScore = latestStats.scopeMetrics?.totalScore || 0;
      const currentRank = latestStats.scopeMetrics?.overallRank || 0;
      const currentProblems = latestStats.problemStats?.totalProblems || 0;

      // Find stats from exactly 30 days ago (with ±1 day tolerance for missing documents)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find the DailyStats document closest to exactly 30 days ago
      // Use ±1 day tolerance (more precise than ±3)
      let oldStats = null;
      let minDiff = Infinity;

      for (const stat of allStats) {
        const statDate = new Date(stat.date);
        const diff = Math.abs(statDate - thirtyDaysAgo);
        const daysDiff = diff / (1000 * 60 * 60 * 24);

        // Only consider documents within 1 day of the target (30±1 = 29-31 days)
        if (daysDiff <= 1 && diff < minDiff) {
          minDiff = diff;
          oldStats = stat;
        }
      }

      const oldScore = oldStats?.scopeMetrics?.totalScore || 0;
      const oldRank = oldStats?.scopeMetrics?.overallRank || 0;
      const oldProblems = oldStats?.problemStats?.totalProblems || 0;

      log(
        `    📅 Target date (30 days ago): ${
          thirtyDaysAgo.toISOString().split("T")[0]
        }`,
      );
      if (oldStats) {
        const foundDate = new Date(oldStats.date);
        const daysDiff = Math.round(
          (new Date() - foundDate) / (1000 * 60 * 60 * 24),
        );
        log(
          `    ✅ Found stats from: ${
            foundDate.toISOString().split("T")[0]
          } (${daysDiff} days ago)`,
        );
        log(
          `    📊 Old values: Score=${oldScore}, Rank=${oldRank}, Problems=${oldProblems}`,
        );
      } else {
        log(
          `    ⚠️  No stats found from ~30 days ago, using zeros for comparison`,
        );
      }

      // Calculate active days (days where wasActive = true)
      const totalActiveDays = allStats.filter(
        (stat) => stat.activityFlags?.wasActive,
      ).length;

      // Calculate changes
      const scoreChangeLastMonth = currentScore - oldScore;
      const rankChangeLastMonth = oldRank - currentRank; // Positive = rank improved
      const problemsChangeLastMonth = currentProblems - oldProblems;

      log(
        `    � Current: Score=${currentScore}, Rank=${currentRank}, Problems=${currentProblems}`,
      );
      log(
        `    📉 30d ago: Score=${oldScore}, Rank=${oldRank}, Problems=${oldProblems}`,
      );
      log(
        `    📊 Changes: Score=${
          scoreChangeLastMonth > 0 ? "+" : ""
        }${scoreChangeLastMonth}, ` +
          `Rank=${rankChangeLastMonth > 0 ? "+" : ""}${rankChangeLastMonth}, ` +
          `Problems=${
            problemsChangeLastMonth > 0 ? "+" : ""
          }${problemsChangeLastMonth}`,
      );
      log(`    🔥 Active Days: ${totalActiveDays}/${allStats.length}`);

      // Update PerformanceOverview with ONLY DailyStats data
      await PerformanceOverview.updatePerformance(user._id, userEmail, {
        currentScore,
        currentRank,
        currentProblems,
        totalActiveDays,
        lastMonthScore: oldScore,
        lastMonthRank: oldRank,
        lastMonthProblems: oldProblems,
        scoreChangeLastMonth,
        rankChangeLastMonth,
        problemsChangeLastMonth,
        presentDate: latestStats.date, // Current document date
        pastDate: oldStats ? oldStats.date : null, // 30-day-old document date
      });

      log(`    ✅ PerformanceOverview regenerated (all from DailyStats)`);
    } catch (error) {
      logError(`    ❌ Failed to regenerate PerformanceOverview:`, error);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTE: The activity heatmap (ActivityHeatmap) is now event-driven — it is
    // maintained incrementally by submission triggers and the profile-sync
    // external-delta trigger. It must NOT be regenerated here, as a daily
    // rebuild would wipe the counts accumulated live during the day.
    // ═══════════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. REGENERATE PLATFORM ANALYTICS (from DailyStats ONLY)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      log(`    🔄 Calculating PlatformAnalytics from DailyStats...`);
      await PlatformAnalytics.deleteMany({ userId: user._id });

      // Get data from LATEST DailyStats (most recent)
      const leetcodeData = latestStats.platformStats?.leetcode || {};
      const codechefData = latestStats.platformStats?.codechef || {};
      const codeforcesData = latestStats.platformStats?.codeforces || {};
      const hackerrankData = latestStats.platformStats?.hackerrank || {};
      const githubData = latestStats.platformStats?.github || {};
      const scopecodestatsData =
        latestStats.platformStats?.scopecodestats || {};

      // Build platform analytics from DailyStats
      const platformAnalytics = {
        leetcode: {
          problemsSolved: leetcodeData.totalSolved || 0,
          score: leetcodeData.scopeScore || 0,
          totalContests: leetcodeData.contestsAttended || 0,
          rating: leetcodeData.rating || 0,
          weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
        },
        codechef: {
          problemsSolved: codechefData.totalSolved || 0,
          score: codechefData.scopeScore || 0,
          totalContests: codechefData.contestsRated || 0,
          rating: codechefData.rating || 0,
          weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
        },
        codeforces: {
          problemsSolved: codeforcesData.totalSolved || 0,
          score: codeforcesData.scopeScore || 0,
          totalContests: codeforcesData.contestsRated || 0,
          rating: codeforcesData.rating || 0,
          weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
        },
        hackerrank: {
          problemsSolved: hackerrankData.totalSolved || 0,
          score: hackerrankData.scopeScore || 0,
        },
        github: {
          commits: githubData.totalCommits || 0,
          repos: githubData.publicRepos || 0,
          score: githubData.scopeScore || 0,
          contributions: {
            thisWeek: 0,
            thisMonth: 0,
            thisYear: githubData.yearlyContributions || 0,
          },
          languages: [],
        },
        scopecodestats: {
          problemsSolved: scopecodestatsData.totalSolved || 0,
          score: scopecodestatsData.scopeScore || 0,
          totalPracticeArenaContests:
            scopecodestatsData.totalPracticeArenaContests || 0,
          rating: scopecodestatsData.rating || 0,
          totalCohortsCompleted: scopecodestatsData.totalCohortsCompleted || 0,
          totalCohortProblemsSolved:
            scopecodestatsData.totalCohortProblemsSolved || 0,
          totalCohortScore: scopecodestatsData.totalCohortScore || 0,
          consistencyIndex: scopecodestatsData.consistencyIndex || 0,
          consistencyScore: scopecodestatsData.consistencyScore || 0,
          rank: scopecodestatsData.rank || "unrated", // Can be "unrated" or number
        },
      };

      log(`    📊 Platform data from latest DailyStats:`);
      log(
        `      LeetCode: ${platformAnalytics.leetcode.problemsSolved} problems, score: ${platformAnalytics.leetcode.score}`,
      );
      log(
        `      CodeChef: ${platformAnalytics.codechef.problemsSolved} problems, score: ${platformAnalytics.codechef.score}`,
      );
      log(
        `      Codeforces: ${platformAnalytics.codeforces.problemsSolved} problems, score: ${platformAnalytics.codeforces.score}`,
      );
      log(
        `      HackerRank: ${platformAnalytics.hackerrank.problemsSolved} problems, score: ${platformAnalytics.hackerrank.score}`,
      );
      log(
        `      GitHub: ${platformAnalytics.github.repos} repos, ${platformAnalytics.github.commits} commits`,
      );
      log(
        `      ScopeCODESTATS: ${platformAnalytics.scopecodestats.problemsSolved} problems, score: ${platformAnalytics.scopecodestats.score}, PA contests: ${platformAnalytics.scopecodestats.totalPracticeArenaContests}`,
      );

      // Calculate weekly ratings for platforms with contest data
      // Week1 = 21 days ago, Week2 = 14 days ago, Week3 = 7 days ago, Week4 = today
      log(`    📊 Calculating weekly ratings from DailyStats...`);
      const recentStats = allStats.slice(0, Math.min(28, allStats.length)); // Last 4 weeks

      ["leetcode", "codechef", "codeforces"].forEach((platform) => {
        for (let week = 1; week <= 4; week++) {
          const daysBack = (4 - week) * 7; // Week1=21, Week2=14, Week3=7, Week4=0

          if (daysBack === 0) {
            // Week4 = today's rating
            platformAnalytics[platform].weeklyRatings[`week${week}`] =
              latestStats.platformStats?.[platform]?.rating || 0;
          } else if (daysBack < recentStats.length) {
            // Historical week - get rating from that specific day
            const historicalStats = recentStats[daysBack];
            platformAnalytics[platform].weeklyRatings[`week${week}`] =
              historicalStats?.platformStats?.[platform]?.rating || 0;
          } else {
            // Not enough data
            platformAnalytics[platform].weeklyRatings[`week${week}`] = 0;
          }
        }

        log(
          `      ${platform}: W1=${platformAnalytics[platform].weeklyRatings.week1}, ` +
            `W2=${platformAnalytics[platform].weeklyRatings.week2}, ` +
            `W3=${platformAnalytics[platform].weeklyRatings.week3}, ` +
            `W4=${platformAnalytics[platform].weeklyRatings.week4}`,
        );
      });

      // Calculate totals
      const totalScore =
        platformAnalytics.leetcode.score +
        platformAnalytics.codechef.score +
        platformAnalytics.codeforces.score +
        platformAnalytics.hackerrank.score +
        platformAnalytics.github.score;

      const totalProblems =
        platformAnalytics.leetcode.problemsSolved +
        platformAnalytics.codechef.problemsSolved +
        platformAnalytics.codeforces.problemsSolved +
        platformAnalytics.hackerrank.problemsSolved;

      const activePlatforms = [
        platformAnalytics.leetcode.score > 0,
        platformAnalytics.codechef.score > 0,
        platformAnalytics.codeforces.score > 0,
        platformAnalytics.hackerrank.score > 0,
        platformAnalytics.github.score > 0,
      ].filter(Boolean).length;

      // Save to database
      const analytics = new PlatformAnalytics({
        userId: user._id,
        email: userEmail,
        ...platformAnalytics,
        totalScore,
        totalProblems,
        activePlatforms,
      });

      await analytics.save();
      log(
        `    ✅ PlatformAnalytics regenerated (Total: ${totalScore} score, ${totalProblems} problems, ${activePlatforms} active platforms)`,
      );
    } catch (error) {
      logError(`    ❌ Failed to regenerate PlatformAnalytics:`, error);
    }

    // 4. Regenerate RankTrend with comprehensive logic - populate ALL days/weeks/months from DailyStats
    try {
      await RankTrend.deleteMany({ userId: user._id });

      log(`   🔄 Generating RankTrend with historical data from DailyStats...`);

      const rankTrend = {
        weeklyRanks: {
          sunday: null,
          monday: null,
          tuesday: null,
          wednesday: null,
          thursday: null,
          friday: null,
          saturday: null,
        },
        monthlyRanks: {
          week1: null,
          week2: null,
          week3: null,
          week4: null,
        },
        yearlyRanks: {
          january: null,
          february: null,
          march: null,
          april: null,
          may: null,
          june: null,
          july: null,
          august: null,
          september: null,
          october: null,
          november: null,
          december: null,
        },
        currentWeek: null,
        currentMonth: null,
        currentYear: new Date().getFullYear(),
      };

      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];
      const today = new Date();

      // WEEKLY RANKS: Populate all 7 days of the current week from DailyStats
      log(`   📅 Populating weekly ranks for last 7 days...`);
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        const dayName = dayNames[targetDate.getDay()];

        // Find DailyStats for this specific day
        const dayStats = allStats.find((stat) => {
          const statDate = new Date(stat.date);
          return statDate.toDateString() === targetDate.toDateString();
        });

        if (dayStats && dayStats.scopeMetrics?.overallRank) {
          rankTrend.weeklyRanks[dayName] = dayStats.scopeMetrics.overallRank;
          log(`     ${dayName}: Rank #${dayStats.scopeMetrics.overallRank}`);
        }
      }

      // MONTHLY RANKS: Populate all 4 weeks of the current month from DailyStats
      log(`   📅 Populating monthly ranks for last 4 weeks...`);
      for (let week = 1; week <= 4; week++) {
        // Get a representative day for each week (e.g., 21, 14, 7, 0 days back)
        const daysBack = (4 - week) * 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - daysBack);

        // Find closest DailyStats within ±1 day
        const weekStats = allStats.find((stat) => {
          const statDate = new Date(stat.date);
          const dayDiff = Math.abs(
            (statDate - targetDate) / (1000 * 60 * 60 * 24),
          );
          return dayDiff <= 1;
        });

        if (weekStats && weekStats.scopeMetrics?.overallRank) {
          rankTrend.monthlyRanks[`week${week}`] =
            weekStats.scopeMetrics.overallRank;
          log(
            `     Week ${week} (${daysBack} days back): Rank #${weekStats.scopeMetrics.overallRank}`,
          );
        }
      }

      // Set current week
      const getCurrentWeekOfMonth = () => {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const dayOfMonth = today.getDate();
        const startingDayOfWeek = firstDay.getDay();
        return Math.ceil((dayOfMonth + startingDayOfWeek) / 7);
      };
      rankTrend.currentWeek = getCurrentWeekOfMonth();

      // YEARLY RANKS: Populate all 12 months from DailyStats
      log(`   📅 Populating yearly ranks for last 12 months...`);
      for (let monthsBack = 0; monthsBack < 12; monthsBack++) {
        const targetDate = new Date(today);
        targetDate.setMonth(today.getMonth() - monthsBack);
        const monthIndex = targetDate.getMonth();
        const monthName = monthNames[monthIndex];
        const year = targetDate.getFullYear();

        // Find stats from that month (use latest available day in that month)
        const monthStats = allStats.filter((stat) => {
          const statDate = new Date(stat.date);
          return (
            statDate.getMonth() === monthIndex &&
            statDate.getFullYear() === year
          );
        });

        if (monthStats.length > 0 && monthStats[0].scopeMetrics?.overallRank) {
          // Use the most recent stats from that month
          rankTrend.yearlyRanks[monthName] =
            monthStats[0].scopeMetrics.overallRank;
          log(
            `     ${monthName} ${year}: Rank #${monthStats[0].scopeMetrics.overallRank}`,
          );
        }
      }

      rankTrend.currentMonth = today.getMonth() + 1;

      // Create new RankTrend document
      await RankTrend.create({
        userId: user._id,
        email: user.email,
        ...rankTrend,
        lastUpdated: new Date(),
      });

      // Count how many fields were populated
      const weeklyCount = Object.values(rankTrend.weeklyRanks).filter(
        (r) => r !== null,
      ).length;
      const monthlyCount = Object.values(rankTrend.monthlyRanks).filter(
        (r) => r !== null,
      ).length;
      const yearlyCount = Object.values(rankTrend.yearlyRanks).filter(
        (r) => r !== null,
      ).length;

      log(
        `     ✅ RankTrend regenerated: ${weeklyCount}/7 days, ${monthlyCount}/4 weeks, ${yearlyCount}/12 months populated`,
      );
    } catch (error) {
      logError(`    ❌ Failed to regenerate RankTrend:`, error);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. REGENERATE PLATFORM PERFORMANCE (from DailyStats ONLY)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      log(`    🔄 Calculating PlatformPerformance from DailyStats...`);
      await PlatformPerformance.deleteMany({ userId: user._id });

      if (allStats.length > 0) {
        const platformPerformance = {
          dailyPerformance: {
            sunday: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            monday: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            tuesday: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            wednesday: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            thursday: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            friday: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            saturday: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
          },
          monthlyPerformance: {
            week1: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            week2: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            week3: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            week4: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
          },
          yearlyPerformance: {
            january: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            february: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            march: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            april: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            may: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            june: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            july: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            august: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            september: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            october: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            november: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
            december: {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,

              hackerrank: 0,
              github: 0,
              total: 0,
            },
          },
        };

        const platforms = [
          "leetcode",
          "codechef",
          "codeforces",
          "hackerrank",
          "github",
          "scopecodestats",
        ];
        const dayNames = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];

        const today = new Date();

        // ═══════════════════════════════════════════════════════════════════════
        // DAILY PERFORMANCE: Calculate score gains for each of last 7 days
        // Use the most recent 7 DailyStats documents
        // ═══════════════════════════════════════════════════════════════════════
        log(`    📅 Calculating daily performance (last 7 days)...`);
        const recentStats = allStats.slice(0, 7); // Get most recent 7 documents (already sorted DESC)

        for (let i = 0; i < recentStats.length; i++) {
          const todayStats = recentStats[i];
          const yesterdayStats = recentStats[i + 1]; // Next document in DESC order is previous day

          // Get the day name from the document's date
          // The UTC date stored in MongoDB already represents the IST day correctly
          // E.g., 2025-10-09T18:30:00.000Z represents Oct 9 IST (not Oct 10)
          // Because 18:30 UTC is created by subtracting 5.5 hours from Oct 9 midnight IST
          const statDate = new Date(todayStats.date);
          const dayName = dayNames[statDate.getUTCDay()];

          if (todayStats?.platformStats) {
            // Log using the date from the document
            log(`      ${dayName} (${statDate.toISOString().split("T")[0]})`);

            platforms.forEach((platform) => {
              const todayScore =
                todayStats.platformStats[platform]?.scopeScore || 0;
              const yesterdayScore =
                yesterdayStats?.platformStats?.[platform]?.scopeScore || 0;

              // Calculate gain: today - yesterday (only store positive gains, negatives = 0)
              const scoreGain = todayScore - yesterdayScore;
              const positiveGain = scoreGain > 0 ? scoreGain : 0;

              platformPerformance.dailyPerformance[dayName][platform] =
                positiveGain;

              if (positiveGain > 0) {
                log(
                  `        ${platform}: ${todayScore} - ${yesterdayScore} = +${positiveGain}`,
                );
              }
            });

            // Store the dates used for calculation
            platformPerformance.dailyPerformance[dayName].presentDate =
              todayStats.date;
            platformPerformance.dailyPerformance[dayName].pastDate =
              yesterdayStats?.date || null;

            // Calculate total
            platformPerformance.dailyPerformance[dayName].total =
              platforms.reduce(
                (sum, platform) =>
                  sum + platformPerformance.dailyPerformance[dayName][platform],
                0,
              );

            if (platformPerformance.dailyPerformance[dayName].total > 0) {
              log(
                `      🏆 Total: +${platformPerformance.dailyPerformance[dayName].total}`,
              );
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // MONTHLY PERFORMANCE: Calculate score gains for each of last 4 weeks
        // Week1 = 21 days back, Week2 = 14 days back, Week3 = 7 days back, Week4 = today
        // ═══════════════════════════════════════════════════════════════════════
        log(`    📊 Calculating monthly performance (last 4 weeks)...`);
        for (let week = 1; week <= 4; week++) {
          const daysBack = (4 - week) * 7; // Week1=21, Week2=14, Week3=7, Week4=0

          const currentDate = new Date(today);
          currentDate.setDate(today.getDate() - daysBack);
          currentDate.setHours(0, 0, 0, 0);

          // Find stats for this week's representative day - match by date string (YYYY-MM-DD)
          const currentDateStr = currentDate.toISOString().split("T")[0];
          const currentWeekStats = allStats.find((stat) => {
            const statDateStr = new Date(stat.date).toISOString().split("T")[0];
            return statDateStr === currentDateStr;
          });

          // Find stats for 7 days before (previous week)
          const previousWeekDate = new Date(currentDate);
          previousWeekDate.setDate(currentDate.getDate() - 7);
          const previousWeekDateStr = previousWeekDate
            .toISOString()
            .split("T")[0];

          const previousWeekStats = allStats.find((stat) => {
            const statDateStr = new Date(stat.date).toISOString().split("T")[0];
            return statDateStr === previousWeekDateStr;
          });

          if (currentWeekStats?.platformStats) {
            log(
              `      Week${week} (${currentDate.toISOString().split("T")[0]})`,
            );

            platforms.forEach((platform) => {
              const currentScore =
                currentWeekStats.platformStats[platform]?.scopeScore || 0;
              const previousScore =
                previousWeekStats?.platformStats?.[platform]?.scopeScore || 0;

              // Calculate weekly gain (only store positive gains, negatives = 0)
              const weeklyGain = currentScore - previousScore;
              const positiveGain = weeklyGain > 0 ? weeklyGain : 0;

              platformPerformance.monthlyPerformance[`week${week}`][platform] =
                positiveGain;

              if (positiveGain > 0) {
                log(
                  `        ${platform}: ${currentScore} - ${previousScore} = +${positiveGain}`,
                );
              }
            });

            // Store the dates used for calculation
            platformPerformance.monthlyPerformance[`week${week}`].presentDate =
              currentWeekStats.date;
            platformPerformance.monthlyPerformance[`week${week}`].pastDate =
              previousWeekStats?.date || null;

            // Calculate total
            platformPerformance.monthlyPerformance[`week${week}`].total =
              platforms.reduce(
                (sum, platform) =>
                  sum +
                  platformPerformance.monthlyPerformance[`week${week}`][
                    platform
                  ],
                0,
              );

            if (
              platformPerformance.monthlyPerformance[`week${week}`].total > 0
            ) {
              log(
                `      🏆 Total: +${
                  platformPerformance.monthlyPerformance[`week${week}`].total
                }`,
              );
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // YEARLY PERFORMANCE: Calculate score gains for each of last 12 months
        // ═══════════════════════════════════════════════════════════════════════
        log(`    📆 Calculating yearly performance (last 12 months)...`);
        const monthNames = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];

        for (let monthsBack = 0; monthsBack < 12; monthsBack++) {
          const currentMonthDate = new Date(today);
          currentMonthDate.setMonth(today.getMonth() - monthsBack);
          currentMonthDate.setHours(0, 0, 0, 0);

          const monthIndex = currentMonthDate.getMonth();
          const monthName = monthNames[monthIndex];
          const year = currentMonthDate.getFullYear();

          // Find most recent stats from this month
          const currentMonthStats = allStats.find((stat) => {
            const statDate = new Date(stat.date);
            return (
              statDate.getMonth() === monthIndex &&
              statDate.getFullYear() === year
            );
          });

          // Find most recent stats from previous month
          const previousMonthDate = new Date(currentMonthDate);
          previousMonthDate.setMonth(currentMonthDate.getMonth() - 1);
          const prevMonthIndex = previousMonthDate.getMonth();
          const prevYear = previousMonthDate.getFullYear();

          const previousMonthStats = allStats.find((stat) => {
            const statDate = new Date(stat.date);
            return (
              statDate.getMonth() === prevMonthIndex &&
              statDate.getFullYear() === prevYear
            );
          });

          if (currentMonthStats?.platformStats) {
            log(`      ${monthName} ${year}`);

            platforms.forEach((platform) => {
              const currentScore =
                currentMonthStats.platformStats[platform]?.scopeScore || 0;
              const previousScore =
                previousMonthStats?.platformStats?.[platform]?.scopeScore || 0;

              // Calculate monthly gain (only store positive gains, negatives = 0)
              const monthlyGain = currentScore - previousScore;
              const positiveGain = monthlyGain > 0 ? monthlyGain : 0;

              platformPerformance.yearlyPerformance[monthName][platform] =
                positiveGain;

              if (positiveGain > 0) {
                log(
                  `        ${platform}: ${currentScore} - ${previousScore} = +${positiveGain}`,
                );
              }
            });

            // Store the dates used for calculation
            platformPerformance.yearlyPerformance[monthName].presentDate =
              currentMonthStats.date;
            platformPerformance.yearlyPerformance[monthName].pastDate =
              previousMonthStats?.date || null;

            // Calculate total
            platformPerformance.yearlyPerformance[monthName].total =
              platforms.reduce(
                (sum, platform) =>
                  sum +
                  platformPerformance.yearlyPerformance[monthName][platform],
                0,
              );

            if (platformPerformance.yearlyPerformance[monthName].total > 0) {
              log(
                `      🏆 Total: +${platformPerformance.yearlyPerformance[monthName].total}`,
              );
            }
          }
        }

        // Save to database
        const performance = new PlatformPerformance({
          userId: user._id,
          email: userEmail,
          dailyPerformance: platformPerformance.dailyPerformance,
          monthlyPerformance: platformPerformance.monthlyPerformance,
          yearlyPerformance: platformPerformance.yearlyPerformance,
        });
        await performance.save();
        log(
          `    ✅ PlatformPerformance regenerated with score change calculations`,
        );
      } else {
        log(
          `    ⚠️  No DailyStats available for PlatformPerformance calculation`,
        );
      }
    } catch (error) {
      logError(`    ❌ Failed to regenerate PlatformPerformance:`, error);
    }

    logSuccess(`  Analytics regeneration completed for user: ${user.name}`);
    return true;
  } catch (error) {
    logError(`Failed to regenerate analytics for user ${user._id}:`, error);
    return false;
  }
}

/**
 * Refresh scopecodestats platform scores and totalScore for all active users.
 * This recalculates each user's cohort score from UserCohort data and updates
 * platformScores.scopecodestats and totalScore on the User model so the
 * leaderboard and rankings use fresh data.
 */
async function refreshAllScopeCodestatsScores() {
  const AcademicYearConfig = require("../models/AcademicYearConfig");
  const academicConfig = await AcademicYearConfig.getConfig();
  const graduatedYears = academicConfig.yearMappings
    .filter((m) => m.academicYear === "Graduated")
    .map((m) => m.graduationYear);

  const users = await User.find({
    userType: { $nin: ["admin", "teacher"] },
    $or: [
      { graduatingYear: { $exists: false } },
      { graduatingYear: { $nin: graduatedYears } },
    ],
  }).select(
    "_id lifetimeScopeScore lifetimeCohortProblemsSolved consistencyIndex platformScores totalScore"
  );

  log(`🔄 Refreshing scopecodestats for ${users.length} users...`);

  let updatedCount = 0;
  const BATCH = 50;

  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (user) => {
        try {
          // Get all active cohort scores for this user
          const userCohorts = await UserCohort.find({
            user: user._id,
            status: { $in: ["enrolled", "completed"] },
          })
            .select("totalScore questionProgress")
            .lean();

          const activeCohortScore = userCohorts.reduce(
            (sum, uc) => sum + (uc.totalScore || 0),
            0
          );

          const activeCohortProblems = userCohorts.reduce((sum, uc) => {
            if (uc.questionProgress && Array.isArray(uc.questionProgress)) {
              return sum + uc.questionProgress.filter((q) => q.solved).length;
            }
            return sum;
          }, 0);

          // Use max of lifetime vs active (scores never decrease)
          const totalCohortScore = Math.max(
            user.lifetimeScopeScore || 0,
            activeCohortScore
          );
          const totalCohortProblemsSolved = Math.max(
            user.lifetimeCohortProblemsSolved || 0,
            activeCohortProblems
          );

          // Update lifetime fields if active exceeds them
          if (activeCohortScore > (user.lifetimeScopeScore || 0)) {
            user.lifetimeScopeScore = activeCohortScore;
          }
          if (activeCohortProblems > (user.lifetimeCohortProblemsSolved || 0)) {
            user.lifetimeCohortProblemsSolved = activeCohortProblems;
          }

          // Calculate scopecodestats score: cohortScore + consistencyIndex * 10
          const consistencyScore = (user.consistencyIndex || 0) * 10;
          const newScopeScore = Math.round(totalCohortScore + consistencyScore);

          // Get existing scopecodestats data and update it
          const currentScopeData =
            user.platformScores?.get?.("scopecodestats") || {};
          const updatedScopeData = {
            ...currentScopeData,
            totalCohortScore,
            totalCohortProblemsolved: totalCohortProblemsSolved,
            score: newScopeScore,
            problemsSolved: totalCohortProblemsSolved,
            lastUpdated: new Date(),
          };

          if (!user.platformScores) {
            user.platformScores = new Map();
          }
          user.platformScores.set("scopecodestats", updatedScopeData);

          // Recalculate totalScore = sum of all platform scores
          let newTotalScore = 0;
          if (user.platformScores instanceof Map) {
            for (const [, data] of user.platformScores) {
              const s =
                typeof data?.score === "number" && !isNaN(data.score)
                  ? data.score
                  : 0;
              newTotalScore += s;
            }
          }
          user.totalScore = newTotalScore;

          await user.save();
          updatedCount++;
        } catch (err) {
          logError(
            `Failed to refresh scopecodestats for user ${user._id}:`,
            err
          );
        }
      })
    );
  }

  log(`✅ Refreshed scopecodestats for ${updatedCount}/${users.length} users`);
}

/**
 * Main function to process all users
 * Calculates ranks first, then processes individual user analytics
 */
async function processDailyMaintenance(
  triggeredBy = null,
  jobType = "auto",
  abortController = null,
) {
  const startTime = new Date();

  // Create initial DailyStatsStatus record
  const statusRecord = new DailyStatsStatus({
    startTime,
    status: "running",
    totalUsersProcessed: 0,
    successfulUsers: 0,
    failedUsers: 0,
    documentCounts: {
      dailyStats: 0,
      activityHeatmaps: 0,
      performanceOverviews: 0,
      platformAnalytics: 0,
      platformPerformances: 0,
      rankTrends: 0,
    },
    rankCalculation: {
      totalRankedUsers: 0,
      departmentsProcessed: 0,
      duration: 0,
    },
    errors: [],
    jobType,
    triggeredBy,
  });

  // Save initial status as 'running'
  await statusRecord.save();

  try {
    log("🔄 Starting daily maintenance job...");
    log(
      `⏰ Started at: ${startTime.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })} IST`,
    );
    log(`📝 Job Type: ${jobType.toUpperCase()}`);
    if (triggeredBy) {
      log(`👤 Triggered By: ${triggeredBy}`);
    }
    log("=".repeat(80));

    // Ensure database connection
    await connectDB();
    log("✅ Database connection established");

    // Step 0: Refresh scopecodestats scores and totalScore for all users
    // This ensures leaderboard rankings use up-to-date cohort scores
    log("🔄 STEP 0: Refreshing scopecodestats scores for all users...");
    const scopeRefreshStart = Date.now();
    try {
      await refreshAllScopeCodestatsScores();
      const scopeRefreshDuration = Math.round((Date.now() - scopeRefreshStart) / 1000);
      log(`✅ Scopecodestats scores refreshed in ${scopeRefreshDuration}s`);
    } catch (scopeErr) {
      logError("⚠️ Scopecodestats refresh failed (continuing with existing scores):", scopeErr);
      statusRecord.errorLog.push({
        phase: "scopecodestats_refresh",
        message: scopeErr.message,
        timestamp: new Date(),
      });
    }
    log("");

    // Step 1: Calculate and update ranks for all users
    log("📊 STEP 1: Calculating user rankings...");
    const rankStartTime = Date.now();
    const rankingResult = await calculateAndUpdateUserRanks();
    const rankDuration = Math.round((Date.now() - rankStartTime) / 1000);

    if (!rankingResult.success) {
      logError("❌ Ranking calculation failed:", rankingResult.error);
      statusRecord.errorLog.push({
        phase: "rank_calculation",
        message: rankingResult.error,
        timestamp: new Date(),
      });
      throw new Error("Ranking calculation failed");
    }

    // Update rank calculation stats
    statusRecord.rankCalculation.totalRankedUsers =
      rankingResult.processedUsers || 0;
    statusRecord.rankCalculation.departmentsProcessed =
      rankingResult.departments?.length || 0;
    statusRecord.rankCalculation.duration = rankDuration;

    log(`✅ Rankings calculated for ${rankingResult.processedUsers} users`);
    log("");

    // Step 2: Process individual user analytics
    log("🔄 STEP 2: Processing individual user analytics...");

    // Get academic year configuration to identify graduated users
    const AcademicYearConfig = require("../models/AcademicYearConfig");
    const academicConfig = await AcademicYearConfig.getConfig();

    const graduatedYears = academicConfig.yearMappings
      .filter((mapping) => mapping.academicYear === "Graduated")
      .map((mapping) => mapping.graduationYear);

    // Get all users with comprehensive data including ranking info
    // Exclude admin, teacher, and graduated users
    const users = await User.find({
      userType: { $nin: ["admin", "teacher"] },
      $or: [
        { graduatingYear: { $exists: false } },
        { graduatingYear: { $nin: graduatedYears } },
      ],
    })
      .select(
        "_id name email department rollNumber graduatingYear totalScore totalProblemsSolved platformScores problemStats contestStats rankingInfo",
      )
      .exec(); // Use exec() instead of lean() to get full mongoose documents

    log(
      `📊 Found ${users.length} active users to process (excluding admins/teachers/graduated)`,
    );
    log(
      `🎯 Processing users with comprehensive data collection and analytics regeneration`,
    );
    log("");

    // Set total users in status record
    statusRecord.totalUsers = users.length;
    await statusRecord.save();

    let successCount = 0;
    let errorCount = 0;
    let detailedResults = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userNumber = i + 1;

      // Check for cancellation signal
      if (abortController && abortController.signal.aborted) {
        log("🛑 Cancellation signal received - stopping daily maintenance job");
        throw new Error("Job cancelled by admin");
      }

      try {
        log(
          `👤 Processing user ${userNumber}/${users.length}: ${
            user.name || "Unknown"
          } (${user.email || "No email"})`,
        );
        log(`   🆔 User ID: ${user._id}`);
        log(`   🏫 Department: ${user.department || "N/A"}`);
        log(`   📝 Roll Number: ${user.rollNumber || "N/A"}`);
        log(`   💯 Current Total Score: ${user.totalScore || 0}`);
        log(`   🧩 Current Total Problems: ${user.totalProblemsSolved || 0}`);
        log(`   🏆 Overall Rank: ${user.rankingInfo?.overallRank || "N/A"}`);
        log(
          `   🏢 Department Rank: ${user.rankingInfo?.departmentRank || "N/A"}`,
        );

        // Step 1: Get current user data with detailed logging
        log(`   🔄 Step 1: Extracting current user data...`);
        let currentData;
        try {
          currentData = await getCurrentUserData(user);
          log(
            `   ✅ Data extraction completed - Score: ${currentData.scopeMetrics.totalScore}, Problems: ${currentData.problemStats.totalProblems}`,
          );
        } catch (error) {
          log(`   ❌ Data extraction failed: ${error.message}`);
          statusRecord.errorLog.push({
            phase: "data_extraction",
            message: error.message,
            userId: user._id,
            timestamp: new Date(),
          });
          throw error;
        }

        // Step 2: Maintain DailyStats
        log(`   🔄 Step 2: Maintaining daily statistics...`);
        const dailyStatsSuccess = await maintainUserDailyStats(user);

        if (dailyStatsSuccess) {
          log(`   ✅ Daily stats maintenance completed`);

          // Step 3: Regenerate analytics
          log(`   🔄 Step 3: Regenerating analytics...`);
          const analyticsSuccess = await regenerateUserAnalytics(user);

          if (analyticsSuccess) {
            successCount++;
            logSuccess(
              `   ✅ User ${user.name} processed successfully - All steps completed`,
            );

            detailedResults.push({
              user: user.name,
              email: user.email,
              status: "success",
              score: currentData.scopeMetrics.totalScore,
              problems: currentData.problemStats.totalProblems,
              rank: user.rankingInfo?.overallRank || "N/A",
              departmentRank: user.rankingInfo?.departmentRank || "N/A",
            });
          } else {
            errorCount++;
            logError(
              `   ❌ Analytics regeneration failed for user ${user.name}`,
            );
            statusRecord.errorLog.push({
              phase: "analytics_regeneration",
              message: "Analytics regeneration failed",
              userId: user._id,
              timestamp: new Date(),
            });
            detailedResults.push({
              user: user.name,
              email: user.email,
              status: "analytics_failed",
            });
          }
        } else {
          errorCount++;
          logError(`   ❌ DailyStats maintenance failed for user ${user.name}`);
          statusRecord.errorLog.push({
            phase: "daily_stats_maintenance",
            message: "DailyStats maintenance failed",
            userId: user._id,
            timestamp: new Date(),
          });
          detailedResults.push({
            user: user.name,
            email: user.email,
            status: "daily_stats_failed",
          });
        }

        log(`   ` + "-".repeat(60));

        // Update status record with current progress
        statusRecord.totalUsersProcessed = userNumber;
        statusRecord.successfulUsers = successCount;
        statusRecord.failedUsers = errorCount;

        // Save status periodically (every 5 users) or at completion
        if (userNumber % 5 === 0 || userNumber === users.length) {
          await statusRecord.save();
        }

        // Small delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        logError(
          `   ❌ Failed to process user ${user.name || "Unknown"}:`,
          error,
        );
        statusRecord.errorLog.push({
          phase: "user_processing",
          message: error.message,
          userId: user._id,
          timestamp: new Date(),
        });
        detailedResults.push({
          user: user.name || "Unknown",
          email: user.email || "No email",
          status: "error",
          error: error.message,
        });

        // Continue processing other users even if one fails
        log(`   ⚠️  Continuing to next user...`);
        log(`   ` + "-".repeat(60));
      }
    }

    // Update status record with user processing stats
    statusRecord.totalUsersProcessed = users.length;
    statusRecord.successfulUsers = successCount;
    statusRecord.failedUsers = errorCount;

    // Count documents from all collections
    log("");
    log("📊 Counting documents in all collections...");
    try {
      const [
        dailyStatsCount,
        heatmapCount,
        perfOverviewCount,
        platformAnalyticsCount,
        platformPerfCount,
        rankTrendCount,
      ] = await Promise.all([
        DailyStats.countDocuments(),
        ActivityHeatmap.countDocuments(),
        PerformanceOverview.countDocuments(),
        PlatformAnalytics.countDocuments(),
        PlatformPerformance.countDocuments(),
        RankTrend.countDocuments(),
      ]);

      statusRecord.documentCounts.dailyStats = dailyStatsCount;
      statusRecord.documentCounts.activityHeatmaps = heatmapCount;
      statusRecord.documentCounts.performanceOverviews = perfOverviewCount;
      statusRecord.documentCounts.platformAnalytics = platformAnalyticsCount;
      statusRecord.documentCounts.platformPerformances = platformPerfCount;
      statusRecord.documentCounts.rankTrends = rankTrendCount;

      log(`   DailyStats: ${dailyStatsCount}`);
      log(`   ActivityHeatmaps: ${heatmapCount}`);
      log(`   PerformanceOverviews: ${perfOverviewCount}`);
      log(`   PlatformAnalytics: ${platformAnalyticsCount}`);
      log(`   PlatformPerformances: ${platformPerfCount}`);
      log(`   RankTrends: ${rankTrendCount}`);
    } catch (error) {
      logWarning("⚠️  Failed to count documents:", error.message);
      statusRecord.errorLog.push({
        phase: "document_counting",
        message: error.message,
        timestamp: new Date(),
      });
    }

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    // Update status record completion
    statusRecord.endTime = endTime;
    statusRecord.duration = duration;

    // Determine final status
    if (errorCount === 0) {
      statusRecord.status = "success";
    } else if (successCount > 0) {
      statusRecord.status = "partial";
    } else {
      statusRecord.status = "failed";
    }

    // Generate summary
    const successRate =
      users.length > 0 ? ((successCount / users.length) * 100).toFixed(1) : 0;
    statusRecord.summary = `Processed ${users.length} users: ${successCount} successful, ${errorCount} failed (${successRate}% success rate). Ranked ${rankingResult.processedUsers} users in ${rankDuration}s.`;

    // Save status record
    try {
      await statusRecord.save();
      log("✅ Execution status saved to database");

      // Cleanup old records (keep only last 3)
      const DailyStatsStatus = require("../models/DailyStatsStatus");
      await DailyStatsStatus.cleanupOldRecords();
    } catch (error) {
      logError("❌ Failed to save execution status:", error.message);
    }

    // Final comprehensive summary
    log("");
    log("🎉 Daily Maintenance Job Completed!");
    log("=".repeat(80));
    log(
      `📊 RANKINGS: ${rankingResult.processedUsers} users ranked successfully`,
    );
    logSuccess(`📈 ANALYTICS: Successfully processed ${successCount} users`);
    if (errorCount > 0) {
      logError(`❌ ANALYTICS: Failed to process ${errorCount} users`);
    }
    log(`📊 Total users in database: ${users.length}`);
    log(`⏱️  Total execution time: ${duration} seconds`);
    log(
      `⏰ Completed at: ${endTime.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })} IST`,
    );

    // Log success rate
    log(`📊 Success rate: ${successRate}% (${successCount}/${users.length})`);

    // Log top performers if available
    const topUsers = detailedResults
      .filter((r) => r.status === "success" && r.rank !== "N/A")
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5);

    if (topUsers.length > 0) {
      log("");
      log("🏆 Top 5 performers after ranking:");
      topUsers.forEach((user, index) => {
        log(
          `   #${user.rank}: ${user.user} - ${user.score} points (${user.problems} problems) [Dept Rank: ${user.departmentRank}]`,
        );
      });
    }

    // Log summary of successful users
    const successfulUsers = detailedResults.filter(
      (r) => r.status === "success",
    );
    if (successfulUsers.length > 0) {
      log("");
      log("📊 Successfully Processed Users Summary:");
      successfulUsers.forEach((result, index) => {
        const rankInfo =
          result.rank !== "N/A" ? ` - Rank: #${result.rank}` : "";
        log(
          `   ${index + 1}. ${result.user} (${result.email}) - Score: ${
            result.score
          }, Problems: ${result.problems}${rankInfo}`,
        );
      });
    }

    // Log failed users if any
    const failedUsers = detailedResults.filter((r) => r.status !== "success");
    if (failedUsers.length > 0) {
      log("");
      logWarning("⚠️  Failed Users Summary:");
      failedUsers.forEach((result, index) => {
        log(
          `   ${index + 1}. ${result.user} (${result.email}) - Status: ${
            result.status
          }${result.error ? ` - Error: ${result.error}` : ""}`,
        );
      });
    }

    log("");
    log("🔄 Daily maintenance process completed successfully");

    return {
      success: true,
      processedUsers: successCount,
      errorCount: errorCount,
      totalUsers: users.length,
      rankingUsers: rankingResult.processedUsers,
      duration: duration,
      successRate: successRate,
      detailedResults: detailedResults,
      statusRecordId: statusRecord._id,
    };
  } catch (error) {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    // Update status record for failure
    statusRecord.endTime = endTime;
    statusRecord.duration = duration;
    statusRecord.status = "failed";
    statusRecord.summary = `Job failed: ${error.message}`;
    statusRecord.errorLog.push({
      phase: "critical_failure",
      message: error.message,
      timestamp: new Date(),
    });

    try {
      await statusRecord.save();

      // Cleanup old records (keep only last 3)
      const DailyStatsStatus = require("../models/DailyStatsStatus");
      await DailyStatsStatus.cleanupOldRecords();
    } catch (saveError) {
      logError("❌ Failed to save failure status:", saveError.message);
    }

    logError("💥 Daily maintenance job failed:", error);
    log(`⏱️  Failed after ${duration} seconds`);
    log(
      `⏰ Failed at: ${endTime.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })} IST`,
    );

    return {
      success: false,
      error: error.message,
      duration: duration,
      statusRecordId: statusRecord._id,
    };
  }
}

/**
 * ✅ CRON JOBS ENABLED ✅
 *
 * Two cron jobs are configured to run daily:
 *
 * 1. MIDNIGHT CRON (12:00 AM IST):
 *    - Snapshots current User data into DailyStats documents
 *    - Calculates and updates user rankings (overall + department)
 *    - Calculates consistency index and seven-day scores
 *    - Regenerates analytics (PerformanceOverview, Heatmap, etc.)
 *
 * 2. MORNING CRON (5:00 AM IST):
 *    - Same as midnight job (backup/safety net run)
 *    - Ensures data is captured if midnight job failed or had issues
 *
 * NOTE: Neither cron job fetches data from external platforms (LeetCode, etc.)
 * Profile synchronization with external APIs is a separate process triggered
 * manually by admins via POST /api/admin/sync-profiles.
 *
 * Timezone: Asia/Kolkata (IST - UTC+5:30)
 *
 * MANUAL EXECUTION:
 * - API: POST /api/admin/trigger-cron (requires admin authentication)
 * - Script: node backend/scripts/daily-maintenance-cron.js
 * - Function: await processDailyMaintenance() (from this file)
 */

// Daily Maintenance cron job (5:00 AM IST) - Stats snapshot & ranking
const dailyMaintenanceCronJob = cron.schedule(
  "0 5 * * *", // 5:00 AM IST
  async () => {
    log("🔔 Daily maintenance cron job triggered at 5:00 AM IST - Stats & Rankings");
    await processDailyMaintenance();
  },
  {
    scheduled: true, // ✅ ENABLED
    timezone: "Asia/Kolkata",
  },
);

// Start the cron jobs
function startDailyMaintenanceCron() {
  try {
    dailyMaintenanceCronJob.start();

    log("🚀 Daily maintenance cron job started successfully");
    log(
      "⏰ Daily maintenance (5:00 AM IST): " +
        (dailyMaintenanceCronJob.running ? "RUNNING ✅" : "NOT RUNNING ❌"),
    );

    return true;
  } catch (error) {
    logError("❌ Failed to start cron job:", error);
    return false;
  }
}

// Stop the cron jobs
function stopDailyMaintenanceCron() {
  if (dailyMaintenanceCronJob.running) {
    dailyMaintenanceCronJob.stop();
    log("🛑 Daily maintenance cron job stopped");
    return true;
  }

  logWarning("⚠️  Cron job was not running");
  return false;
}

// Manual trigger function for testing
async function runManualMaintenance() {
  try {
    log("🧪 Running manual maintenance for testing...");

    // Ensure environment variables are loaded
    require("dotenv").config();

    // Connect to database first
    await connectDB();

    await processDailyMaintenance();

    // Close the database connection
    await mongoose.connection.close();
    log("🔌 Database connection closed");
  } catch (error) {
    logError("Failed to run manual maintenance:", error);
  } finally {
    process.exit(0);
  }
}

// Export functions
module.exports = {
  processDailyMaintenance,
  maintainUserDailyStats,
  regenerateUserAnalytics,
  getCurrentUserData,
  calculateAndUpdateUserRanks,
  refreshAllScopeCodestatsScores,
  runManualMaintenance,
  startDailyMaintenanceCron,
  stopDailyMaintenanceCron,
  dailyMaintenanceCronJob, // Export for status checking
};

// If this script is run directly, execute manual maintenance
if (require.main === module) {
  runManualMaintenance();
} else {
  // ✅ CRON AUTO-START ENABLED
  // Auto-start the cron job when module is imported
  startDailyMaintenanceCron();
  log("✅ Daily maintenance cron job auto-started on module import (5:00 AM IST)");
  log('🧪 Run "node scripts/daily-maintenance-cron.js" for manual testing');
}
