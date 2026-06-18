const DailyStats = require("../models/DailyStats");
const User = require("../models/User");

// ─── Constants ─────────────────────────────────────────────────────────────
const PLATFORMS = [
  "leetcode",
  "codechef",
  "codeforces",
  "hackerrank",
  "github",
  "scopecodestats",
];
const CONTEST_PLATFORMS = new Set(["leetcode", "codechef", "codeforces"]);
const NON_PROBLEM_PLATFORMS = new Set(["github"]); // Platforms that don't count toward totalProblems

// Day-index map for generateWeeklyActivity (Wed=0..Tue=6 to match Dashboard.jsx)
const WEEKLY_DAY_MAP = { 3: 0, 4: 1, 5: 2, 6: 3, 0: 4, 1: 5, 2: 6 };
const WEEKLY_DAYS = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
const CALENDAR_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

class StatsService {
  // ─── Daily Stats Generation (called by cron) ──────────────────────────────

  async generateDailyStats() {
    try {
      const users = await User.find({ userType: "user" });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statsData = [];

      for (let i = 0; i < users.length; i++) {
        statsData.push(await this.calculateUserDailyStats(users[i], today));

        // Progress log every 100 users
        if (i > 0 && i % 100 === 0) {
          console.log(
            `[StatsService] generateDailyStats progress: ${i}/${users.length} users`,
          );
        }
      }

      this.calculateRanks(statsData);

      // Bulk upsert
      await DailyStats.bulkWrite(
        statsData.map((stats) => ({
          updateOne: {
            filter: { userId: stats.userId, date: today },
            update: { $set: stats },
            upsert: true,
          },
        })),
      );

      console.log(
        `[StatsService] generateDailyStats completed | users=${statsData.length}`,
      );
      return { success: true, count: statsData.length };
    } catch (error) {
      console.error(
        "[StatsService] generateDailyStats FAILED:",
        error.message,
        "\n",
        error.stack,
      );
      throw error;
    }
  }

  // ─── Single-User Stats Calculation ─────────────────────────────────────────

  async calculateUserDailyStats(user, date) {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);

    const previousStats = await DailyStats.findOne({
      userId: user._id,
      date: yesterday,
    });

    const platformStats = {};
    let totalScore = 0;
    let totalProblems = 0;
    let wasActive = false;
    const activePlatforms = [];

    for (const platform of PLATFORMS) {
      const platformData = user.platformData?.[platform];
      const prevPlatformStats = previousStats?.platformStats?.[platform] || {};

      const stats = this.calculatePlatformStats(
        platform,
        platformData,
        prevPlatformStats,
        user,
      );
      platformStats[platform] = stats;
      totalScore += stats.scopeScore;

      if (!NON_PROBLEM_PLATFORMS.has(platform)) {
        totalProblems += stats.totalSolved || 0;
      }

      if (
        stats.solvedChange > 0 ||
        stats.scoreChange > 0 ||
        stats.commitsChange > 0
      ) {
        wasActive = true;
        activePlatforms.push(platform);
      }
    }

    const problemStats = this.calculateProblemStats(
      platformStats,
      previousStats?.problemStats,
    );
    const contestStats = this.calculateContestStats(
      platformStats,
      previousStats?.contestStats,
    );

    return {
      userId: user._id,
      date,
      scopeMetrics: {
        totalScore,
        scoreChange:
          totalScore - (previousStats?.scopeMetrics?.totalScore || 0),
        overallRank: 0,
        rankChange: 0,
        departmentRank: 0,
        departmentRankChange: 0,
        percentile: 0,
        totalUsers: 0,
        departmentUsers: 0,
      },
      problemStats,
      contestStats,
      platformStats,
      userSnapshot: {
        name: user.name,
        department: user.department,
        rollNumber: user.rollNumber,
        graduatingYear: user.graduatingYear,
        userType: user.userType,
      },
      activityFlags: {
        wasActive,
        activePlatforms,
        inactivityDays: wasActive
          ? 0
          : (previousStats?.activityFlags?.inactivityDays || 0) + 1,
        lastActiveDate: wasActive
          ? date
          : previousStats?.activityFlags?.lastActiveDate,
      },
    };
  }

  // ─── Platform Stats ────────────────────────────────────────────────────────

  calculatePlatformStats(platform, platformData, previousStats = {}, user) {
    const stats = {
      totalSolved: 0,
      solvedChange: 0,
      scopeScore: 0,
      scoreChange: 0,
      lastUpdated: new Date(),
    };

    if (!platformData) {
      return { ...stats, ...this.getDefaultPlatformStats(platform) };
    }

    switch (platform) {
      case "leetcode":
        stats.totalSolved = platformData.totalSolved || 0;
        stats.easySolved = platformData.easySolved || 0;
        stats.mediumSolved = platformData.mediumSolved || 0;
        stats.hardSolved = platformData.hardSolved || 0;
        stats.rating = platformData.rating || 0;
        stats.maxRating = Math.max(
          platformData.rating || 0,
          previousStats.maxRating || 0,
        );
        stats.globalRanking = platformData.ranking || 0;
        stats.contestsAttended = platformData.contestsParticipated || 0;
        stats.totalSubmissions = 0;
        stats.acceptedSubmissions = 0;
        stats.acceptanceRate = 0;
        stats.scopeScore = this.calculateLeetCodeScore(platformData);
        break;

      case "codechef":
        stats.totalSolved = platformData.problemsSolved || 0;
        stats.rating = platformData.rating || 0;
        stats.maxRating = Math.max(
          platformData.rating || 0,
          previousStats.maxRating || 0,
        );
        stats.globalRank = platformData.global_rank || 0;
        stats.countryRank = platformData.country_rank || 0;
        stats.stars = this.calculateStars(platformData.rating || 0);
        stats.contestsRated = platformData.contestsParticipated || 0;
        stats.scopeScore = this.calculateCodeChefScore(platformData);
        break;

      case "codeforces":
        stats.totalSolved = platformData.problemsSolved || 0;
        stats.rating = platformData.rating || 0;
        stats.maxRating = platformData.maxRating || 0;
        stats.rank = this.calculateCodeforcesRank(platformData.rating || 0);
        stats.contestsRated = platformData.contestsParticipated || 0;
        stats.scopeScore = this.calculateCodeforcesScore(platformData);
        break;

      case "hackerrank":
        stats.totalSolved = platformData.problemsSolved || 0;
        stats.badges = platformData.badges || 0;
        stats.certifications = platformData.certificates || 0;
        stats.scopeScore = this.calculateHackerRankScore(platformData);
        break;

      case "github": {
        const gh = user.githubStats || {};
        stats.totalCommits = gh.totalCommits || 0;
        stats.publicRepos = gh.publicRepos || 0;
        stats.followers = gh.followers || 0;
        stats.starsReceived = gh.starsReceived || 0;
        stats.yearlyContributions = gh.contributionsLastYear || 0;
        stats.weeklyContributions = this.calculateWeeklyContributions(gh);
        stats.scopeScore = this.calculateGitHubScore(gh);
        break;
      }

      case "scopecodestats": {
        const sd = user.platformData?.scopecodestats || {};
        stats.totalCohortScore = sd.totalCohortScore || 0;
        stats.totalCohortsCompleted = sd.totalCohortsCompleted || 0;
        stats.totalCohortProblemsSolved = sd.totalCohortProblemsolved || 0;
        stats.consistencyIndex = sd.consistencyIndex || 0;
        stats.totalPracticeArenaContests = sd.totalPracticeArenaContests || 0;
        stats.totalSolved = sd.totalCohortProblemsolved || 0;
        stats.scopeScore = this.calculateScopeCodestatsScore(sd);
        break;
      }
    }

    // Daily deltas
    stats.solvedChange =
      (stats.totalSolved || 0) - (previousStats.totalSolved || 0);
    stats.scoreChange = stats.scopeScore - (previousStats.scopeScore || 0);

    if (platform === "github") {
      stats.commitsChange =
        (stats.totalCommits || 0) - (previousStats.totalCommits || 0);
      stats.reposChange =
        (stats.publicRepos || 0) - (previousStats.publicRepos || 0);
      stats.followersChange =
        (stats.followers || 0) - (previousStats.followers || 0);
      stats.starsChange =
        (stats.starsReceived || 0) - (previousStats.starsReceived || 0);
    }

    return stats;
  }

  // ─── Scoring Algorithms (aligned with platformAPIs.js) ────────────────────

  calculateLeetCodeScore(pd) {
    const ps = (pd.totalSolved || 0) * 5;
    const contests = pd.contestsParticipated || 0;
    const rating = pd.rating || 0;
    const rs =
      contests >= 3 && rating > 1400 ? Math.pow(rating - 1400, 2) / 30 : 0;
    return Math.round(ps + rs + contests * 50);
  }

  calculateCodeChefScore(pd) {
    const ps = (pd.problemsSolved || 0) * 0.5;
    const contests = pd.contestsParticipated || 0;
    const rating = pd.rating || 0;
    const rs =
      contests >= 3 && rating > 1100 ? Math.pow(rating - 1100, 2) / 30 : 0;
    return Math.round(ps + rs + contests * 50);
  }

  calculateCodeforcesScore(pd) {
    const ps = (pd.problemsSolved || 0) * 5;
    const contests = pd.contestsParticipated || 0;
    const rating = pd.rating || 0;
    const rs =
      contests >= 3 && rating > 1000 ? Math.pow(rating - 1000, 2) / 30 : 0;
    return Math.round(ps + rs + contests * 50);
  }

  calculateHackerRankScore(pd) {
    return (pd.totalSolved || pd.problemsSolved || 0) * 5;
  }

  calculateGitHubScore(gh) {
    const repoScore = (gh.publicRepos || gh.public_repos || 0) * 10;
    const starsScore = (gh.starsReceived || 0) * 5;
    return Math.round(Math.min(repoScore, 1000) + starsScore);
  }

  calculateScopeCodestatsScore(d) {
    return Math.round(
      (d.totalCohortScore || 0) + (d.consistencyIndex || 0) * 10,
    );
  }

  // ─── Platform Helpers ──────────────────────────────────────────────────────

  calculateStars(rating) {
    if (rating >= 2500) return "7★";
    if (rating >= 2200) return "6★";
    if (rating >= 2000) return "5★";
    if (rating >= 1800) return "4★";
    if (rating >= 1600) return "3★";
    if (rating >= 1400) return "2★";
    return "1★";
  }

  calculateCodeforcesRank(rating) {
    if (rating >= 3000) return "Legendary Grandmaster";
    if (rating >= 2600) return "International Grandmaster";
    if (rating >= 2400) return "Grandmaster";
    if (rating >= 2300) return "International Master";
    if (rating >= 2100) return "Master";
    if (rating >= 1900) return "Candidate Master";
    if (rating >= 1600) return "Expert";
    if (rating >= 1400) return "Specialist";
    if (rating >= 1200) return "Pupil";
    return "Newbie";
  }

  calculateWeeklyContributions(gh) {
    // Use real per-day data if available
    if (
      Array.isArray(gh.weeklyContributions) &&
      gh.weeklyContributions.length === 7
    ) {
      return gh.weeklyContributions;
    }
    // Flat daily average (no random fabrication)
    const avgPerDay =
      (gh.contributionsLastYear || 0) > 0
        ? Math.round((gh.contributionsLastYear || 0) / 365)
        : 0;
    return CALENDAR_DAYS.map((day) => ({ day, contributions: avgPerDay }));
  }

  // ─── Aggregated Problem Stats ──────────────────────────────────────────────

  calculateProblemStats(platformStats, previousStats = {}) {
    let totalProblems = 0;
    let easyProblems = 0;
    let mediumProblems = 0;
    let hardProblems = 0;

    for (const [platform, stats] of Object.entries(platformStats)) {
      if (platform === "leetcode") {
        easyProblems += stats.easySolved || 0;
        mediumProblems += stats.mediumSolved || 0;
        hardProblems += stats.hardSolved || 0;
      }
      if (!NON_PROBLEM_PLATFORMS.has(platform)) {
        totalProblems += stats.totalSolved || 0;
      }
    }

    const problemsChange = totalProblems - (previousStats.totalProblems || 0);
    let dailyStreak = previousStats.dailyStreak || 0;
    let maxStreak = previousStats.maxStreak || 0;

    if (problemsChange > 0) {
      dailyStreak += 1;
      maxStreak = Math.max(maxStreak, dailyStreak);
    } else {
      dailyStreak = 0;
    }

    return {
      totalProblems,
      problemsChange,
      easyProblems,
      mediumProblems,
      hardProblems,
      dailyStreak,
      maxStreak,
      weeklyActivity: this.generateWeeklyActivity(platformStats),
    };
  }

  generateWeeklyActivity(platformStats) {
    const todaySlot = WEEKLY_DAY_MAP[new Date().getDay()] ?? -1;
    let todayProblems = 0;
    let todayScore = 0;

    for (const [platform, stats] of Object.entries(platformStats)) {
      if (!NON_PROBLEM_PLATFORMS.has(platform)) {
        todayProblems += stats.solvedChange || 0;
        todayScore += stats.scoreChange || 0;
      }
    }

    return WEEKLY_DAYS.map((day, i) => ({
      day,
      problems: i === todaySlot ? todayProblems : 0,
      score: i === todaySlot ? todayScore : 0,
    }));
  }

  // ─── Contest Stats ─────────────────────────────────────────────────────────

  calculateContestStats(platformStats, previousStats = {}) {
    let totalContests = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    let maxRating = 0;

    for (const platform of CONTEST_PLATFORMS) {
      const stats = platformStats[platform];
      if (!stats) continue;

      totalContests += stats.contestsAttended || stats.contestsRated || 0;
      if (stats.rating > 0) {
        ratingSum += stats.rating;
        ratingCount++;
      }
      maxRating = Math.max(maxRating, stats.maxRating || 0);
    }

    return {
      totalContests,
      contestsChange: totalContests - (previousStats.totalContests || 0),
      averageRating: ratingCount > 0 ? Math.round(ratingSum / ratingCount) : 0,
      maxRating,
      recentContests: [],
    };
  }

  // ─── Ranking ───────────────────────────────────────────────────────────────

  calculateRanks(statsData) {
    statsData.sort(
      (a, b) => b.scopeMetrics.totalScore - a.scopeMetrics.totalScore,
    );

    const total = statsData.length;
    statsData.forEach((s, i) => {
      s.scopeMetrics.overallRank = i + 1;
      s.scopeMetrics.totalUsers = total;
      s.scopeMetrics.percentile = Math.round(((total - i) / total) * 100);
    });

    // Department ranks
    const deptGroups = {};
    for (const s of statsData) {
      const dept = s.userSnapshot.department;
      (deptGroups[dept] ||= []).push(s);
    }

    for (const users of Object.values(deptGroups)) {
      users.sort(
        (a, b) => b.scopeMetrics.totalScore - a.scopeMetrics.totalScore,
      );
      const deptTotal = users.length;
      users.forEach((s, i) => {
        s.scopeMetrics.departmentRank = i + 1;
        s.scopeMetrics.departmentUsers = deptTotal;
      });
    }
  }

  // ─── Default Platform Stats ────────────────────────────────────────────────

  getDefaultPlatformStats(platform) {
    const defaults = {
      totalSolved: 0,
      solvedChange: 0,
      scopeScore: 0,
      scoreChange: 0,
      lastUpdated: new Date(),
    };

    switch (platform) {
      case "leetcode":
        return {
          ...defaults,
          easySolved: 0,
          mediumSolved: 0,
          hardSolved: 0,
          rating: 0,
          maxRating: 0,
          globalRanking: 0,
          contestsAttended: 0,
          totalSubmissions: 0,
          acceptedSubmissions: 0,
          acceptanceRate: 0,
        };
      case "github":
        return {
          ...defaults,
          totalCommits: 0,
          commitsChange: 0,
          publicRepos: 0,
          reposChange: 0,
          followers: 0,
          followersChange: 0,
          starsReceived: 0,
          starsChange: 0,
          yearlyContributions: 0,
          weeklyContributions: [],
        };
      case "scopecodestats":
        return {
          ...defaults,
          totalCohortScore: 0,
          totalCohortsCompleted: 0,
          totalCohortProblemsSolved: 0,
          consistencyIndex: 0,
          totalPracticeArenaContests: 0,
        };
      default:
        return defaults;
    }
  }

  // ─── Dashboard Query Methods ───────────────────────────────────────────────

  async getDashboardStats(userId, days = 30) {
    const [latestStats, historicalStats, weeklyActivity] = await Promise.all([
      DailyStats.getLatestUserStats(userId),
      DailyStats.getUserStats(userId, days),
      DailyStats.getWeeklyActivity(userId, 4),
    ]);

    if (!latestStats) {
      return { empty: true, message: "No statistics available" };
    }

    return {
      currentStats: latestStats,
      historicalData: historicalStats,
      weeklyActivity,
      summary: this.calculateSummary(historicalStats),
      lastUpdated: latestStats.updatedAt,
    };
  }

  calculateSummary(historicalStats) {
    if (!historicalStats.length) return {};

    const latest = historicalStats[historicalStats.length - 1];
    const oldest = historicalStats[0];

    return {
      totalDays: historicalStats.length,
      scoreGrowth:
        latest.scopeMetrics.totalScore - oldest.scopeMetrics.totalScore,
      problemsGrowth:
        latest.problemStats.totalProblems - oldest.problemStats.totalProblems,
      rankImprovement:
        oldest.scopeMetrics.overallRank - latest.scopeMetrics.overallRank,
      bestRank: Math.min(
        ...historicalStats.map((s) => s.scopeMetrics.overallRank),
      ),
      maxStreak: Math.max(
        ...historicalStats.map((s) => s.problemStats.dailyStreak),
      ),
      activeDays: historicalStats.filter((s) => s.activityFlags.wasActive)
        .length,
      platformBreakdown: this.calculatePlatformBreakdown(historicalStats),
    };
  }

  calculatePlatformBreakdown(stats) {
    const breakdown = {};

    for (const platform of PLATFORMS) {
      const platformStats = stats.map((s) => s.platformStats[platform]);
      const latest = platformStats[platformStats.length - 1];
      const oldest = platformStats[0];

      breakdown[platform] = {
        currentScore: latest?.scopeScore || 0,
        scoreGrowth: (latest?.scopeScore || 0) - (oldest?.scopeScore || 0),
        currentProblems: latest?.totalSolved || latest?.totalCommits || 0,
        problemsGrowth:
          (latest?.totalSolved || latest?.totalCommits || 0) -
          (oldest?.totalSolved || oldest?.totalCommits || 0),
        activityDays: platformStats.filter((p) => (p?.scoreChange || 0) > 0)
          .length,
      };
    }

    return breakdown;
  }

  // ─── Leaderboard & Analytics Passthrough ───────────────────────────────────

  async getPlatformLeaderboard(platform, date = null, limit = 10) {
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    return DailyStats.getPlatformLeaderboard(platform, queryDate, limit);
  }

  async getDepartmentAnalytics(department, days = 30) {
    return DailyStats.getDepartmentAnalytics(department, days);
  }

  async getGlobalAnalytics(days = 30) {
    return DailyStats.getGlobalAnalytics(days);
  }
}

module.exports = new StatsService();
