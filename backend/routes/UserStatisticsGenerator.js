const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const DailyStats = require("../models/DailyStats");
const PerformanceOverview = require("../models/PerformanceOverview");
const DailyActivityHeatmap = require("../models/DailyActivityHeatmap");
const PlatformAnalytics = require("../models/PlatformAnalytics");
const RankTrend = require("../models/RankTrend");
const PlatformPerformance = require("../models/PlatformPerformance");
const User = require("../models/User");

// 1. Generate Performance Overview from DailyStats
router.post(
  "/generate-performance-overview/:userId",
  auth,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Get user details
      const user = await User.findById(userId).select("email");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get latest DailyStats
      const latestStats = await DailyStats.findOne({ userId })
        .sort({ date: -1 })
        .select("scopeMetrics problemStats activityFlags date");

      if (!latestStats) {
        return res.status(404).json({ error: "No daily stats found for user" });
      }

      // Get stats from 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldStats = await DailyStats.findOne({
        userId,
        date: {
          $gte: thirtyDaysAgo,
          $lt: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000),
        },
      }).sort({ date: 1 });

      // Count total active days from heatmap (cells with score > 0)
      const DailyActivityHeatmap = require("../models/DailyActivityHeatmap");
      const heatmapData =
        await DailyActivityHeatmap.getFormattedHeatmap(userId);
      const totalActiveDays = heatmapData.activeDays;

      // Prepare current metrics
      const currentScore = latestStats.scopeMetrics.totalScore || 0;
      const currentProblems = latestStats.problemStats.totalProblems || 0;

      // Get current rank from User model (NOT from DailyStats which has stale rank data)
      const userWithRank = await User.findById(userId)
        .select("rankingInfo")
        .exec();
      const currentRank = userWithRank?.rankingInfo?.overallRank;

      // Calculate changes from 30 days ago
      const oldScore = oldStats ? oldStats.scopeMetrics.totalScore || 0 : 0;
      // NOTE: oldRank should ideally come from historical User model data, not DailyStats
      const oldRank = 0; // TODO: Implement proper historical rank tracking
      const oldProblems = oldStats
        ? oldStats.problemStats.totalProblems || 0
        : 0;

      const scoreChangeLastMonth = currentScore - oldScore;
      const rankChangeLastMonth = oldRank - currentRank; // Negative means rank improved
      const problemsChangeLastMonth = currentProblems - oldProblems;

      // Create or update PerformanceOverview document
      const performanceOverview = await PerformanceOverview.updatePerformance(
        userId,
        user.email,
        {
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
        },
      );

      res.json({
        success: true,
        message: "Performance overview generated successfully",
        data: performanceOverview,
      });
    } catch (error) {
      console.error("Error generating performance overview:", error);
      res
        .status(500)
        .json({ error: "Failed to generate performance overview" });
    }
  },
);

// 2. Generate Daily Activity Heatmap from DailyStats
router.post("/generate-heatmap/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const year = parseInt(req.body.year) || new Date().getFullYear();

    // Get user details
    const user = await User.findById(userId).select("email");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      `UserStatisticsGenerator: Generating heatmap for user ${user.email} for year ${year}`,
    );

    // Use the corrected model method that calculates daily score changes
    const heatmap = await DailyActivityHeatmap.createFromDailyStats(
      userId,
      user.email,
      year,
    );

    // Get formatted data to return
    const formattedData = await DailyActivityHeatmap.getFormattedHeatmap(
      userId,
      year,
    );

    res.json({
      success: true,
      message:
        "Daily activity heatmap generated successfully with score changes",
      data: formattedData,
    });
  } catch (error) {
    console.error("Error generating heatmap:", error);
    res.status(500).json({ error: "Failed to generate heatmap" });
  }
});

// 3. Generate Platform Analytics from DailyStats
router.post("/generate-platform-analytics/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details
    const user = await User.findById(userId).select("email");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all DailyStats for the user
    const allStats = await DailyStats.find({ userId })
      .sort({ date: -1 })
      .select("platformStats date contestStats");

    if (!allStats || allStats.length === 0) {
      return res.status(404).json({ error: "No daily stats found for user" });
    }

    // Get latest stats for current values
    const latestStats = allStats[0];

    // Initialize platform analytics with CORRECT field names matching the schema
    const platformAnalytics = {
      leetcode: {
        problemsSolved: 0,
        score: 0,
        totalContests: 0,
        rating: 0,
        weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
      },
      codechef: {
        problemsSolved: 0,
        score: 0,
        totalContests: 0,
        rating: 0,
        weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
      },
      codeforces: {
        problemsSolved: 0,
        score: 0,
        totalContests: 0,
        rating: 0,
        weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
      },
      hackerrank: {
        problemsSolved: 0,
        score: 0,
        totalContests: 0,
        rating: 0,
      },
      github: {
        commits: 0,
        repos: 0,
        score: 0,
        contributions: {
          thisMonth: 0,
          thisYear: 0,
          total: 0,
        },
        languages: [],
      },
    };

    // Populate current values from latest stats
    if (latestStats && latestStats.platformStats) {
      // LeetCode
      if (latestStats.platformStats.leetcode) {
        const lc = latestStats.platformStats.leetcode;
        platformAnalytics.leetcode.problemsSolved = lc.totalSolved || 0;
        platformAnalytics.leetcode.score = lc.scopeScore || 0;
        platformAnalytics.leetcode.rating = lc.rating || 0;
        platformAnalytics.leetcode.totalContests = lc.contestsAttended || 0;
      }

      // CodeChef
      if (latestStats.platformStats.codechef) {
        const cc = latestStats.platformStats.codechef;
        platformAnalytics.codechef.problemsSolved = cc.totalSolved || 0;
        platformAnalytics.codechef.score = cc.scopeScore || 0;
        platformAnalytics.codechef.rating = cc.rating || 0;
        platformAnalytics.codechef.totalContests = cc.contestsRated || 0;
      }

      // CodeForces
      if (latestStats.platformStats.codeforces) {
        const cf = latestStats.platformStats.codeforces;
        platformAnalytics.codeforces.problemsSolved = cf.totalSolved || 0;
        platformAnalytics.codeforces.score = cf.scopeScore || 0;
        platformAnalytics.codeforces.rating = cf.rating || 0;
        platformAnalytics.codeforces.totalContests = cf.contestsRated || 0;
      }

      // HackerRank
      if (latestStats.platformStats.hackerrank) {
        const hr = latestStats.platformStats.hackerrank;
        platformAnalytics.hackerrank.problemsSolved = hr.totalSolved || 0;
        platformAnalytics.hackerrank.score = hr.scopeScore || 0;
        platformAnalytics.hackerrank.rating = hr.hackos || 0;
        platformAnalytics.hackerrank.totalContests = hr.contests || 0;
      }

      // GitHub
      if (latestStats.platformStats.github) {
        const gh = latestStats.platformStats.github;
        platformAnalytics.github.commits = gh.totalCommits || 0;
        platformAnalytics.github.repos = gh.publicRepos || 0;
        platformAnalytics.github.score = gh.scopeScore || 0;
        platformAnalytics.github.contributions = {
          thisMonth: Math.floor((gh.yearlyContributions || 0) / 12),
          thisYear: gh.yearlyContributions || 0,
          total: gh.totalCommits || 0,
        };
        platformAnalytics.github.languages = [
          { name: "JavaScript", percentage: 40 },
          { name: "Python", percentage: 35 },
          { name: "Java", percentage: 25 },
        ]; // Default languages with percentages
      }
    }

    // CRITICAL: Calculate weekly rating variations using SPECIFIC DAYS (not averages)
    // CRITICAL FIX: Store ACTUAL ratings for each week, not differences
    // Week1 = 21 days back, Week2 = 14 days back, Week3 = 7 days back, Week4 = current (0 days back)
    const recentStats = allStats.slice(0, 28); // Last 4 weeks
    ["leetcode", "codechef", "codeforces"].forEach((platform) => {
      const currentRating = platformAnalytics[platform].rating;

      for (let week = 1; week <= 4; week++) {
        // Calculate which day to look at: week1=21 days back, week2=14, week3=7, week4=0 (today)
        const daysBack = (4 - week) * 7;

        if (week === 4) {
          // Week4: Store current rating (today's rating)
          platformAnalytics[platform].weeklyRatings[`week${week}`] =
            currentRating;
        } else if (daysBack < recentStats.length) {
          // Week1-3: Store ACTUAL historical rating from that specific day
          const targetDayStats = recentStats[daysBack];

          if (
            targetDayStats &&
            targetDayStats.platformStats?.[platform]?.rating
          ) {
            // Store the actual rating from that day, not the difference
            platformAnalytics[platform].weeklyRatings[`week${week}`] =
              targetDayStats.platformStats[platform].rating;
          } else {
            // No data available for that day, use 0
            platformAnalytics[platform].weeklyRatings[`week${week}`] = 0;
          }
        } else {
          // Not enough historical data (user has <21 days of data)
          platformAnalytics[platform].weeklyRatings[`week${week}`] = 0;
        }
      }
    });

    // Create or update PlatformAnalytics document
    let analytics = await PlatformAnalytics.findOne({ userId });

    if (analytics) {
      // Update existing document with new data
      Object.keys(platformAnalytics).forEach((platform) => {
        if (analytics[platform] && typeof analytics[platform] === "object") {
          Object.assign(analytics[platform], platformAnalytics[platform]);
        } else {
          analytics[platform] = platformAnalytics[platform];
        }
      });
      analytics.calculateTotals(); // Recalculate totals after update
      analytics.lastUpdated = new Date();
      await analytics.save();
    } else {
      // Create new document
      const analyticsData = {
        userId,
        email: user.email,
        ...platformAnalytics,
        lastUpdated: new Date(),
      };

      analytics = new PlatformAnalytics(analyticsData);
      analytics.calculateTotals(); // Calculate totals for new document
      await analytics.save();
    }

    res.json({
      success: true,
      message: "Platform analytics generated successfully",
      data: analytics,
    });
  } catch (error) {
    console.error("Error generating platform analytics:", error);
    res.status(500).json({ error: "Failed to generate platform analytics" });
  }
});

// 4. Generate Rank Trend from DailyStats
router.post("/generate-rank-trend/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details
    const user = await User.findById(userId).select("email");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get DailyStats for rank trend analysis
    const rankStats = await DailyStats.find({ userId })
      .sort({ date: -1 })
      .select("scopeMetrics date")
      .limit(365); // Get up to 1 year of data

    if (!rankStats || rankStats.length === 0) {
      return res.status(404).json({ error: "No daily stats found for user" });
    }

    // Initialize rank trend data
    const rankTrend = {
      weekly: {
        sunday: null,
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
      },
      monthly: {
        week1: null,
        week2: null,
        week3: null,
        week4: null,
      },
      yearly: {
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
    };

    // Correctly map daily stats to days of the week based on actual dates
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    rankStats.forEach((stat) => {
      const dayOfWeek = stat.date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = dayNames[dayOfWeek];
      const rank = stat.scopeMetrics?.overallRank;

      // Only update if we don't have a rank for this day yet (use most recent data)
      if (rank && rank > 0 && rankTrend.weekly[dayName] === null) {
        rankTrend.weekly[dayName] = rank;
      }
    });

    // Calculate weekly averages for monthly data using SPECIFIC DATE-BASED calculation (like test-endpoints-directly.js)
    const today = new Date();

    for (let week = 1; week <= 4; week++) {
      const weeksBack = 4 - week; // week1 = 3 weeks ago, week4 = current week
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - weeksBack * 7);

      // Find closest stat to target date
      const weekStats = rankStats.find((stat) => {
        const statDate = new Date(stat.date);
        const dayDifference =
          Math.abs(statDate - targetDate) / (1000 * 60 * 60 * 24);
        return dayDifference <= 3.5; // Within 3.5 days
      });

      if (weekStats && weekStats.scopeMetrics) {
        rankTrend.monthly[`week${week}`] =
          weekStats.scopeMetrics.overallRank || null;
      }
    }

    // Calculate monthly data for yearly trend using LATEST STATS from each month (like test-endpoints-directly.js)
    const currentMonth = new Date().getMonth();
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

    // Calculate the last 12 months ending with current month (chronological order)
    const chronologicalRankMonths = [];

    // Start from 11 months ago and go to current month
    for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - monthsBack);

      const monthIndex = targetDate.getMonth();
      const monthName = monthNames[monthIndex];
      const year = targetDate.getFullYear();

      chronologicalRankMonths.push({ monthName, monthIndex, year });

      // Get all stats from that month and year
      const monthStats = rankStats.filter((stat) => {
        const statDate = new Date(stat.date);
        return (
          statDate.getMonth() === monthIndex && statDate.getFullYear() === year
        );
      });

      if (monthStats.length > 0) {
        // Use the latest (most recent) stats from that month
        const latestMonthStats = monthStats[0];

        if (latestMonthStats && latestMonthStats.scopeMetrics) {
          rankTrend.yearly[monthName] =
            latestMonthStats.scopeMetrics.overallRank || null;
        }
      }
    }

    // Create or update RankTrend document
    let trend = await RankTrend.findOne({ userId });

    if (trend) {
      // Update existing
      Object.assign(trend.weeklyRanks, rankTrend.weekly);
      Object.assign(trend.monthlyRanks, rankTrend.monthly);
      Object.assign(trend.yearlyRanks, rankTrend.yearly);
      trend.lastUpdated = new Date();
      await trend.save();
    } else {
      // Create new
      trend = new RankTrend({
        userId,
        email: user.email,
        weeklyRanks: rankTrend.weekly,
        monthlyRanks: rankTrend.monthly,
        yearlyRanks: rankTrend.yearly,
      });
      await trend.save();
    }

    res.json({
      success: true,
      message: "Rank trend generated successfully",
      data: trend,
    });
  } catch (error) {
    console.error("Error generating rank trend:", error);
    res.status(500).json({ error: "Failed to generate rank trend" });
  }
});

// 5. Generate Platform Performance from DailyStats
router.post(
  "/generate-platform-performance/:userId",
  auth,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Get user details
      const user = await User.findById(userId).select("email");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get DailyStats for platform performance analysis
      const platformStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("platformStats date")
        .limit(365); // Get up to 1 year of data

      if (!platformStats || platformStats.length === 0) {
        return res.status(404).json({ error: "No daily stats found for user" });
      }

      // Initialize platform performance data
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

      // Populate daily performance (last 7 days) - use actual platform scores for each day of the week
      const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];

      // Initialize daily performance with current scores (most recent data)
      const latestStats = platformStats[0]; // Most recent data
      if (latestStats && latestStats.platformStats) {
        // Fill all days with current scores first as default
        days.forEach((dayName) => {
          Object.keys(platformPerformance.dailyPerformance[dayName]).forEach(
            (platform) => {
              if (platform !== "total" && latestStats.platformStats[platform]) {
                platformPerformance.dailyPerformance[dayName][platform] =
                  latestStats.platformStats[platform].scopeScore || 0;
              }
            },
          );

          // Calculate total for each day
          platformPerformance.dailyPerformance[dayName].total = Object.keys(
            platformPerformance.dailyPerformance[dayName],
          )
            .filter((k) => k !== "total")
            .reduce(
              (sum, platform) =>
                sum + platformPerformance.dailyPerformance[dayName][platform],
              0,
            );
        });
      }

      // Override with actual day-specific data if available
      platformStats.forEach((dayStats) => {
        const dayName = days[new Date(dayStats.date).getDay()];

        if (dayStats && dayStats.platformStats) {
          // Only update if we haven't already updated this day with more recent data
          const dayData = {
            leetcode: 0,
            codechef: 0,
            codeforces: 0,
            hackerrank: 0,
            github: 0,
          };
          let hasValidData = false;

          Object.keys(dayData).forEach((platform) => {
            if (
              dayStats.platformStats[platform] &&
              dayStats.platformStats[platform].scopeScore
            ) {
              dayData[platform] = dayStats.platformStats[platform].scopeScore;
              hasValidData = true;
            }
          });

          // Only update if we found valid data and this is more recent than what we have
          if (hasValidData) {
            Object.keys(dayData).forEach((platform) => {
              if (dayData[platform] > 0) {
                platformPerformance.dailyPerformance[dayName][platform] =
                  dayData[platform];
              }
            });

            // Recalculate total
            platformPerformance.dailyPerformance[dayName].total = Object.keys(
              platformPerformance.dailyPerformance[dayName],
            )
              .filter((k) => k !== "total")
              .reduce(
                (sum, platform) =>
                  sum + platformPerformance.dailyPerformance[dayName][platform],
                0,
              );
          }
        }
      });

      // Populate weekly performance (last 4 weeks) - week4=current, week3=1 week back, etc.
      // Calculate actual dates for each week
      const today = new Date();

      for (let week = 1; week <= 4; week++) {
        const weeksBack = 4 - week; // week4 = 0 weeks back (current), week3 = 1 week back, week2 = 2 weeks back, week1 = 3 weeks back
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - weeksBack * 7);

        // Find the stats closest to this target date
        const weekStats = platformStats.find((stat) => {
          const statDate = new Date(stat.date);
          const dayDifference =
            Math.abs(statDate - targetDate) / (1000 * 60 * 60 * 24);
          return dayDifference <= 3.5; // Within 3.5 days of target date
        });

        if (weekStats && weekStats.platformStats) {
          const weekData = {
            leetcode: 0,
            codechef: 0,
            codeforces: 0,
            hackerrank: 0,
            github: 0,
          };

          Object.keys(weekData).forEach((platform) => {
            if (weekStats.platformStats[platform]) {
              // Use the actual platform score from that week
              weekData[platform] =
                weekStats.platformStats[platform].scopeScore || 0;
            }
          });

          platformPerformance.monthlyPerformance[`week${week}`] = {
            ...weekData,
            total: Object.values(weekData).reduce(
              (sum, score) => sum + score,
              0,
            ),
          };
        }
      }

      // Populate yearly performance (last 12 months in chronological order) - 11 months back to current month
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

      // Calculate scores for each month in chronological order (11 months back to current)
      for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
        const targetDate = new Date(today);
        targetDate.setMonth(today.getMonth() - monthsBack);

        const monthIndex = targetDate.getMonth();
        const monthName = monthNames[monthIndex];

        // Find stats from that month (look for data within the month)
        const monthStats = platformStats.filter((stat) => {
          const statDate = new Date(stat.date);
          return (
            statDate.getMonth() === monthIndex &&
            statDate.getFullYear() === targetDate.getFullYear()
          );
        });

        if (monthStats.length > 0) {
          // Use the most recent data from that month
          const latestMonthStats = monthStats[0]; // Already sorted by date descending

          if (latestMonthStats && latestMonthStats.platformStats) {
            const monthData = {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,
              hackerrank: 0,
              github: 0,
            };

            Object.keys(monthData).forEach((platform) => {
              if (latestMonthStats.platformStats[platform]) {
                // Use the actual platform score from that month
                monthData[platform] =
                  latestMonthStats.platformStats[platform].scopeScore || 0;
              }
            });

            platformPerformance.yearlyPerformance[monthName] = {
              ...monthData,
              total: Object.values(monthData).reduce(
                (sum, score) => sum + score,
                0,
              ),
            };
          }
        }
      }

      // Create or update PlatformPerformance document
      let performance = await PlatformPerformance.findOne({ userId });

      if (performance) {
        // Update existing
        Object.assign(
          performance.dailyPerformance,
          platformPerformance.dailyPerformance,
        );
        Object.assign(
          performance.monthlyPerformance,
          platformPerformance.monthlyPerformance,
        );
        Object.assign(
          performance.yearlyPerformance,
          platformPerformance.yearlyPerformance,
        );
        performance.lastUpdated = new Date();
        await performance.save();
      } else {
        // Create new
        performance = new PlatformPerformance({
          userId,
          email: user.email,
          dailyPerformance: platformPerformance.dailyPerformance,
          monthlyPerformance: platformPerformance.monthlyPerformance,
          yearlyPerformance: platformPerformance.yearlyPerformance,
        });
        await performance.save();
      }

      res.json({
        success: true,
        message: "Platform performance generated successfully",
        data: performance,
      });
    } catch (error) {
      console.error("Error generating platform performance:", error);
      res
        .status(500)
        .json({ error: "Failed to generate platform performance" });
    }
  },
);

// 6. Generate ALL Statistics for a User (Convenience Route)
router.post("/generate-all-stats/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const results = {
      performanceOverview: null,
      heatmap: null,
      platformAnalytics: null,
      rankTrend: null,
      platformPerformance: null,
      errors: [],
    };

    // Generate Performance Overview
    try {
      const perfResponse = await fetch(
        `${req.protocol}://${req.get("host")}/api/user-stats/generate-performance-overview/${userId}`,
        {
          method: "POST",
          headers: { Authorization: req.headers.authorization },
        },
      );
      if (perfResponse.ok) {
        results.performanceOverview = await perfResponse.json();
      }
    } catch (error) {
      results.errors.push("Performance Overview generation failed");
    }

    // Generate Heatmap
    try {
      const heatmapResponse = await fetch(
        `${req.protocol}://${req.get("host")}/api/user-stats/generate-heatmap/${userId}`,
        {
          method: "POST",
          headers: { Authorization: req.headers.authorization },
        },
      );
      if (heatmapResponse.ok) {
        results.heatmap = await heatmapResponse.json();
      }
    } catch (error) {
      results.errors.push("Heatmap generation failed");
    }

    // Generate Platform Analytics
    try {
      const analyticsResponse = await fetch(
        `${req.protocol}://${req.get("host")}/api/user-stats/generate-platform-analytics/${userId}`,
        {
          method: "POST",
          headers: { Authorization: req.headers.authorization },
        },
      );
      if (analyticsResponse.ok) {
        results.platformAnalytics = await analyticsResponse.json();
      }
    } catch (error) {
      results.errors.push("Platform Analytics generation failed");
    }

    // Generate Rank Trend
    try {
      const rankResponse = await fetch(
        `${req.protocol}://${req.get("host")}/api/user-stats/generate-rank-trend/${userId}`,
        {
          method: "POST",
          headers: { Authorization: req.headers.authorization },
        },
      );
      if (rankResponse.ok) {
        results.rankTrend = await rankResponse.json();
      }
    } catch (error) {
      results.errors.push("Rank Trend generation failed");
    }

    // Generate Platform Performance
    try {
      const platformResponse = await fetch(
        `${req.protocol}://${req.get("host")}/api/user-stats/generate-platform-performance/${userId}`,
        {
          method: "POST",
          headers: { Authorization: req.headers.authorization },
        },
      );
      if (platformResponse.ok) {
        results.platformPerformance = await platformResponse.json();
      }
    } catch (error) {
      results.errors.push("Platform Performance generation failed");
    }

    res.json({
      success: true,
      message: "All statistics generation completed",
      results,
      totalErrors: results.errors.length,
    });
  } catch (error) {
    console.error("Error generating all statistics:", error);
    res.status(500).json({ error: "Failed to generate all statistics" });
  }
});

// GET endpoints for Dashboard.jsx compatibility

// GET Performance Overview (matches Dashboard.jsx fetchDashboardStats)
router.get("/performance-overview/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if PerformanceOverview exists, if not generate it
    let performanceOverview = await PerformanceOverview.findOne({ userId });

    if (!performanceOverview) {
      // Generate performance overview from DailyStats
      const user = await User.findById(userId).select("email");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const latestStats = await DailyStats.findOne({ userId })
        .sort({ date: -1 })
        .select("scopeMetrics problemStats activityFlags date");

      if (!latestStats) {
        return res.json({
          currentScore: 0,
          currentRank: 0,
          currentProblems: 0,
          totalActiveDays: 0,
          scoreChangeLastMonth: 0,
          rankChangeLastMonth: 0,
          problemsChangeLastMonth: 0,
          lastUpdated: null,
        });
      }

      // Calculate performance overview
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldStats = await DailyStats.findOne({
        userId,
        date: {
          $gte: thirtyDaysAgo,
          $lt: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000),
        },
      }).sort({ date: 1 });

      // Count total active days from heatmap (cells with score > 0)
      const DailyActivityHeatmap = require("../models/DailyActivityHeatmap");
      const heatmapData =
        await DailyActivityHeatmap.getFormattedHeatmap(userId);
      const totalActiveDays = heatmapData.activeDays;

      const currentScore = latestStats.scopeMetrics.totalScore || 0;
      const currentProblems = latestStats.problemStats.totalProblems || 0;

      // Get current rank from User model (NOT from DailyStats which has stale rank data)
      const userWithRank = await User.findById(userId)
        .select("rankingInfo")
        .exec();
      const currentRank = userWithRank?.rankingInfo?.overallRank;

      const oldScore = oldStats ? oldStats.scopeMetrics.totalScore || 0 : 0;
      const oldRank = oldStats ? oldStats.scopeMetrics.overallRank || 0 : 0;
      const oldProblems = oldStats
        ? oldStats.problemStats.totalProblems || 0
        : 0;

      performanceOverview = await PerformanceOverview.updatePerformance(
        userId,
        user.email,
        {
          currentScore,
          currentRank,
          currentProblems,
          totalActiveDays,
          lastMonthScore: oldScore,
          lastMonthRank: oldRank,
          lastMonthProblems: oldProblems,
          scoreChangeLastMonth: currentScore - oldScore,
          rankChangeLastMonth: oldRank - currentRank,
          problemsChangeLastMonth: currentProblems - oldProblems,
        },
      );
    }

    res.json(performanceOverview);
  } catch (error) {
    console.error("Error fetching performance overview:", error);
    res.status(500).json({ error: "Failed to fetch performance overview" });
  }
});

// GET Heatmap Data (matches Dashboard.jsx fetchAnalyticsData)
router.get("/heatmap/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Check if heatmap exists, if not generate it
    let heatmapData = await DailyActivityHeatmap.getFormattedHeatmap(
      userId,
      year,
    );

    if (!heatmapData || Object.keys(heatmapData.cells || {}).length === 0) {
      // Generate heatmap from DailyStats
      const user = await User.findById(userId).select("email");
      if (user) {
        await DailyActivityHeatmap.createFromDailyStats(
          userId,
          user.email,
          year,
        );
        heatmapData = await DailyActivityHeatmap.getFormattedHeatmap(
          userId,
          year,
        );
      }
    }

    res.json(heatmapData);
  } catch (error) {
    console.error("Error fetching heatmap:", error);
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
});

// GET Platform Analytics (matches Dashboard.jsx fetchAnalyticsData)
router.get("/platform-analytics/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if platform analytics exists, if not generate it
    let analytics = await PlatformAnalytics.findOne({ userId });

    if (!analytics) {
      // Generate platform analytics from DailyStats
      const user = await User.findById(userId).select("email");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const allStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("platformStats date contestStats");

      if (allStats && allStats.length > 0) {
        const latestStats = allStats[0];

        const platformAnalytics = {
          leetcode: {
            problemsSolved:
              latestStats.platformStats?.leetcode?.totalSolved || 0,
            score: latestStats.platformStats?.leetcode?.scopeScore || 0,
            totalContests:
              latestStats.platformStats?.leetcode?.contestsAttended || 0,
            rating: latestStats.platformStats?.leetcode?.rating || 0,
            weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
            lastContest: { name: "", rank: 0, date: null },
          },
          codechef: {
            problemsSolved:
              latestStats.platformStats?.codechef?.totalSolved || 0,
            score: latestStats.platformStats?.codechef?.scopeScore || 0,
            totalContests:
              latestStats.platformStats?.codechef?.contestsRated || 0,
            rating: latestStats.platformStats?.codechef?.rating || 0,
            weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
            lastContest: { name: "", rank: 0, date: null },
          },
          codeforces: {
            problemsSolved:
              latestStats.platformStats?.codeforces?.totalSolved || 0,
            score: latestStats.platformStats?.codeforces?.scopeScore || 0,
            totalContests:
              latestStats.platformStats?.codeforces?.contestsRated || 0,
            rating: latestStats.platformStats?.codeforces?.rating || 0,
            weeklyRatings: { week1: 0, week2: 0, week3: 0, week4: 0 },
            lastContest: { name: "", rank: 0, date: null },
          },
          hackerrank: {
            problemsSolved:
              latestStats.platformStats?.hackerrank?.totalSolved || 0,
            score: latestStats.platformStats?.hackerrank?.scopeScore || 0,
            totalContests: latestStats.platformStats?.hackerrank?.contests || 0,
            rating: latestStats.platformStats?.hackerrank?.hackos || 0,
          },
          github: {
            commits: latestStats.platformStats?.github?.totalCommits || 0,
            repos: latestStats.platformStats?.github?.publicRepos || 0,
            score: latestStats.platformStats?.github?.scopeScore || 0,
            contributions: {
              thisMonth: Math.floor(
                (latestStats.platformStats?.github?.yearlyContributions || 0) /
                  12,
              ),
              thisYear:
                latestStats.platformStats?.github?.yearlyContributions || 0,
              total: latestStats.platformStats?.github?.totalCommits || 0,
            },
            languages: [
              { name: "JavaScript", percentage: 40 },
              { name: "Python", percentage: 35 },
              { name: "Java", percentage: 25 },
            ],
          },
        };

        // Calculate weekly ratings from recent stats
        // week1 = 3 weeks ago, week2 = 2 weeks ago, week3 = 1 week ago, week4 = current week
        const recentStats = allStats.slice(0, 28);
        ["leetcode", "codechef", "codeforces"].forEach((platform) => {
          for (let week = 1; week <= 4; week++) {
            // Correct week mapping: week1 = 3 weeks ago (days 21-27), week4 = current week (days 0-6)
            const weeksAgo = 4 - week; // week1 -> 3 weeks ago, week4 -> 0 weeks ago (current)
            const weekStart = weeksAgo * 7;
            const weekEnd = weekStart + 7;
            const weekStats = recentStats.slice(weekStart, weekEnd);

            if (weekStats.length > 0) {
              const weekRatings = weekStats
                .map((stat) => stat.platformStats?.[platform]?.rating || 0)
                .filter((rating) => rating > 0);

              if (weekRatings.length > 0) {
                platformAnalytics[platform].weeklyRatings[`week${week}`] =
                  Math.floor(
                    weekRatings.reduce((sum, rating) => sum + rating, 0) /
                      weekRatings.length,
                  );
              } else {
                platformAnalytics[platform].weeklyRatings[`week${week}`] =
                  platformAnalytics[platform].rating;
              }
            } else {
              platformAnalytics[platform].weeklyRatings[`week${week}`] =
                platformAnalytics[platform].rating;
            }
          }
        });

        analytics = new PlatformAnalytics({
          userId,
          email: user.email,
          ...platformAnalytics,
          lastUpdated: new Date(),
        });

        analytics.calculateTotals();
        await analytics.save();
      }
    }

    const formattedAnalytics = analytics
      ? await PlatformAnalytics.getPlatformAnalytics(userId)
      : {
          leetcode: {
            problemsSolved: 0,
            score: 0,
            totalContests: 0,
            rating: 0,
            weeklyRatings: {},
          },
          codechef: {
            problemsSolved: 0,
            score: 0,
            totalContests: 0,
            rating: 0,
            weeklyRatings: {},
          },
          codeforces: {
            problemsSolved: 0,
            score: 0,
            totalContests: 0,
            rating: 0,
            weeklyRatings: {},
          },
          hackerrank: { problemsSolved: 0, score: 0 },
          github: { commits: 0, repos: 0, score: 0, contributions: {} },
          totalScore: 0,
          totalProblems: 0,
          activePlatforms: 0,
          lastUpdated: null,
        };

    res.json(formattedAnalytics);
  } catch (error) {
    console.error("Error fetching platform analytics:", error);
    res.status(500).json({ error: "Failed to fetch platform analytics" });
  }
});

// GET Rank Trend endpoints
router.get("/weekly-rank-trend/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    let rankTrend = await RankTrend.findOne({
      userId,
      currentYear: new Date().getFullYear(),
    });

    if (!rankTrend) {
      // Generate from DailyStats
      const rankStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("scopeMetrics date")
        .limit(7);

      const weeklyRanks = {
        sunday: null,
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
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

      rankStats.forEach((stat) => {
        const dayOfWeek = stat.date.getDay();
        const dayName = dayNames[dayOfWeek];
        const rank = stat.scopeMetrics?.overallRank;

        if (rank && rank > 0 && weeklyRanks[dayName] === null) {
          weeklyRanks[dayName] = rank;
        }
      });

      rankTrend = { weeklyRanks };
    }

    res.json(rankTrend.weeklyRanks || {});
  } catch (error) {
    console.error("Error fetching weekly rank trend:", error);
    res.status(500).json({ error: "Failed to fetch weekly rank trend" });
  }
});

router.get("/monthly-rank-trend/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    let rankTrend = await RankTrend.findOne({
      userId,
      currentYear: new Date().getFullYear(),
    });

    if (!rankTrend) {
      // Generate from DailyStats
      const rankStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("scopeMetrics date")
        .limit(28);

      const monthlyRanks = {
        week1: null,
        week2: null,
        week3: null,
        week4: null,
      };

      for (let week = 1; week <= 4; week++) {
        const startIndex = (week - 1) * 7;
        const endIndex = week * 7;
        const weekStats = rankStats.slice(startIndex, endIndex);
        const validRanks = weekStats
          .map((s) => s.scopeMetrics.overallRank)
          .filter((r) => r > 0);

        if (validRanks.length > 0) {
          monthlyRanks[`week${week}`] = Math.round(
            validRanks.reduce((sum, rank) => sum + rank, 0) / validRanks.length,
          );
        }
      }

      rankTrend = { monthlyRanks };
    }

    res.json(rankTrend.monthlyRanks || {});
  } catch (error) {
    console.error("Error fetching monthly rank trend:", error);
    res.status(500).json({ error: "Failed to fetch monthly rank trend" });
  }
});

router.get("/yearly-rank-trend/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    let rankTrend = await RankTrend.findOne({
      userId,
      currentYear: new Date().getFullYear(),
    });

    if (!rankTrend) {
      // Generate from DailyStats
      const rankStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("scopeMetrics date")
        .limit(365);

      const yearlyRanks = {
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
      };

      // Calculate yearly ranks for last 12 months ending with current month
      const currentMonth = new Date().getMonth();
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

      // Create ordered month list: last 12 months ending with current month
      const orderedMonths = [];
      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        orderedMonths.push(monthNames[monthIndex]);
      }

      const monthlyData = {};
      rankStats.forEach((stat) => {
        const month = stat.date.getMonth();
        const monthName = monthNames[month];

        if (!monthlyData[monthName]) monthlyData[monthName] = [];
        if (stat.scopeMetrics.overallRank > 0) {
          monthlyData[monthName].push(stat.scopeMetrics.overallRank);
        }
      });

      // Only include months that have data and are in the last 12 months
      orderedMonths.forEach((month) => {
        if (monthlyData[month] && monthlyData[month].length > 0) {
          yearlyRanks[month] = Math.round(
            monthlyData[month].reduce((sum, rank) => sum + rank, 0) /
              monthlyData[month].length,
          );
        }
      });

      rankTrend = { yearlyRanks };
    }

    res.json(rankTrend.yearlyRanks || {});
  } catch (error) {
    console.error("Error fetching yearly rank trend:", error);
    res.status(500).json({ error: "Failed to fetch yearly rank trend" });
  }
});

// GET Platform Performance endpoints
router.get("/daily-platform-performance/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    let performance = await PlatformPerformance.findOne({
      userId,
      currentYear: new Date().getFullYear(),
    });

    if (!performance) {
      // Generate from DailyStats
      const platformStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("platformStats date")
        .limit(7);

      const dailyPerformance = {
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
      };

      const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      platformStats.forEach((stat) => {
        const dayName = days[stat.date.getDay()];
        if (stat.platformStats) {
          Object.keys(dailyPerformance[dayName]).forEach((platform) => {
            if (platform !== "total" && stat.platformStats[platform]) {
              dailyPerformance[dayName][platform] =
                stat.platformStats[platform].scopeScore || 0;
            }
          });

          dailyPerformance[dayName].total = Object.keys(
            dailyPerformance[dayName],
          )
            .filter((k) => k !== "total")
            .reduce(
              (sum, platform) => sum + dailyPerformance[dayName][platform],
              0,
            );
        }
      });

      performance = { dailyPerformance };
    }

    res.json(performance.dailyPerformance || {});
  } catch (error) {
    console.error("Error fetching daily platform performance:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch daily platform performance" });
  }
});

router.get("/monthly-platform-performance/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    let performance = await PlatformPerformance.findOne({
      userId,
      currentYear: new Date().getFullYear(),
    });

    if (!performance) {
      // Generate from DailyStats
      const platformStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("platformStats date")
        .limit(28);

      const monthlyPerformance = {
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
      };

      const today = new Date();

      for (let week = 1; week <= 4; week++) {
        const weeksBack = 4 - week; // week4 = 0 weeks back (current), week3 = 1 week back, etc.
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - weeksBack * 7);

        // Find the stats closest to this target date
        const weekStats = platformStats.find((stat) => {
          const statDate = new Date(stat.date);
          const dayDifference =
            Math.abs(statDate - targetDate) / (1000 * 60 * 60 * 24);
          return dayDifference <= 3.5; // Within 3.5 days of target date
        });

        if (weekStats && weekStats.platformStats) {
          const weekData = {
            leetcode: 0,
            codechef: 0,
            codeforces: 0,
            hackerrank: 0,
            github: 0,
          };

          Object.keys(weekData).forEach((platform) => {
            if (weekStats.platformStats[platform]) {
              weekData[platform] =
                weekStats.platformStats[platform].scopeScore || 0;
            }
          });

          monthlyPerformance[`week${week}`] = {
            ...weekData,
            total: Object.values(weekData).reduce(
              (sum, score) => sum + score,
              0,
            ),
          };
        }
      }

      performance = { monthlyPerformance };
    }

    res.json(performance.monthlyPerformance || {});
  } catch (error) {
    console.error("Error fetching monthly platform performance:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch monthly platform performance" });
  }
});

router.get("/yearly-platform-performance/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    let performance = await PlatformPerformance.findOne({
      userId,
      currentYear: new Date().getFullYear(),
    });

    if (!performance) {
      // Generate from DailyStats
      const platformStats = await DailyStats.find({ userId })
        .sort({ date: -1 })
        .select("platformStats date")
        .limit(365);

      const yearlyPerformance = {
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
      };

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

      // Calculate scores for each month in chronological order (11 months back to current)
      for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
        const targetDate = new Date(today);
        targetDate.setMonth(today.getMonth() - monthsBack);

        const monthIndex = targetDate.getMonth();
        const monthName = monthNames[monthIndex];

        // Find stats from that month (look for data within the month)
        const monthStats = platformStats.filter((stat) => {
          const statDate = new Date(stat.date);
          return (
            statDate.getMonth() === monthIndex &&
            statDate.getFullYear() === targetDate.getFullYear()
          );
        });

        if (monthStats.length > 0) {
          // Use the most recent data from that month
          const latestMonthStats = monthStats[0]; // Already sorted by date descending

          if (latestMonthStats && latestMonthStats.platformStats) {
            const monthData = {
              leetcode: 0,
              codechef: 0,
              codeforces: 0,
              hackerrank: 0,
              github: 0,
            };

            Object.keys(monthData).forEach((platform) => {
              if (latestMonthStats.platformStats[platform]) {
                monthData[platform] =
                  latestMonthStats.platformStats[platform].scopeScore || 0;
              }
            });

            yearlyPerformance[monthName] = {
              ...monthData,
              total: Object.values(monthData).reduce(
                (sum, score) => sum + score,
                0,
              ),
            };
          }
        }
      }

      performance = { yearlyPerformance };
    }

    res.json(performance.yearlyPerformance || {});
  } catch (error) {
    console.error("Error fetching yearly platform performance:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch yearly platform performance" });
  }
});

module.exports = router;
