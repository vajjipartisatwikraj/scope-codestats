const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const DailyStats = require("../models/DailyStats");
const User = require("../models/User");
const RankHistory = require("../models/RankHistory");

// Helper function to get date range
const getDateRange = (days = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate, endDate };
};

// Helper function to format platform data
const formatPlatformData = (stats) => {
  const platforms = ["leetcode", "codechef", "codeforces", "hackerrank"];
  const result = {};

  platforms.forEach((platform) => {
    result[platform] = {
      currentScore: 0,
      currentProblems: 0,
      scoreGrowth: 0,
      problemsGrowth: 0,
      scores: [],
      dates: [],
    };
  });

  if (stats && stats.length > 0) {
    stats.forEach((stat) => {
      platforms.forEach((platform) => {
        if (stat.platforms && stat.platforms[platform]) {
          const platformData = stat.platforms[platform];
          result[platform].scores.push(platformData.score || 0);
          result[platform].dates.push(stat.date);

          // Update current values with latest data
          result[platform].currentScore = platformData.score || 0;
          result[platform].currentProblems = platformData.problemsSolved || 0;
        }
      });
    });

    // Calculate growth for each platform
    platforms.forEach((platform) => {
      const scores = result[platform].scores;
      if (scores.length > 1) {
        const oldScore = scores[0];
        const newScore = scores[scores.length - 1];
        result[platform].scoreGrowth = newScore - oldScore;
      }
    });
  }

  return result;
};

// GET /api/dailyStats/dashboard - Dashboard overview stats
router.get("/dashboard", auth, async (req, res) => {
  try {
    // Calculate dates once
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Parallel queries for efficiency
    const [latestStats, oneMonthAgoStats, recentStats] = await Promise.all([
      // Get latest stats (current)
      DailyStats.findOne({ userId: req.user.id }).sort({ date: -1 }),

      // Get stats from exactly 1 month ago
      DailyStats.findOne({
        userId: req.user.id,
        date: {
          $gte: new Date(
            oneMonthAgo.getFullYear(),
            oneMonthAgo.getMonth(),
            oneMonthAgo.getDate(),
          ),
          $lt: new Date(
            oneMonthAgo.getFullYear(),
            oneMonthAgo.getMonth(),
            oneMonthAgo.getDate() + 1,
          ),
        },
      }),

      // Get last 30 days for activity calculation
      DailyStats.find({
        userId: req.user.id,
        date: { $gte: thirtyDaysAgo },
      }).sort({ date: 1 }),
    ]);

    // If no current data exists, return zeros
    if (!latestStats) {
      console.log(
        `No DailyStats found for user ${req.user.id}, returning zeros`,
      );

      // Generate empty heatmap data for 365 days
      const emptyHeatmapData = [];
      const today = new Date();

      for (let i = 364; i >= 0; i--) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() - i);

        emptyHeatmapData.push({
          date: currentDate.toISOString().split("T")[0],
          value: 0,
          level: 0,
          hasActivity: false,
          totalScore: 0,
          problems: 0,
        });
      }

      return res.json({
        success: true,
        data: {
          currentStats: {
            scopeMetrics: { totalScore: 0, overallRank: 0, departmentRank: 0 },
            problemStats: { totalProblems: 0 },
            activityFlags: { wasActive: false },
          },
          summary: { scoreChange: 0, problemsChange: 0, rankChange: 0 },
          activeDays: 0,
          totalDays: 0,
          heatmapData: emptyHeatmapData,
          debug: {
            userId: req.user.id,
            currentDataFound: false,
            previousDataFound: false,
            message: "No data found, showing zeros",
            heatmapRecords: emptyHeatmapData.length,
          },
        },
      });
    }

    // Extract current stats and calculate changes in one go
    const currentStats = {
      scopeMetrics: {
        totalScore: latestStats.scopeMetrics?.totalScore || 0,
        overallRank: latestStats.scopeMetrics?.overallRank || null,
        departmentRank: latestStats.scopeMetrics?.departmentRank || null,
      },
      problemStats: {
        totalProblems: latestStats.problemStats?.totalProblems || 0,
        dailyStreak: latestStats.problemStats?.dailyStreak || 0,
        maxStreak: latestStats.problemStats?.maxStreak || 0,
      },
      platformStats: latestStats.platformStats || {},
    };

    // Calculate 1-month changes efficiently
    const summary = oneMonthAgoStats
      ? {
          scoreChange:
            (latestStats.scopeMetrics?.totalScore || 0) -
            (oneMonthAgoStats.scopeMetrics?.totalScore || 0),
          rankChange:
            (oneMonthAgoStats.scopeMetrics?.overallRank || 0) -
            (latestStats.scopeMetrics?.overallRank || 0),
          problemsChange:
            (latestStats.problemStats?.totalProblems || 0) -
            (oneMonthAgoStats.problemStats?.totalProblems || 0),
        }
      : {
          scoreChange: 0,
          rankChange: 0,
          problemsChange: 0,
        };

    // Calculate active days efficiently
    const activeDays = recentStats.filter(
      (stat) =>
        stat.activityFlags?.wasActive ||
        stat.problemStats?.totalProblems > 0 ||
        stat.scopeMetrics?.totalScore > 0,
    ).length;

    // Get 365 days of data for heatmap
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const yearlyStats = await DailyStats.find({
      userId: req.user.id,
      date: { $gte: oneYearAgo },
    })
      .sort({ date: 1 })
      .select(
        "date scopeMetrics.totalScore problemStats.totalProblems activityFlags.wasActive",
      );

    // Generate heatmap data for 365 days
    const heatmapData = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - i);

      // Find stats for this date
      const dayStats = yearlyStats.find((stat) => {
        const statDate = new Date(stat.date);
        return statDate.toDateString() === currentDate.toDateString();
      });

      // Calculate score increase from previous day
      let scoreIncrease = 0;
      if (dayStats && i < 364) {
        const prevDate = new Date(currentDate);
        prevDate.setDate(currentDate.getDate() - 1);

        const prevDayStats = yearlyStats.find((stat) => {
          const statDate = new Date(stat.date);
          return statDate.toDateString() === prevDate.toDateString();
        });

        if (prevDayStats) {
          const currentScore = dayStats.scopeMetrics?.totalScore || 0;
          const prevScore = prevDayStats.scopeMetrics?.totalScore || 0;
          scoreIncrease = Math.max(0, currentScore - prevScore);
        }
      }

      heatmapData.push({
        date: currentDate.toISOString().split("T")[0], // YYYY-MM-DD format
        value: scoreIncrease,
        level:
          scoreIncrease === 0
            ? 0
            : scoreIncrease <= 10
              ? 1
              : scoreIncrease <= 25
                ? 2
                : scoreIncrease <= 50
                  ? 3
                  : 4, // GitHub-style levels 0-4
        hasActivity: dayStats?.activityFlags?.wasActive || scoreIncrease > 0,
        totalScore: dayStats?.scopeMetrics?.totalScore || 0,
        problems: dayStats?.problemStats?.totalProblems || 0,
      });
    }

    res.json({
      success: true,
      data: {
        currentStats,
        summary,
        activeDays,
        totalDays: recentStats.length,
        heatmapData, // 365 days of activity data
        debug: {
          userId: req.user.id,
          latestDate: latestStats.date,
          oneMonthAgoDate: oneMonthAgoStats?.date || null,
          oneMonthAgoFound: !!oneMonthAgoStats,
          recentRecords: recentStats.length,
          heatmapRecords: heatmapData.length,
          yearlyRecords: yearlyStats.length,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard stats",
      error: error.message,
    });
  }
});

// GET /api/dailyStats/analytics - Analytics data with platform trends
router.get("/analytics", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const { startDate, endDate } = getDateRange(parseInt(days));

    // Get user's daily stats
    const dailyStats = await DailyStats.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const platformTrends = formatPlatformData(dailyStats);

    // Calculate user stats summary
    let totalScore = 0;
    let totalProblems = 0;
    const platformBreakdown = {};

    Object.keys(platformTrends).forEach((platform) => {
      const data = platformTrends[platform];
      platformBreakdown[platform] = {
        currentScore: data.currentScore,
        currentProblems: data.currentProblems,
        scoreGrowth: data.scoreGrowth,
        problemsGrowth: data.problemsGrowth,
      };

      totalScore += data.currentScore;
      totalProblems += data.currentProblems;
    });

    res.json({
      success: true,
      data: {
        userStats: {
          totalScore,
          totalProblems,
          platformBreakdown,
        },
        platformTrends,
        dataRange: {
          startDate,
          endDate,
          days: parseInt(days),
        },
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching analytics data",
      error: error.message,
    });
  }
});

// GET /api/dailyStats/weekly-activity - Weekly activity data
router.get("/weekly-activity", auth, async (req, res) => {
  try {
    const { weeks = 53 } = req.query;
    const weeksNum = parseInt(weeks);

    // Calculate start date (weeks ago)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeksNum * 7);

    // Get daily stats for the period
    const dailyStats = await DailyStats.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Group by weeks
    const weeklyData = [];
    const platforms = ["leetcode", "codechef", "codeforces", "hackerrank"];

    // Create weekly buckets
    for (let i = 0; i < weeksNum; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Find stats for this week
      const weekStats = dailyStats.filter((stat) => {
        const statDate = new Date(stat.date);
        return statDate >= weekStart && statDate <= weekEnd;
      });

      // Aggregate week data
      let weeklyScore = 0;
      let weeklyProblems = 0;
      const weeklyPlatforms = {};

      platforms.forEach((platform) => {
        weeklyPlatforms[platform] = { score: 0, problems: 0 };
      });

      weekStats.forEach((stat) => {
        platforms.forEach((platform) => {
          if (stat.platforms && stat.platforms[platform]) {
            const platformData = stat.platforms[platform];
            weeklyPlatforms[platform].score += platformData.score || 0;
            weeklyPlatforms[platform].problems +=
              platformData.problemsSolved || 0;
            weeklyScore += platformData.score || 0;
            weeklyProblems += platformData.problemsSolved || 0;
          }
        });
      });

      weeklyData.push({
        week: i + 1,
        startDate: weekStart,
        endDate: weekEnd,
        totalScore: weeklyScore,
        totalProblems: weeklyProblems,
        platforms: weeklyPlatforms,
        activeDays: weekStats.length,
      });
    }

    res.json({
      success: true,
      data: {
        weeklyActivity: weeklyData,
        totalWeeks: weeksNum,
        summary: {
          totalScore: weeklyData.reduce(
            (sum, week) => sum + week.totalScore,
            0,
          ),
          totalProblems: weeklyData.reduce(
            (sum, week) => sum + week.totalProblems,
            0,
          ),
          activeWeeks: weeklyData.filter((week) => week.activeDays > 0).length,
        },
      },
    });
  } catch (error) {
    console.error("Weekly activity error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching weekly activity",
      error: error.message,
    });
  }
});

// GET /api/dailyStats/rank-history - Rank history data
router.get("/rank-history", auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const { startDate, endDate } = getDateRange(parseInt(days));

    // Get rank history from RankHistory model if available
    let rankHistory = await RankHistory.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // If no rank history, generate from daily stats
    if (rankHistory.length === 0) {
      const dailyStats = await DailyStats.find({
        userId: req.user.id,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 });

      // Generate rank history from daily stats
      rankHistory = dailyStats.map((stat, index) => {
        const totalScore = Object.values(stat.platforms || {}).reduce(
          (sum, platform) => {
            return sum + (platform.score || 0);
          },
          0,
        );

        // Simulate rank based on score (higher score = better rank)
        const baseRank = Math.max(1, 1000 - Math.floor(totalScore / 10));
        const variation = Math.floor(Math.random() * 20) - 10; // ±10 variation
        const rank = Math.max(1, baseRank + variation);

        return {
          date: stat.date,
          rank: rank,
          score: totalScore,
          userId: req.user.id,
        };
      });
    }

    // Format response
    const formattedHistory = rankHistory.map((entry) => ({
      date: entry.date,
      rank: entry.rank || 1,
      score: entry.score || 0,
    }));

    res.json({
      success: true,
      data: {
        rankHistory: formattedHistory,
        summary: {
          currentRank:
            formattedHistory.length > 0
              ? formattedHistory[formattedHistory.length - 1].rank
              : 1,
          bestRank:
            formattedHistory.length > 0
              ? Math.min(...formattedHistory.map((h) => h.rank))
              : 1,
          totalEntries: formattedHistory.length,
        },
      },
    });
  } catch (error) {
    console.error("Rank history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching rank history",
      error: error.message,
    });
  }
});

// GET /api/dailyStats/current - Current user stats
router.get("/current", auth, async (req, res) => {
  try {
    // Get latest daily stats
    const latestStats = await DailyStats.findOne({
      userId: req.user.id,
    }).sort({ date: -1 });

    // Get user with platform data
    const user = await User.findById(req.user.id).select(
      "platformScores platformData profiles",
    );
    const platformScores = user?.platformScores || new Map();
    const platformData = user?.platformData || {};
    const userProfiles = user?.profiles || {};

    const platforms = ["leetcode", "codechef", "codeforces", "hackerrank"];
    const currentStats = {};

    platforms.forEach((platform) => {
      currentStats[platform] = {
        score: 0,
        problemsSolved: 0,
        rank: null,
        rating: null,
      };

      // Get from latest daily stats
      if (
        latestStats &&
        latestStats.platforms &&
        latestStats.platforms[platform]
      ) {
        const platformData = latestStats.platforms[platform];
        currentStats[platform].score = platformData.score || 0;
        currentStats[platform].problemsSolved =
          platformData.problemsSolved || 0;
        currentStats[platform].rank = platformData.rank || null;
        currentStats[platform].rating = platformData.rating || null;
      }

      // Supplement with User model platform data
      const userPlatformData =
        platformScores.get(platform) || platformData[platform] || {};
      if (userPlatformData) {
        currentStats[platform].username =
          userProfiles[platform] || userPlatformData.username || "";
        currentStats[platform].profileUrl =
          `https://${platform}.com/${userProfiles[platform] || userPlatformData.username || ""}`;
        if (!currentStats[platform].score) {
          currentStats[platform].score = userPlatformData.score || 0;
        }
        if (!currentStats[platform].problemsSolved) {
          currentStats[platform].problemsSolved =
            userPlatformData.problemsSolved ||
            userPlatformData.totalSolved ||
            0;
        }
        if (!currentStats[platform].rating) {
          currentStats[platform].rating = userPlatformData.rating || 0;
        }
      }
    });

    res.json({
      success: true,
      data: {
        platforms: currentStats,
        lastUpdated: latestStats ? latestStats.date : null,
      },
    });
  } catch (error) {
    console.error("Current stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching current stats",
      error: error.message,
    });
  }
});

// GET /api/dailyStats/platform-performance - Platform performance data for charts
router.get("/platform-performance", auth, async (req, res) => {
  try {
    const { days = 30, platforms } = req.query;
    const { startDate, endDate } = getDateRange(parseInt(days));

    const targetPlatforms = platforms
      ? platforms.split(",")
      : ["leetcode", "codechef", "codeforces"];

    // Get daily stats
    const dailyStats = await DailyStats.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Format data for charts
    const chartData = dailyStats.map((stat) => {
      const dataPoint = {
        date: stat.date.toISOString().split("T")[0],
        display: `${stat.date.getMonth() + 1}/${stat.date.getDate()}`,
      };

      targetPlatforms.forEach((platform) => {
        if (stat.platforms && stat.platforms[platform]) {
          dataPoint[platform] = stat.platforms[platform].score || 0;
        } else {
          dataPoint[platform] = 0;
        }
      });

      return dataPoint;
    });

    res.json({
      success: true,
      data: {
        chartData,
        platforms: targetPlatforms,
        dateRange: { startDate, endDate },
        totalDataPoints: chartData.length,
      },
    });
  } catch (error) {
    console.error("Platform performance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching platform performance",
      error: error.message,
    });
  }
});

module.exports = router;
