const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const statsService = require("../services/statsService");
const DailyStats = require("../models/DailyStats");
const User = require("../models/User");
const AcademicYearConfig = require("../models/AcademicYearConfig");

// Dashboard stats for current user (matches Dashboard.jsx requirements)
router.get("/dashboard", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const dashboardData = await statsService.getDashboardStats(
      userId,
      parseInt(days),
    );

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
});

// Get current user's latest stats
router.get("/me/current", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const latestStats = await DailyStats.getLatestUserStats(userId);

    if (!latestStats) {
      return res.json({
        success: true,
        data: { empty: true, message: "No statistics available yet" },
      });
    }

    res.json({
      success: true,
      data: latestStats,
    });
  } catch (error) {
    console.error("Error fetching current user stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch current statistics",
      error: error.message,
    });
  }
});

// Get user's historical data for charts
router.get("/me/history", auth, async (req, res) => {
  try {
    const { days = 30, metric = "score" } = req.query;
    const userId = req.user.id;

    const stats = await DailyStats.getUserStats(userId, parseInt(days));

    let chartData;
    switch (metric) {
      case "score":
        chartData = stats.map((s) => ({
          date: s.date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: s.scopeMetrics.totalScore,
          change: s.scopeMetrics.scoreChange,
        }));
        break;
      case "rank":
        chartData = stats.map((s) => ({
          date: s.date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: s.scopeMetrics.overallRank,
          change: s.scopeMetrics.rankChange,
        }));
        break;
      case "problems":
        chartData = stats.map((s) => ({
          date: s.date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: s.problemStats.totalProblems,
          change: s.problemStats.problemsChange,
        }));
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid metric. Use: score, rank, or problems",
        });
    }

    res.json({
      success: true,
      data: {
        metric,
        chartData,
        summary: {
          current: chartData[chartData.length - 1]?.value || 0,
          previous: chartData[0]?.value || 0,
          totalChange:
            (chartData[chartData.length - 1]?.value || 0) -
            (chartData[0]?.value || 0),
          trend:
            chartData.length > 1
              ? chartData[chartData.length - 1].value > chartData[0].value
                ? "up"
                : "down"
              : "stable",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching historical data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch historical data",
      error: error.message,
    });
  }
});

// Get weekly activity data for heatmap (matches Dashboard.jsx format)
router.get("/me/weekly-activity", auth, async (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const userId = req.user.id;

    const weeklyData = await DailyStats.getWeeklyActivity(
      userId,
      parseInt(weeks),
    );

    // Format data for Dashboard.jsx heatmap
    const formattedData = weeklyData.map((stat) => ({
      date: stat.date.toISOString().split("T")[0],
      day: stat.date.toLocaleDateString("en-US", { weekday: "short" }),
      activity: stat.problemStats.weeklyActivity || [],
      score: stat.scopeMetrics.totalScore,
      problems: stat.problemStats.totalProblems,
      wasActive: stat.activityFlags.wasActive,
    }));

    res.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching weekly activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch weekly activity",
      error: error.message,
    });
  }
});

// Get platform-specific stats for current user
router.get("/me/platform/:platform", auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const validPlatforms = [
      "leetcode",
      "codechef",
      "codeforces",
      "hackerrank",
      "github",
    ];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: "Invalid platform",
      });
    }

    const stats = await DailyStats.getUserStats(userId, parseInt(days));

    const platformData = stats.map((s) => ({
      date: s.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ...s.platformStats[platform],
    }));

    res.json({
      success: true,
      data: {
        platform,
        data: platformData,
        latest: platformData[platformData.length - 1] || {},
      },
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform statistics",
      error: error.message,
    });
  }
});

// Global leaderboard
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const { date, limit = 100, department } = req.query;

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const leaderboard = await DailyStats.getLeaderboard(
      queryDate,
      parseInt(limit),
      department,
    );

    res.json({
      success: true,
      data: {
        date: queryDate,
        leaderboard,
        total: leaderboard.length,
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
      error: error.message,
    });
  }
});

// Platform-specific leaderboard
router.get("/leaderboard/platform/:platform", auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const { date, limit = 100 } = req.query;

    const validPlatforms = [
      "leetcode",
      "codechef",
      "codeforces",
      "hackerrank",
      "github",
    ];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: "Invalid platform",
      });
    }

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const platformLeaderboard = await statsService.getPlatformLeaderboard(
      platform,
      queryDate,
      parseInt(limit),
    );

    res.json({
      success: true,
      data: {
        platform,
        date: queryDate,
        leaderboard: platformLeaderboard,
        total: platformLeaderboard.length,
      },
    });
  } catch (error) {
    console.error("Error fetching platform leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform leaderboard",
      error: error.message,
    });
  }
});

// Get analytics data (for Dashboard.jsx analytics section)
router.get("/analytics", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const [userStats, globalStats] = await Promise.all([
      statsService.getDashboardStats(userId, parseInt(days)),
      statsService.getGlobalAnalytics(parseInt(days)),
    ]);

    // Calculate user's position in global context
    const latestGlobal = globalStats[globalStats.length - 1] || {};
    const userPosition = userStats.currentStats
      ? {
          scorePercentile: userStats.currentStats.scopeMetrics.percentile,
          rankPosition: userStats.currentStats.scopeMetrics.overallRank,
          totalUsers: userStats.currentStats.scopeMetrics.totalUsers,
          departmentRank: userStats.currentStats.scopeMetrics.departmentRank,
          departmentUsers: userStats.currentStats.scopeMetrics.departmentUsers,
        }
      : {};

    res.json({
      success: true,
      data: {
        userStats: userStats.summary || {},
        globalStats: latestGlobal,
        userPosition,
        period: parseInt(days),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
});

// Get rank history (for Dashboard.jsx rank history chart)
router.get("/rank-history", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const stats = await DailyStats.getUserStats(userId, parseInt(days));

    const rankHistory = stats.map((s) => ({
      date: s.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      overallRank: s.scopeMetrics.overallRank,
      departmentRank: s.scopeMetrics.departmentRank,
      totalScore: s.scopeMetrics.totalScore,
      percentile: s.scopeMetrics.percentile,
    }));

    res.json({
      success: true,
      data: rankHistory,
    });
  } catch (error) {
    console.error("Error fetching rank history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rank history",
      error: error.message,
    });
  }
});

// Admin routes
router.get("/admin/overview", [auth, adminAuth], async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get graduated years to exclude from analytics
    const config = await AcademicYearConfig.getConfig();
    const graduatedYears = config.yearMappings
      .filter((m) => m.academicYear === "Graduated")
      .map((m) => m.graduationYear);

    // Get user IDs of graduated students to exclude
    const graduatedUserIds = await User.find(
      { graduatingYear: { $in: graduatedYears } },
      { _id: 1 },
    ).lean();
    const graduatedUserIdsList = graduatedUserIds.map((u) => u._id);

    const [globalStats, recentStats] = await Promise.all([
      statsService.getGlobalAnalytics(parseInt(days)),
      DailyStats.find({ userId: { $nin: graduatedUserIdsList } })
        .sort({ date: -1 })
        .limit(1)
        .populate("userId", "name department"),
    ]);

    const latestDate = recentStats[0]?.date || new Date();
    const todaysStats = await DailyStats.find({
      date: latestDate,
      userId: { $nin: graduatedUserIdsList },
    });

    // Calculate today's summary
    const todaySummary = {
      totalUsers: todaysStats.length,
      activeUsers: todaysStats.filter((s) => s.activityFlags.wasActive).length,
      totalProblems: todaysStats.reduce(
        (sum, s) => sum + s.problemStats.totalProblems,
        0,
      ),
      totalScore: todaysStats.reduce(
        (sum, s) => sum + s.scopeMetrics.totalScore,
        0,
      ),
      avgScore:
        todaysStats.length > 0
          ? Math.round(
              todaysStats.reduce(
                (sum, s) => sum + s.scopeMetrics.totalScore,
                0,
              ) / todaysStats.length,
            )
          : 0,
    };

    res.json({
      success: true,
      data: {
        globalTrends: globalStats,
        todaySummary,
        lastUpdated: latestDate,
      },
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin overview",
      error: error.message,
    });
  }
});

// Department analytics (admin only)
router.get(
  "/admin/department/:department",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { department } = req.params;
      const { days = 30 } = req.query;

      const analytics = await statsService.getDepartmentAnalytics(
        department,
        parseInt(days),
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error fetching department analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch department analytics",
        error: error.message,
      });
    }
  },
);

// Generate stats manually (admin only, for testing)
router.post("/admin/generate", [auth, adminAuth], async (req, res) => {
  try {
    const result = await statsService.generateDailyStats();

    res.json({
      success: true,
      message: "Daily statistics generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error generating statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate statistics",
      error: error.message,
    });
  }
});

// Get specific user stats (admin only)
router.get("/admin/user/:userId", [auth, adminAuth], async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const userStats = await statsService.getDashboardStats(
      userId,
      parseInt(days),
    );

    res.json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
      error: error.message,
    });
  }
});

// Platform analytics for all users (admin only)
router.get(
  "/admin/platform/:platform/analytics",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { platform } = req.params;
      const { days = 30 } = req.query;

      const validPlatforms = [
        "leetcode",
        "codechef",
        "codeforces",
        "hackerrank",
        "github",
      ];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({
          success: false,
          message: "Invalid platform",
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const analytics = await DailyStats.aggregate([
        { $match: { date: { $gte: startDate } } },
        {
          $group: {
            _id: "$date",
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [
                  { $gt: [`$platformStats.${platform}.scoreChange`, 0] },
                  1,
                  0,
                ],
              },
            },
            totalProblems: { $sum: `$platformStats.${platform}.totalSolved` },
            avgScore: { $avg: `$platformStats.${platform}.scopeScore` },
            totalScore: { $sum: `$platformStats.${platform}.scopeScore` },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        success: true,
        data: {
          platform,
          analytics,
          period: parseInt(days),
        },
      });
    } catch (error) {
      console.error("Error fetching platform analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch platform analytics",
        error: error.message,
      });
    }
  },
);

// Search users for stats (admin only)
router.get("/admin/search", [auth, adminAuth], async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { rollNumber: { $regex: query, $options: "i" } },
      ],
      userType: "user",
    })
      .select("name email rollNumber department graduatingYear")
      .limit(parseInt(limit));

    // Get latest stats for each user
    const userStats = await Promise.all(
      users.map(async (user) => {
        const latestStats = await DailyStats.getLatestUserStats(user._id);
        return {
          ...user.toObject(),
          latestStats: latestStats
            ? {
                totalScore: latestStats.scopeMetrics.totalScore,
                overallRank: latestStats.scopeMetrics.overallRank,
                totalProblems: latestStats.problemStats.totalProblems,
                lastUpdated: latestStats.date,
              }
            : null,
        };
      }),
    );

    res.json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
      error: error.message,
    });
  }
});

// Advanced Platform Analytics Routes (Admin/Teacher only)

// Get comprehensive platform analytics with multiple time periods
router.get("/admin/advanced-analytics", [auth, adminAuth], async (req, res) => {
  try {
    const { period = "weekly", limit = 5 } = req.query;

    // Validate period parameter
    const validPeriods = ["overall", "daily", "weekly", "monthly"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid period. Must be one of: overall, daily, weekly, monthly",
      });
    }

    // Get graduated years to exclude from analytics
    const config = await AcademicYearConfig.getConfig();
    const graduatedYears = config.yearMappings
      .filter((m) => m.academicYear === "Graduated")
      .map((m) => m.graduationYear);

    // Get user IDs of graduated students to exclude
    const graduatedUserIds = await User.find(
      { graduatingYear: { $in: graduatedYears } },
      { _id: 1 },
    ).lean();
    const graduatedUserIdsList = graduatedUserIds.map((u) => u._id);

    // Calculate date ranges based on period
    const now = new Date();
    let dateRanges = {};

    if (period === "daily") {
      // Last 7 days
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      dateRanges = {
        start: startDate,
        end: now,
        groupBy: { $dayOfWeek: "$date" },
        labels: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
      };
    } else if (period === "weekly") {
      // Last 4 weeks
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 27); // 4 weeks = 28 days
      dateRanges = {
        start: startDate,
        end: now,
        groupBy: { $week: "$date" },
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      };
    } else if (period === "monthly") {
      // Last 12 months
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 11);
      dateRanges = {
        start: startDate,
        end: now,
        groupBy: { $month: "$date" },
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
      };
    } else {
      // Overall - no date filter
      dateRanges = {
        start: null,
        end: null,
        groupBy: null,
        labels: ["Overall"],
      };
    }

    // Build base match query - EXCLUDE graduated students
    const baseMatch = {
      userId: { $nin: graduatedUserIdsList }, // Exclude graduated students
    };
    if (dateRanges.start && dateRanges.end) {
      baseMatch.date = { $gte: dateRanges.start, $lte: dateRanges.end };
    }

    // 1. Platform Scores Analytics (Bar Chart Data)
    const platformScoresAggregation = [
      { $match: baseMatch },
      {
        $group: {
          _id: period === "overall" ? null : dateRanges.groupBy,
          leetcodeAvgScore: { $avg: "$platformStats.leetcode.scopeScore" },
          leetcodeMaxScore: { $max: "$platformStats.leetcode.scopeScore" },
          codechefAvgScore: { $avg: "$platformStats.codechef.scopeScore" },
          codechefMaxScore: { $max: "$platformStats.codechef.scopeScore" },
          codeforcesAvgScore: { $avg: "$platformStats.codeforces.scopeScore" },
          codeforcesMaxScore: { $max: "$platformStats.codeforces.scopeScore" },
          hackerrankAvgScore: { $avg: "$platformStats.hackerrank.scopeScore" },
          hackerrankMaxScore: { $max: "$platformStats.hackerrank.scopeScore" },
          scopecodestatsAvgScore: {
            $sum: "$platformStats.scopecodestats.scopeScore",
          }, // TOTAL sum, not average
          scopecodestatsMaxScore: {
            $max: "$platformStats.scopecodestats.scopeScore",
          },
        },
      },
    ];

    // Add sort stage only for non-overall periods
    if (period !== "overall") {
      platformScoresAggregation.push({ $sort: { _id: 1 } });
    }

    // 2. Top Users Analytics
    const topUsersAggregation = [
      { $match: baseMatch },
      {
        $group: {
          _id: "$userId",
          name: { $first: "$userSnapshot.name" },
          department: { $first: "$userSnapshot.department" },
          totalScore: { $max: "$scopeMetrics.totalScore" },
          totalProblems: { $max: "$problemStats.totalProblems" },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: parseInt(limit) },
      // Lookup user details from User collection to ensure we have the correct name
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $addFields: {
          name: {
            $cond: {
              if: { $gt: [{ $size: "$userDetails" }, 0] },
              then: { $arrayElemAt: ["$userDetails.name", 0] },
              else: "$name",
            },
          },
          department: {
            $cond: {
              if: { $gt: [{ $size: "$userDetails" }, 0] },
              then: { $arrayElemAt: ["$userDetails.department", 0] },
              else: "$department",
            },
          },
        },
      },
      {
        $project: {
          userDetails: 0,
        },
      },
    ];

    // 3. Platform Scores Timeline (Line Chart Data)
    const scoresTimelineAggregation =
      period !== "overall"
        ? [
            { $match: baseMatch },
            {
              $group: {
                _id: dateRanges.groupBy,
                leetcodeScore: { $avg: "$platformStats.leetcode.scopeScore" },
                codechefScore: { $avg: "$platformStats.codechef.scopeScore" },
                codeforcesScore: {
                  $avg: "$platformStats.codeforces.scopeScore",
                },
                hackerrankScore: {
                  $avg: "$platformStats.hackerrank.scopeScore",
                },
                scopecodestatsScore: {
                  $sum: "$platformStats.scopecodestats.scopeScore",
                }, // TOTAL sum, not average
              },
            },
            { $sort: { _id: 1 } },
          ]
        : [];

    // 4. Platform Problems Timeline (Line Chart Data)
    const problemsTimelineAggregation =
      period !== "overall"
        ? [
            { $match: baseMatch },
            {
              $group: {
                _id: dateRanges.groupBy,
                leetcodeProblems: {
                  $avg: "$platformStats.leetcode.totalSolved",
                },
                codechefProblems: {
                  $avg: "$platformStats.codechef.totalSolved",
                },
                codeforcesProblems: {
                  $avg: "$platformStats.codeforces.totalSolved",
                },
                hackerrankProblems: {
                  $avg: "$platformStats.hackerrank.totalSolved",
                },
                scopecodestatsProblems: {
                  $sum: "$platformStats.scopecodestats.totalSolved",
                }, // TOTAL sum, not average
              },
            },
            { $sort: { _id: 1 } },
          ]
        : [];

    // 5. GitHub Commits Timeline (Line Chart Data) - Total commits, not average
    const githubCommitsTimelineAggregation =
      period !== "overall"
        ? [
            { $match: baseMatch },
            {
              $group: {
                _id: dateRanges.groupBy,
                totalCommits: { $sum: "$platformStats.github.totalCommits" },
                totalUsers: { $addToSet: "$userId" },
              },
            },
            { $sort: { _id: 1 } },
          ]
        : [];

    // 6. Contests Timeline (Line Chart Data) - Total contest changes over time
    const contestsTimelineAggregation =
      period !== "overall"
        ? [
            { $match: baseMatch },
            {
              $group: {
                _id: dateRanges.groupBy,
                leetcodeContests: {
                  $sum: "$platformStats.leetcode.contestsAttended",
                },
                codechefContests: {
                  $sum: "$platformStats.codechef.contestsRated",
                },
                codeforcesContests: {
                  $sum: "$platformStats.codeforces.contestsRated",
                },
                totalUsers: { $addToSet: "$userId" },
              },
            },
            { $sort: { _id: 1 } },
          ]
        : [];

    // Execute all aggregations
    const [
      platformScores,
      topUsers,
      scoresTimeline,
      problemsTimeline,
      githubCommitsTimeline,
      contestsTimeline,
    ] = await Promise.all([
      DailyStats.aggregate(platformScoresAggregation),
      DailyStats.aggregate(topUsersAggregation),
      period !== "overall"
        ? DailyStats.aggregate(scoresTimelineAggregation)
        : Promise.resolve([]),
      period !== "overall"
        ? DailyStats.aggregate(problemsTimelineAggregation)
        : Promise.resolve([]),
      period !== "overall"
        ? DailyStats.aggregate(githubCommitsTimelineAggregation)
        : Promise.resolve([]),
      period !== "overall"
        ? DailyStats.aggregate(contestsTimelineAggregation)
        : Promise.resolve([]),
    ]);

    // Format bar chart data
    const barChartData = platformScores.map((item) => ({
      period: period === "overall" ? "Overall" : item._id,
      leetcode: {
        avg: Math.round(item.leetcodeAvgScore || 0),
        max: Math.round(item.leetcodeMaxScore || 0),
      },
      codechef: {
        avg: Math.round(item.codechefAvgScore || 0),
        max: Math.round(item.codechefMaxScore || 0),
      },
      codeforces: {
        avg: Math.round(item.codeforcesAvgScore || 0),
        max: Math.round(item.codeforcesMaxScore || 0),
      },
      hackerrank: {
        avg: Math.round(item.hackerrankAvgScore || 0),
        max: Math.round(item.hackerrankMaxScore || 0),
      },
      scopecodestats: {
        avg: Math.round(item.scopecodestatsAvgScore || 0),
        max: Math.round(item.scopecodestatsMaxScore || 0),
      },
    }));

    // Format line chart data for scores
    const scoresLineData = scoresTimeline.map((item) => ({
      period: item._id,
      leetcode: Math.round(item.leetcodeScore || 0),
      codechef: Math.round(item.codechefScore || 0),
      codeforces: Math.round(item.codeforcesScore || 0),
      hackerrank: Math.round(item.hackerrankScore || 0),
      scopecodestats: Math.round(item.scopecodestatsScore || 0),
    }));

    // Format line chart data for problems
    const problemsLineData = problemsTimeline.map((item) => ({
      period: item._id,
      leetcode: Math.round(item.leetcodeProblems || 0),
      codechef: Math.round(item.codechefProblems || 0),
      codeforces: Math.round(item.codeforcesProblems || 0),
      hackerrank: Math.round(item.hackerrankProblems || 0),
      scopecodestats: Math.round(item.scopecodestatsProblems || 0),
    }));

    // Format line chart data for GitHub commits (total commits, not average)
    const githubCommitsLineData = githubCommitsTimeline.map((item) => ({
      period: item._id,
      totalCommits: item.totalCommits || 0,
      activeUsers: item.totalUsers.length || 0,
    }));

    // Format line chart data for contests (total contests attended/rated across all users)
    const contestsLineData = contestsTimeline.map((item) => ({
      period: item._id,
      leetcode: item.leetcodeContests || 0,
      codechef: item.codechefContests || 0,
      codeforces: item.codeforcesContests || 0,
      totalContests:
        (item.leetcodeContests || 0) +
        (item.codechefContests || 0) +
        (item.codeforcesContests || 0),
      activeUsers: item.totalUsers.length || 0,
    }));

    res.json({
      success: true,
      data: {
        period,
        labels: dateRanges.labels,
        barChart: barChartData,
        topUsers: topUsers.map((user) => ({
          id: user._id,
          name: user.name || "Unknown User",
          department: user.department || "No Department",
          totalScore: user.totalScore || 0,
          totalProblems: user.totalProblems || 0,
        })),
        scoresTimeline: scoresLineData,
        problemsTimeline: problemsLineData,
        githubCommitsTimeline: githubCommitsLineData,
        contestsTimeline: contestsLineData,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("Error fetching advanced analytics:", error);
    console.error("Period:", period);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advanced analytics",
      error: error.message,
    });
  }
});

// Get platform comparison overview (Admin/Teacher only)
router.get("/admin/platform-overview", [auth, adminAuth], async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get graduated years to exclude from analytics
    const config = await AcademicYearConfig.getConfig();
    const graduatedYears = config.yearMappings
      .filter((m) => m.academicYear === "Graduated")
      .map((m) => m.graduationYear);

    // Get user IDs of graduated students to exclude
    const graduatedUserIds = await User.find(
      { graduatingYear: { $in: graduatedYears } },
      { _id: 1 },
    ).lean();
    const graduatedUserIdsList = graduatedUserIds.map((u) => u._id);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const platformOverview = await DailyStats.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          userId: { $nin: graduatedUserIdsList }, // Exclude graduated students
        },
      },
      {
        $group: {
          _id: null,
          totalUsers: { $addToSet: "$userId" },
          platforms: {
            $push: {
              leetcode: {
                activeUsers: {
                  $cond: [
                    { $gt: ["$platformStats.leetcode.scopeScore", 0] },
                    1,
                    0,
                  ],
                },
                totalScore: "$platformStats.leetcode.scopeScore",
                totalProblems: "$platformStats.leetcode.totalSolved",
              },
              codechef: {
                activeUsers: {
                  $cond: [
                    { $gt: ["$platformStats.codechef.scopeScore", 0] },
                    1,
                    0,
                  ],
                },
                totalScore: "$platformStats.codechef.scopeScore",
                totalProblems: "$platformStats.codechef.totalSolved",
              },
              codeforces: {
                activeUsers: {
                  $cond: [
                    { $gt: ["$platformStats.codeforces.scopeScore", 0] },
                    1,
                    0,
                  ],
                },
                totalScore: "$platformStats.codeforces.scopeScore",
                totalProblems: "$platformStats.codeforces.totalSolved",
              },
              hackerrank: {
                activeUsers: {
                  $cond: [
                    { $gt: ["$platformStats.hackerrank.scopeScore", 0] },
                    1,
                    0,
                  ],
                },
                totalScore: "$platformStats.hackerrank.scopeScore",
                totalProblems: "$platformStats.hackerrank.totalSolved",
              },
            },
          },
        },
      },
    ]);

    const overview = platformOverview[0] || { totalUsers: [], platforms: [] };
    const totalUniqueUsers = overview.totalUsers.length;

    // Calculate platform statistics
    const platformStats = {
      leetcode: {
        activeUsers: 0,
        totalScore: 0,
        totalProblems: 0,
        avgScore: 0,
        avgProblems: 0,
      },
      codechef: {
        activeUsers: 0,
        totalScore: 0,
        totalProblems: 0,
        avgScore: 0,
        avgProblems: 0,
      },
      codeforces: {
        activeUsers: 0,
        totalScore: 0,
        totalProblems: 0,
        avgScore: 0,
        avgProblems: 0,
      },
      hackerrank: {
        activeUsers: 0,
        totalScore: 0,
        totalProblems: 0,
        avgScore: 0,
        avgProblems: 0,
      },
    };

    // Aggregate platform data
    overview.platforms.forEach((entry) => {
      Object.keys(platformStats).forEach((platform) => {
        const platformData = entry[platform];
        platformStats[platform].activeUsers += platformData.activeUsers;
        platformStats[platform].totalScore += platformData.totalScore || 0;
        platformStats[platform].totalProblems +=
          platformData.totalProblems || 0;
      });
    });

    // Calculate averages
    Object.keys(platformStats).forEach((platform) => {
      const stats = platformStats[platform];
      if (stats.activeUsers > 0) {
        stats.avgScore = Math.round(stats.totalScore / stats.activeUsers);
        stats.avgProblems = Math.round(stats.totalProblems / stats.activeUsers);
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers: totalUniqueUsers,
        platformStats,
        period: `${days} days`,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("Error fetching platform overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform overview",
      error: error.message,
    });
  }
});

module.exports = router;
