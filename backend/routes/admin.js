const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const router = express.Router();
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const adminOnly = require("../middleware/adminOnly");
const User = require("../models/User");
const Profile = require("../models/Profile");
const AcademicYearConfig = require("../models/AcademicYearConfig");
const {
  isAdminOrTeacher,
  isAdmin,
  isTeacher,
} = require("../utils/userHelpers");
const log = require("../utils/logger").scope("ADMIN");

// Courses and opportunities are managed in routes/adminCatalog.js.

// Admin Dashboard Statistics
router.get("/stats", [auth, adminAuth], async (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // Get graduated years to exclude from statistics
    const config = await AcademicYearConfig.getConfig();
    const graduatedYears = config.yearMappings
      .filter((m) => m.academicYear === "Graduated")
      .map((m) => m.graduationYear);

    // Summary statistics - EXCLUDE graduated students
    const totalUsers = (await User.countDocuments({
      graduatingYear: { $nin: graduatedYears }
    })) || 0;
    const activeUsers =
      (await User.countDocuments({ 
        lastActive: { $gte: oneWeekAgo },
        graduatingYear: { $nin: graduatedYears }
      })) || 0;

    // Add proper admin/teacher and regular user counts based on userType
    const adminCount =
      (await User.countDocuments({
        userType: { $in: ["admin", "teacher"] },
      })) || 0;
    const regularCount = (await User.countDocuments({ 
      userType: "user",
      graduatingYear: { $nin: graduatedYears }
    })) || 0;

    // Get top 5 users by total problems solved - EXCLUDE admin, teacher, and graduated users
    const topUsers = await User.aggregate([
      {
        $match: {
          userType: { $nin: ["admin", "teacher"] },
          graduatingYear: { $nin: graduatedYears },
        },
      },
      ...Profile.totalsLookupStages(),
      { $sort: { totalScore: -1 } },
      { $limit: 5 },
      { $project: { name: 1, totalScore: 1, department: 1 } },
    ]);

    // Get new user registrations over time
    const userGrowthData =
      (await User.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])) || [];

    // Platform-wise problems solved statistics
    const platformStats = await Profile.aggregate([
      {
        $group: {
          _id: "$platform",
          totalProblems: { $sum: { $ifNull: ["$problemsSolved", 0] } },
          userCount: { $count: {} },
          avgProblems: { $avg: { $ifNull: ["$problemsSolved", 0] } },
        },
      },
      {
        $project: {
          platform: "$_id",
          totalProblems: 1,
          userCount: 1,
          avgProblems: { $round: ["$avgProblems", 1] },
          _id: 0,
        },
      },
      { $sort: { totalProblems: -1 } },
    ]);

    // Weekly problems solved by platform
    const weeklyProblemsByPlatform = await Profile.aggregate([
      {
        $match: {
          lastUpdated: { $gte: oneWeekAgo },
        },
      },
      {
        $group: {
          _id: {
            platform: "$platform",
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$lastUpdated" },
            },
          },
          problemsSolved: { $sum: "$problemsSolved" },
        },
      },
      {
        $group: {
          _id: "$_id.platform",
          data: {
            $push: {
              date: "$_id.date",
              problemsSolved: "$problemsSolved",
            },
          },
        },
      },
      {
        $project: {
          platform: "$_id",
          data: 1,
          _id: 0,
        },
      },
    ]);

    // Monthly problems solved by platform
    const monthlyProblemsByPlatform = await Profile.aggregate([
      {
        $match: {
          lastUpdated: { $gte: threeMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            platform: "$platform",
            month: { $dateToString: { format: "%Y-%m", date: "$lastUpdated" } },
          },
          problemsSolved: { $sum: "$problemsSolved" },
        },
      },
      {
        $group: {
          _id: "$_id.platform",
          data: {
            $push: {
              month: "$_id.month",
              problemsSolved: "$problemsSolved",
            },
          },
        },
      },
      {
        $project: {
          platform: "$_id",
          data: 1,
          _id: 0,
        },
      },
    ]);

    // Yearly/All-time problems solved by platform
    const yearlyProblemsByPlatform = await Profile.aggregate([
      {
        $group: {
          _id: {
            platform: "$platform",
            month: { $dateToString: { format: "%Y-%m", date: "$lastUpdated" } },
          },
          problemsSolved: { $sum: "$problemsSolved" },
        },
      },
      {
        $group: {
          _id: "$_id.platform",
          data: {
            $push: {
              month: "$_id.month",
              problemsSolved: "$problemsSolved",
            },
          },
        },
      },
      {
        $project: {
          platform: "$_id",
          data: 1,
          _id: 0,
        },
      },
    ]);

    // Calculate total problems solved across all platforms
    const totalProblems = platformStats.reduce(
      (sum, platform) => sum + platform.totalProblems,
      0
    );

    // Department statistics - EXCLUDE graduated students
    const departmentStats = await User.aggregate([
      {
        $match: {
          department: { $exists: true, $ne: null, $ne: "" },
          graduatingYear: { $nin: graduatedYears }
        },
      },
      ...Profile.totalsLookupStages(),
      {
        $group: {
          _id: "$department",
          userCount: { $sum: 1 },
          avgScore: { $avg: "$totalScore" },
        },
      },
      {
        $project: {
          department: "$_id",
          userCount: 1,
          avgScore: { $round: ["$avgScore", 2] },
          _id: 0,
        },
      },
      { $sort: { userCount: -1 } },
    ]);

    // Overall platform engagement
    const overallPlatformEngagement = await Profile.aggregate([
      {
        $group: {
          _id: "$platform",
          userCount: { $count: {} },
        },
      },
      {
        $project: {
          platform: "$_id",
          userCount: 1,
          _id: 0,
        },
      },
      { $sort: { userCount: -1 } },
    ]);

    res.json({
      userStats: {
        totalUsers,
        activeUsers,
        adminUsers: adminCount,
        regularUsers: regularCount,
        topUsers,
        userGrowthData: userGrowthData.map((item) => ({
          month: item._id,
          count: item.count,
        })),
      },
      problemsStats: {
        totalProblems,
        platformStats,
        weeklyProblemsByPlatform,
        monthlyProblemsByPlatform,
        yearlyProblemsByPlatform,
      },
      departmentStats,
      platformEngagement: overallPlatformEngagement,
    });
  } catch (error) {
    log.error("Error fetching admin stats:", error);
    res.status(500).json({
      message: "Error fetching admin statistics",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Get detailed problems solved by platform
router.get(
  "/problems-by-platform/:platform",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { platform } = req.params;
      const { timeframe } = req.query; // 'weekly', 'monthly', 'all'

      let timeFilter = {};
      const now = new Date();

      if (timeframe === "weekly") {
        timeFilter = {
          lastUpdated: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
        };
      } else if (timeframe === "monthly") {
        timeFilter = {
          lastUpdated: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
        };
      }

      const platformQuery = platform !== "all" ? { platform } : {};

      const problemsData = await Profile.aggregate([
        {
          $match: {
            ...platformQuery,
            ...timeFilter,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            username: 1,
            problemsSolved: 1,
            platform: 1,
            lastUpdated: 1,
            userName: "$user.name",
            department: "$user.department",
          },
        },
        {
          $sort: { problemsSolved: -1 },
        },
      ]);

      res.json({
        platform: platform,
        timeframe: timeframe || "all",
        data: problemsData,
      });
    } catch (error) {
      log.error("Error fetching platform problems data:", error);
      res.status(500).json({
        message: "Error fetching platform problems data",
        error: error.message,
      });
    }
  }
);

// User registration statistics
router.get("/user-registration-stats", [auth, adminAuth], async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

    // Daily registrations (last 30 days)
    const dailyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          adminCount: {
            $sum: {
              $cond: [{ $in: ["$userType", ["admin", "teacher"]] }, 1, 0],
            },
          },
          regularCount: {
            $sum: { $cond: [{ $eq: ["$userType", "user"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Weekly registrations (last 12 weeks)
    const weeklyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
          },
          count: { $sum: 1 },
          adminCount: {
            $sum: {
              $cond: [{ $in: ["$userType", ["admin", "teacher"]] }, 1, 0],
            },
          },
          regularCount: {
            $sum: { $cond: [{ $eq: ["$userType", "user"] }, 1, 0] },
          },
          // Store a sample date from this week for display purposes
          sampleDate: { $first: "$createdAt" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          week: "$_id.week",
          count: 1,
          adminCount: 1,
          regularCount: 1,
          sampleDate: 1,
          weekLabel: {
            $concat: [
              "Week ",
              { $toString: "$_id.week" },
              ", ",
              { $toString: "$_id.year" },
            ],
          },
        },
      },
      { $sort: { year: 1, week: 1 } },
    ]);

    // Monthly registrations (last 12 months)
    const monthlyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: oneYearAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          adminCount: {
            $sum: {
              $cond: [{ $in: ["$userType", ["admin", "teacher"]] }, 1, 0],
            },
          },
          regularCount: {
            $sum: { $cond: [{ $eq: ["$userType", "user"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          count: 1,
          adminCount: 1,
          regularCount: 1,
          monthLabel: {
            $let: {
              vars: {
                monthsInString: [
                  "",
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
              },
              in: {
                $concat: [
                  { $arrayElemAt: ["$$monthsInString", "$_id.month"] },
                  " ",
                  { $toString: "$_id.year" },
                ],
              },
            },
          },
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    // Get department-wise user registration
    const departmentRegistrations = await User.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          adminCount: {
            $sum: {
              $cond: [{ $in: ["$userType", ["admin", "teacher"]] }, 1, 0],
            },
          },
          regularCount: {
            $sum: { $cond: [{ $eq: ["$userType", "user"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          department: "$_id",
          count: 1,
          adminCount: 1,
          regularCount: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Overall summary
    const summary = {
      totalUsers: await User.countDocuments(),
      admins: await User.countDocuments({ userType: "admin" }),
      regularUsers: await User.countDocuments({ userType: "user" }),
      today: await User.countDocuments({
        createdAt: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
        },
      }),
      thisWeek: await User.countDocuments({
        createdAt: {
          $gte: new Date(now - now.getDay() * 24 * 60 * 60 * 1000),
        },
      }),
      thisMonth: await User.countDocuments({
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      }),
    };

    res.json({
      summary,
      dailyRegistrations,
      weeklyRegistrations,
      monthlyRegistrations,
      departmentRegistrations,
    });
  } catch (error) {
    log.error("Error fetching user registration stats:", error);
    res.status(500).json({
      message: "Error fetching user registration statistics",
      error: error.message,
    });
  }
});

// Get department analytics
router.get("/department-analytics", [auth, adminAuth], async (req, res) => {
  try {
    // Get graduated years to exclude from analytics
    const config = await AcademicYearConfig.getConfig();
    const graduatedYears = config.yearMappings
      .filter((m) => m.academicYear === "Graduated")
      .map((m) => m.graduationYear);

    // Department statistics with platform breakdown - EXCLUDE graduated students
    const departmentPlatformBreakdown = await User.aggregate([
      {
        $match: {
          department: { $exists: true, $ne: null, $ne: "" },
          graduatingYear: { $nin: graduatedYears }
        },
      },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "userProfiles",
        },
      },
      {
        $unwind: {
          path: "$userProfiles",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            department: "$department",
            platform: "$userProfiles.platform",
          },
          totalProblems: { $sum: "$userProfiles.problemsSolved" },
          userCount: { $addToSet: "$_id" },
        },
      },
      {
        $group: {
          _id: "$_id.department",
          platforms: {
            $push: {
              platform: "$_id.platform",
              totalProblems: "$totalProblems",
              userCount: { $size: "$userCount" },
            },
          },
          totalUsers: { $addToSet: "$userCount" },
        },
      },
      {
        $project: {
          department: "$_id",
          platforms: 1,
          totalUsers: {
            $size: {
              $reduce: {
                input: "$totalUsers",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
          },
          _id: 0,
        },
      },
    ]);

    // Department performance metrics - EXCLUDE graduated students
    const departmentPerformance = await User.aggregate([
      {
        $match: {
          department: { $exists: true, $ne: null, $ne: "" },
          graduatingYear: { $nin: graduatedYears }
        },
      },
      ...Profile.totalsLookupStages(),
      {
        $group: {
          _id: "$department",
          avgScore: { $avg: "$totalScore" },
          maxScore: { $max: "$totalScore" },
          userCount: { $sum: 1 },
        },
      },
      {
        $sort: { avgScore: -1 },
      },
      {
        $project: {
          department: "$_id",
          avgScore: { $round: ["$avgScore", 2] },
          maxScore: 1,
          userCount: 1,
          _id: 0,
        },
      },
    ]);

    res.json({
      departmentPlatformBreakdown,
      departmentPerformance,
    });
  } catch (error) {
    log.error("Error fetching department analytics:", error);
    res.status(500).json({
      message: "Error fetching department analytics",
      error: error.message,
    });
  }
});

// ===== USER MANAGEMENT ROUTES =====
// Routes for managing user roles and permissions (Admin only)

/**
 * GET /api/admin/manage-users
 * Get all users for user management interface
 * Admin only - Returns user list with essential details for role management
 */
router.get("/manage-users", [auth, adminOnly], async (req, res) => {
  try {
    log.debug(`Admin ${req.user.id} requesting user management data`);

    // Get all users with essential fields only
    const users = await User.find(
      {},
      {
        name: 1,
        email: 1,
        rollNumber: 1,
        userType: 1,
        department: 1,
        section: 1,
        graduatingYear: 1,
        profilePicture: 1,
        createdAt: 1,
        lastActive: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();
    const summaries = await Profile.getSummaries(users.map((u) => u._id));
    users.forEach((u) => {
      u.totalScore = summaries.get(String(u._id))?.totalScore || 0;
    });

    // Get summary statistics
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.userType === "admin").length;
    const teacherCount = users.filter((u) => u.userType === "teacher").length;
    const userCount = users.filter((u) => u.userType === "user").length;

    log.debug(
      `Returning ${totalUsers} users for management (${adminCount} admins, ${teacherCount} teachers, ${userCount} users)`
    );

    res.json({
      success: true,
      users: users,
      summary: {
        totalUsers,
        adminCount,
        teacherCount,
        userCount,
        departmentBreakdown: users.reduce((acc, user) => {
          acc[user.department] = (acc[user.department] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    log.error("Error fetching users for management:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users for management",
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/change-user-type
 * Change a user's role/type (user, teacher, admin)
 * Admin only - Updates user type with validation and audit logging
 */
router.put("/change-user-type", [auth, adminOnly], async (req, res) => {
  try {
    const { userId, newUserType } = req.body;

    // Validation
    if (!userId || !newUserType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId and newUserType",
      });
    }

    // Validate user type
    const validUserTypes = ["user", "teacher", "admin"];
    if (!validUserTypes.includes(newUserType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type. Must be one of: user, teacher, admin",
      });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent self-modification
    if (userId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Cannot change your own user type",
      });
    }

    // Store old user type for logging
    const oldUserType = targetUser.userType;

    // Check if change is actually needed
    if (oldUserType === newUserType) {
      return res.json({
        success: true,
        message: "User type unchanged",
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          userType: targetUser.userType,
        },
      });
    }

    // Additional validation: Prevent creating multiple super admins if needed
    if (newUserType === "admin") {
      const adminCount = await User.countDocuments({ userType: "admin" });
      log.debug(
        `Current admin count: ${adminCount}, promoting ${targetUser.name} to admin`
      );
    }

    // Update user type
    targetUser.userType = newUserType;
    targetUser.lastActive = new Date(); // Update last active time
    await targetUser.save();

    log.debug(
      `Admin ${req.user.email} changed user ${targetUser.name} (${targetUser.email}) from ${oldUserType} to ${newUserType}`
    );

    // Log this action for audit purposes (you might want to create an audit log model)
    log.debug(`USER TYPE CHANGE AUDIT LOG:`, {
      performedBy: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
      },
      targetUser: {
        id: targetUser._id,
        email: targetUser.email,
        name: targetUser.name,
      },
      change: {
        from: oldUserType,
        to: newUserType,
      },
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({
      success: true,
      message: `Successfully changed ${targetUser.name}'s role from ${oldUserType} to ${newUserType}`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        rollNumber: targetUser.rollNumber,
        userType: targetUser.userType,
        department: targetUser.department,
      },
      change: {
        from: oldUserType,
        to: newUserType,
        performedBy: req.user.email,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    log.error("Error changing user type:", error);
    res.status(500).json({
      success: false,
      message: "Error changing user type",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/user-management-stats
 * Get statistics for user management dashboard
 * Admin only - Returns user type distribution and recent changes
 */
router.get("/user-management-stats", [auth, adminOnly], async (req, res) => {
  try {
    // Get user type distribution
    const userTypeStats = await User.aggregate([
      ...Profile.totalsLookupStages(),
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 },
          avgScore: { $avg: "$totalScore" },
          recentUsers: {
            $push: {
              $cond: [
                {
                  $gte: [
                    "$createdAt",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  ],
                },
                {
                  name: "$name",
                  email: "$email",
                  createdAt: "$createdAt",
                },
                "$$REMOVE",
              ],
            },
          },
        },
      },
      {
        $project: {
          userType: "$_id",
          count: 1,
          avgScore: { $round: ["$avgScore", 2] },
          recentUsers: { $slice: ["$recentUsers", 5] }, // Last 5 recent users
          _id: 0,
        },
      },
    ]);

    // Get department-wise user type distribution
    const departmentStats = await User.aggregate([
      {
        $group: {
          _id: {
            department: "$department",
            userType: "$userType",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.department",
          userTypes: {
            $push: {
              type: "$_id.userType",
              count: "$count",
            },
          },
          totalUsers: { $sum: "$count" },
        },
      },
      {
        $project: {
          department: "$_id",
          userTypes: 1,
          totalUsers: 1,
          _id: 0,
        },
      },
      { $sort: { totalUsers: -1 } },
    ]);

    // Get recent activity (users created in last 30 days)
    const recentActivity = await User.find(
      {
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      {
        name: 1,
        email: 1,
        userType: 1,
        department: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      userTypeStats,
      departmentStats,
      recentActivity,
      summary: {
        totalUsers: await User.countDocuments(),
        admins: await User.countDocuments({ userType: "admin" }),
        teachers: await User.countDocuments({ userType: "teacher" }),
        users: await User.countDocuments({ userType: "user" }),
        recentSignups: recentActivity.length,
      },
    });
  } catch (error) {
    log.error("Error fetching user management stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user management statistics",
      error: error.message,
    });
  }
});

// ===== ACADEMIC YEAR CONFIGURATION ENDPOINTS =====

// Get academic year configuration
router.get("/academic-year-config", [auth, adminAuth], async (req, res) => {
  try {
    const AcademicYearConfig = require("../models/AcademicYearConfig");
    const config = await AcademicYearConfig.getConfig();

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    log.error("Error fetching academic year config:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching academic year configuration",
      error: error.message,
    });
  }
});

// Update academic year configuration
router.put("/academic-year-config", [auth, adminAuth], async (req, res) => {
  try {
    const AcademicYearConfig = require("../models/AcademicYearConfig");
    const { academicYearStartMonth, yearMappings } = req.body;

    let config = await AcademicYearConfig.getConfig();

    if (academicYearStartMonth !== undefined) {
      config.academicYearStartMonth = academicYearStartMonth;
    }

    if (yearMappings && Array.isArray(yearMappings)) {
      config.yearMappings = yearMappings;
    }

    config.lastUpdatedBy = req.user.id;
    config.lastUpdatedAt = new Date();

    await config.save();

    res.json({
      success: true,
      message: "Academic year configuration updated successfully",
      config,
    });
  } catch (error) {
    log.error("Error updating academic year config:", error);
    res.status(500).json({
      success: false,
      message: "Error updating academic year configuration",
      error: error.message,
    });
  }
});

// Auto-generate year mappings based on current date
router.post(
  "/academic-year-config/auto-generate",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const AcademicYearConfig = require("../models/AcademicYearConfig");
      const config = await AcademicYearConfig.getConfig();

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      // Determine current academic year based on configured start month
      let academicYearStart;
      if (currentMonth >= config.academicYearStartMonth) {
        academicYearStart = currentYear;
      } else {
        academicYearStart = currentYear - 1;
      }

      // Generate mappings
      const newMappings = [
        {
          graduationYear: academicYearStart + 4,
          academicYear: "First Year",
          displayName: "I Year",
        },
        {
          graduationYear: academicYearStart + 3,
          academicYear: "Second Year",
          displayName: "II Year",
        },
        {
          graduationYear: academicYearStart + 2,
          academicYear: "Third Year",
          displayName: "III Year",
        },
        {
          graduationYear: academicYearStart + 1,
          academicYear: "Fourth Year",
          displayName: "IV Year",
        },
      ];

      // Add graduated years (last 5 years)
      for (let i = 0; i <= 5; i++) {
        newMappings.push({
          graduationYear: academicYearStart - i,
          academicYear: "Graduated",
          displayName: "Graduated",
        });
      }

      config.yearMappings = newMappings;
      config.currentAcademicYear = `${academicYearStart}-${
        academicYearStart + 1
      }`;
      config.lastUpdatedBy = req.user.id;
      config.lastUpdatedAt = new Date();

      await config.save();

      res.json({
        success: true,
        message: "Year mappings auto-generated successfully",
        config,
      });
    } catch (error) {
      log.error("Error auto-generating year mappings:", error);
      res.status(500).json({
        success: false,
        message: "Error auto-generating year mappings",
        error: error.message,
      });
    }
  }
);

module.exports = router;
