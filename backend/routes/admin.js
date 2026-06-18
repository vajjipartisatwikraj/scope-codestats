const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const router = express.Router();
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Course = require("../models/Course");
const Opportunity = require("../models/Opportunity");
const User = require("../models/User");
const Profile = require("../models/Profile");
const ProfileSyncHistory = require("../models/ProfileSyncHistory");
const AcademicYearConfig = require("../models/AcademicYearConfig");
const mongoose = require("mongoose");
const updateAllUserProfiles = require("../scripts/updateUserProfiles");
const {
  isAdminOrTeacher,
  isAdmin,
  isTeacher,
} = require("../utils/userHelpers");

// Course Management Routes
router.get("/courses", [auth, adminAuth], async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/courses", [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      description,
      courseLink,
      image,
      instructor,
      level,
      category,
      duration,
      topics,
      prerequisites,
      resources,
      isActive,
    } = req.body;

    if (!title || !description || !courseLink) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["title", "description", "courseLink"],
      });
    }

    const course = new Course({
      title,
      description,
      courseLink,
      image,
      instructor,
      level,
      category,
      duration,
      topics,
      prerequisites,
      resources,
      isActive,
      createdBy: req.user.id,
    });

    await course.save();
    res.status(201).json(course);
  } catch (err) {
    console.error("Error creating course:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/courses/:id", [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      description,
      courseLink,
      image,
      instructor,
      level,
      category,
      duration,
      topics,
      prerequisites,
      resources,
      isActive,
    } = req.body;

    if (!title || !description || !courseLink) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["title", "description", "courseLink"],
      });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        courseLink,
        image,
        instructor,
        level,
        category,
        duration,
        topics,
        prerequisites,
        resources,
        isActive,
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/courses/:id", [auth, adminAuth], async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Opportunity Management Routes
router.get("/opportunities", [auth, adminAuth], async (req, res) => {
  try {
    const opportunities = await Opportunity.find();
    res.json(opportunities);
  } catch (err) {
    console.error("Error fetching opportunities:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/opportunities", [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      description,
      link,
      deadline,
      organizer,
      status,
      category,
      difficulty,
      registrationOpen,
      location,
      tags,
      prize,
      eligibility,
      applicationLink,
      image,
      organizerProfileUrl,
      organizerImageUrl,
    } = req.body;

    console.log("Received tags in create request:", tags);

    if (!title || !description || !link || !deadline || !organizer || !status) {
      return res.status(400).json({
        message: "Missing required fields",
        required: [
          "title",
          "description",
          "link",
          "deadline",
          "organizer",
          "status",
        ],
      });
    }

    // Format tags properly
    const formattedTags = Array.isArray(tags) ? tags : [];
    console.log("Formatted tags for creation:", formattedTags);

    const opportunity = new Opportunity({
      title,
      description,
      link,
      deadline,
      organizer,
      status,
      category,
      difficulty,
      registrationOpen,
      location,
      tags: formattedTags,
      prize,
      eligibility,
      applicationLink,
      createdBy: req.user.id,
      image: image || "",
      organizerProfileUrl: organizerProfileUrl || "",
      organizerImageUrl: organizerImageUrl || "",
    });

    console.log("Creating opportunity with data:", opportunity);
    await opportunity.save();
    res.status(201).json(opportunity);
  } catch (err) {
    console.error("Error creating opportunity:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/opportunities/:id", [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      description,
      link,
      deadline,
      organizer,
      status,
      category,
      difficulty,
      registrationOpen,
      location,
      tags,
      prize,
      eligibility,
      applicationLink,
      image,
      organizerProfileUrl,
      organizerImageUrl,
    } = req.body;

    console.log("Received tags in update request:", tags);

    if (!title || !description || !link || !deadline || !organizer || !status) {
      return res.status(400).json({
        message: "Missing required fields",
        required: [
          "title",
          "description",
          "link",
          "deadline",
          "organizer",
          "status",
        ],
      });
    }

    // Create an update object with all provided fields
    const updateFields = {
      title,
      description,
      link,
      deadline,
      organizer,
      status,
      applicationLink: applicationLink || link,
    };

    // Add optional fields if provided
    if (category) updateFields.category = category;
    if (difficulty) updateFields.difficulty = difficulty;
    if (registrationOpen !== undefined)
      updateFields.registrationOpen = registrationOpen;
    if (location) updateFields.location = location;
    if (tags) updateFields.tags = Array.isArray(tags) ? tags : []; // Ensure tags is an array
    if (prize) updateFields.prize = prize;
    if (eligibility) updateFields.eligibility = eligibility;
    if (image) updateFields.image = image;
    if (organizerProfileUrl !== undefined)
      updateFields.organizerProfileUrl = organizerProfileUrl;
    if (organizerImageUrl !== undefined)
      updateFields.organizerImageUrl = organizerImageUrl;

    console.log("Update fields for opportunity:", updateFields);

    const opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    console.log("Updated opportunity:", opportunity);
    res.json(opportunity);
  } catch (err) {
    console.error("Error updating opportunity:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/opportunities/:id", [auth, adminAuth], async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    res.json({ message: "Opportunity deleted successfully" });
  } catch (err) {
    console.error("Error deleting opportunity:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

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
    const topUsers = await User.find({
      userType: { $nin: ["admin", "teacher"] },
      graduatingYear: { $nin: graduatedYears }
    })
      .sort({ totalScore: -1 })
      .limit(5)
      .select("name totalScore department")
      .lean();

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
    console.error("Error fetching admin stats:", error);
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
      console.error("Error fetching platform problems data:", error);
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
    console.error("Error fetching user registration stats:", error);
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
    console.error("Error fetching department analytics:", error);
    res.status(500).json({
      message: "Error fetching department analytics",
      error: error.message,
    });
  }
});

// Manual profile synchronization for admin
router.post("/sync-profiles", [auth, adminAuth], async (req, res) => {
  try {
    console.log(`Admin ${req.user.id} initiating manual profile sync`);

    // Create ProfileSyncHistory document
    const syncHistory = new ProfileSyncHistory({
      status: "running",
      jobType: "manual",
      startTime: new Date(),
      currentPhase: "initializing",
      triggeredBy: req.user.id,
    });

    await syncHistory.save();
    const syncId = syncHistory._id.toString();

    console.log(`Created ProfileSyncHistory document with ID: ${syncId}`);

    // Create an abort controller for cancellation
    const abortController = new AbortController();

    // Create a shared state object for tracking progress
    const progressState = {
      totalUsers: 0,
      processedUsers: 0,
      updatedProfiles: 0,
      failedProfiles: 0,
      totalProfiles: 0,
      inProgress: true,
      error: null,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      // Add flag to indicate this job is initiated from admin panel
      isAdminInitiated: true,
      // Store in global state so it can be accessed by the status endpoint
      id: syncId,
      cancelled: false,
      completedTime: null,
      // Store the abort controller for cancellation
      abortController: abortController,
      // Store reference to the sync history document
      syncHistoryId: syncId,
    };

    // Store in global app state for status check endpoint
    if (!req.app.locals.syncProgress) {
      req.app.locals.syncProgress = {};
    }
    req.app.locals.syncProgress[progressState.id] = progressState;

    // Start the profile update process in the background
    console.log(
      `Admin ${req.user.id} initiated manual profile sync with job ID: ${progressState.id}`
    );

    // Set up a timeout to clear the progress state after 24 hours to prevent memory leaks
    const cleanupTimeout = setTimeout(() => {
      if (
        req.app.locals.syncProgress &&
        req.app.locals.syncProgress[progressState.id]
      ) {
        console.log(
          `Cleaning up expired sync job ${progressState.id} after 24 hours`
        );
        delete req.app.locals.syncProgress[progressState.id];
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Make the timeout unref() so it doesn't keep the process alive if it's the only thing left
    if (cleanupTimeout.unref) {
      cleanupTimeout.unref();
    }

    // Start profile update in background with proper error handling
    try {
      console.log(
        `Starting profile update process for job ${progressState.id}`
      );

      // Pass the abort controller to the update function
      const updatePromise = updateAllUserProfiles(
        progressState,
        abortController.signal
      );

      updatePromise
        .then(async (result) => {
          progressState.inProgress = false;
          progressState.completedTime = Date.now();
          progressState.result = result;
          console.log(
            `Profile sync ${progressState.id} completed successfully`
          );

          // Update ProfileSyncHistory document
          try {
            const syncDoc = await ProfileSyncHistory.findById(syncId);
            if (syncDoc) {
              syncDoc.status = progressState.cancelled
                ? "cancelled"
                : "completed";
              syncDoc.endTime = new Date();
              syncDoc.calculateDuration();
              syncDoc.totalUsers = progressState.totalUsers || 0;
              syncDoc.processedUsers = progressState.processedUsers || 0;
              syncDoc.successfulUsers =
                (progressState.totalUsers || 0) -
                (progressState.failedUsers || 0);
              syncDoc.failedUsers = progressState.failedUsers || 0;
              syncDoc.totalProfiles = progressState.totalProfiles || 0;
              syncDoc.updatedProfiles = progressState.updatedProfiles || 0;
              syncDoc.failedProfiles = progressState.failedProfiles || 0;
              syncDoc.currentPhase = progressState.cancelled
                ? "cancelled"
                : "completed";
              syncDoc.progress = 100;
              syncDoc.cancelled = progressState.cancelled || false;

              // Add failed profile details from progressState
              if (
                progressState.failedProfilesList &&
                Array.isArray(progressState.failedProfilesList)
              ) {
                syncDoc.failedProfileDetails =
                  progressState.failedProfilesList.map((fp) => ({
                    userId: fp.userId,
                    userName: fp.userName,
                    userEmail: fp.userEmail,
                    userDepartment: fp.userDepartment || "N/A",
                    userSection: fp.userSection || "N/A",
                    userYear: fp.userYear || "N/A",
                    platform: fp.platform,
                    platformUsername: fp.platformUsername,
                    error: fp.error,
                    errorCode: fp.errorCode,
                    timestamp: fp.timestamp
                      ? new Date(fp.timestamp)
                      : new Date(),
                  }));
                console.log(
                  `Saved ${syncDoc.failedProfileDetails.length} failed profile details to database`
                );
              }

              // Add summary
              syncDoc.summary = `Processed ${progressState.processedUsers}/${progressState.totalUsers} users. Updated ${progressState.updatedProfiles} profiles, ${progressState.failedProfiles} failed.`;

              await syncDoc.save();
              console.log(
                `Updated ProfileSyncHistory document ${syncId} with completion data`
              );

              // Cleanup old records (keep only last 3)
              await ProfileSyncHistory.cleanupOldRecords();
            }
          } catch (dbError) {
            console.error(
              `Error updating ProfileSyncHistory on completion:`,
              dbError
            );
          }

          // Once completed, clean up the abort controller reference to avoid memory leaks
          if (progressState.abortController) {
            delete progressState.abortController;
          }
        })
        .catch(async (err) => {
          progressState.inProgress = false;
          progressState.error = err.message || "Unknown error occurred";
          progressState.completedTime = Date.now();
          console.error(
            `Profile sync ${progressState.id} failed:`,
            err.message
          );

          // Update ProfileSyncHistory document with error
          try {
            const syncDoc = await ProfileSyncHistory.findById(syncId);
            if (syncDoc) {
              syncDoc.status = "failed";
              syncDoc.endTime = new Date();
              syncDoc.calculateDuration();
              syncDoc.totalUsers = progressState.totalUsers || 0;
              syncDoc.processedUsers = progressState.processedUsers || 0;
              syncDoc.currentPhase = "completed";
              syncDoc.errorLog.push({
                phase: "sync_completion",
                message: err.message || "Unknown error occurred",
                timestamp: new Date(),
              });

              await syncDoc.save();
              console.log(
                `Updated ProfileSyncHistory document ${syncId} with error data`
              );
            }
          } catch (dbError) {
            console.error(
              `Error updating ProfileSyncHistory on error:`,
              dbError
            );
          }

          // Clean up the abort controller reference on error
          if (progressState.abortController) {
            delete progressState.abortController;
          }
        });
    } catch (syncError) {
      // Handle any immediate errors in starting the sync
      progressState.inProgress = false;
      progressState.error = syncError.message || "Failed to start sync";
      progressState.completedTime = Date.now();
      console.error(
        `Failed to start profile sync ${progressState.id}:`,
        syncError
      );

      // Update ProfileSyncHistory document with immediate error
      try {
        const syncDoc = await ProfileSyncHistory.findById(syncId);
        if (syncDoc) {
          syncDoc.status = "failed";
          syncDoc.endTime = new Date();
          syncDoc.calculateDuration();
          syncDoc.errorLog.push({
            phase: "initialization",
            message: syncError.message || "Failed to start sync",
            timestamp: new Date(),
          });
          await syncDoc.save();
        }
      } catch (dbError) {
        console.error(
          `Error updating ProfileSyncHistory on immediate error:`,
          dbError
        );
      }

      // Clean up the abort controller reference on immediate error
      if (progressState.abortController) {
        delete progressState.abortController;
      }
    }

    // Immediately return to client with job ID
    console.log(`Returning sync job ID ${progressState.id} to client`);
    res.json({
      success: true,
      message: "Profile synchronization started",
      syncId: progressState.id,
    });
  } catch (err) {
    console.error("Error starting profile sync:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Check progress of profile synchronization
router.get("/sync-status/:syncId", [auth, adminAuth], async (req, res) => {
  try {
    const { syncId } = req.params;
    console.log(`Received sync-status request for job ${syncId}`);

    // Check MongoDB connection and reconnect if needed
    if (mongoose.connection.readyState !== 1) {
      // 1 = connected
      console.log(
        "MongoDB connection check in sync-status: Disconnected. Reconnecting..."
      );
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Successfully reconnected to MongoDB in sync-status");
      } catch (mongoError) {
        console.error(
          "Failed to reconnect to MongoDB in sync-status:",
          mongoError
        );
      }
    }

    // Try to get from database first
    let dbSync = null;
    try {
      dbSync = await ProfileSyncHistory.findById(syncId)
        .populate("triggeredBy", "name email")
        .lean();
    } catch (dbError) {
      console.error(`Error fetching sync from database:`, dbError);
    }

    // Get progress state from memory
    const progressState =
      req.app.locals.syncProgress && req.app.locals.syncProgress[syncId];

    if (!progressState && !dbSync) {
      console.log(`Sync job ${syncId} not found in memory or database`);
      return res.status(404).json({ message: "Sync job not found" });
    }

    // If we have database record, use it as base
    if (dbSync && !progressState) {
      // Sync completed and cleaned from memory, return DB data
      console.log(
        `Returning completed sync data from database for job ${syncId}`
      );
      return res.json({
        id: syncId,
        inProgress: false,
        progress: dbSync.progress || 100,
        totalUsers: dbSync.totalUsers || 0,
        processedUsers: dbSync.processedUsers || 0,
        updatedProfiles: dbSync.updatedProfiles || 0,
        failedProfiles: dbSync.failedProfiles || 0,
        totalProfiles: dbSync.totalProfiles || 0,
        failedProfilesList: dbSync.failedProfileDetails || [],
        elapsedTime: dbSync.duration || 0,
        error:
          dbSync.errorLog && dbSync.errorLog.length > 0
            ? dbSync.errorLog[dbSync.errorLog.length - 1].message
            : null,
        cancelled: dbSync.cancelled || false,
        status: dbSync.status,
        startTime: dbSync.startTime,
        completedTime: dbSync.endTime,
        platformStats: dbSync.platformStats || [],
      });
    }

    // Check for stalled processes (no updates for over 2 minutes but still marked as in progress)
    const now = Date.now();
    if (
      progressState.inProgress &&
      progressState.lastUpdated &&
      now - progressState.lastUpdated > 120000
    ) {
      // 2 minutes
      console.log(
        `Sync job ${syncId} appears to be stalled (no updates for ${Math.round(
          (now - progressState.lastUpdated) / 1000
        )} seconds)`
      );

      // Check if the process is actually stalled or if it's completed but failed to update
      if (
        progressState.processedUsers > 0 &&
        progressState.totalUsers > 0 &&
        progressState.processedUsers >= progressState.totalUsers
      ) {
        // If all users have been processed, mark as complete
        console.log(
          `All ${progressState.processedUsers}/${progressState.totalUsers} users processed - marking sync job ${syncId} as complete`
        );
        progressState.inProgress = false;
        progressState.completedTime = progressState.lastUpdated || now;
      } else {
        // Log warning but continue - we don't automatically mark as failed
        console.log(
          `WARNING: Sync job ${syncId} may be stalled at ${progressState.processedUsers}/${progressState.totalUsers} users`
        );
      }
    }

    // If sync is already complete, add a cache control header to prevent excessive polling
    if (!progressState.inProgress) {
      // Add cache control header (1 hour) for completed sync jobs
      res.set("Cache-Control", "private, max-age=3600");
      console.log(
        `Sync job ${syncId} is complete - adding cache header to prevent excessive polling`
      );
    }

    // Calculate progress percentage
    let progress = 0;
    if (progressState.totalUsers > 0) {
      progress = Math.floor(
        (progressState.processedUsers / progressState.totalUsers) * 100
      );
    }

    // Calculate elapsed time
    const elapsedSeconds = Math.floor(
      (Date.now() - progressState.startTime) / 1000
    );

    console.log(
      `Returning sync status for job ${syncId}: Progress ${progress}%, Users ${progressState.processedUsers}/${progressState.totalUsers}`
    );

    // Return status (combine memory state with DB data if available)
    res.json({
      id: syncId,
      inProgress: progressState.inProgress,
      progress: progress,
      totalUsers: progressState.totalUsers,
      processedUsers: progressState.processedUsers,
      updatedProfiles: progressState.updatedProfiles,
      failedProfiles: progressState.failedProfiles,
      totalProfiles: progressState.totalProfiles,
      failedProfilesList: progressState.failedProfilesList || [],
      elapsedTime: elapsedSeconds,
      error: progressState.error,
      cancelled: progressState.cancelled || false,
      lastUpdated: progressState.lastUpdated
        ? new Date(progressState.lastUpdated).toISOString()
        : null,
      startTime: new Date(progressState.startTime).toISOString(),
      completedTime: progressState.completedTime
        ? new Date(progressState.completedTime).toISOString()
        : null,
      platformStats: dbSync?.platformStats || [],
    });
  } catch (err) {
    console.error("Error checking sync status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Cancel an ongoing profile synchronization
router.post("/cancel-sync/:syncId", [auth, adminAuth], async (req, res) => {
  try {
    const { syncId } = req.params;

    // Get progress state
    const progressState =
      req.app.locals.syncProgress && req.app.locals.syncProgress[syncId];

    if (!progressState) {
      return res.status(404).json({ message: "Sync job not found" });
    }

    // If job is already completed, return appropriate message
    if (!progressState.inProgress) {
      return res.json({
        success: true,
        message: "Sync job already completed, no need to cancel",
        cancelled: false,
      });
    }

    // Mark the job as cancelled - this needs to happen before aborting to prevent race conditions
    progressState.inProgress = false;
    progressState.cancelled = true;
    progressState.completedTime = Date.now();
    progressState.error = "Cancelled by admin";

    // Abort the process if there's an abort controller
    if (
      progressState.abortController &&
      typeof progressState.abortController.abort === "function"
    ) {
      try {
        progressState.abortController.abort();
        console.log(`Abort controller triggered for sync job ${syncId}`);
      } catch (abortError) {
        console.error(
          `Error triggering abort controller for sync job ${syncId}:`,
          abortError
        );
        // Continue even if abort controller fails - we've already set the cancelled flag
      }
    }

    // Force GC if possible to help free memory
    if (global.gc) {
      try {
        global.gc();
        console.log("Garbage collection triggered after cancellation");
      } catch (gcError) {
        console.error("Error triggering garbage collection:", gcError);
      }
    }

    // Check MongoDB connection and reconnect if needed
    if (mongoose.connection.readyState !== 1) {
      // 1 = connected
      console.log(
        "MongoDB connection check after cancellation: Disconnected. Reconnecting..."
      );
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Successfully reconnected to MongoDB after cancellation");
      } catch (mongoError) {
        console.error(
          "Failed to reconnect to MongoDB after cancellation:",
          mongoError
        );
      }
    } else {
      console.log(
        "MongoDB connection check after cancellation: Still connected"
      );
    }

    // Log the cancellation
    console.log(`Admin ${req.user.id} cancelled profile sync job ${syncId}`);

    // Update ProfileSyncHistory document
    try {
      const syncDoc = await ProfileSyncHistory.findById(syncId);
      if (syncDoc) {
        syncDoc.status = "cancelled";
        syncDoc.endTime = new Date();
        syncDoc.calculateDuration();
        syncDoc.cancelled = true;
        syncDoc.cancelledBy = req.user.id;
        syncDoc.cancelledAt = new Date();
        syncDoc.cancellationReason = "Cancelled by admin";
        syncDoc.totalUsers = progressState.totalUsers || 0;
        syncDoc.processedUsers = progressState.processedUsers || 0;
        syncDoc.updatedProfiles = progressState.updatedProfiles || 0;
        syncDoc.failedProfiles = progressState.failedProfiles || 0;
        syncDoc.currentPhase = "cancelled";
        syncDoc.progress = Math.floor(
          (progressState.processedUsers /
            Math.max(progressState.totalUsers, 1)) *
            100
        );

        // Add failed profile details from progressState
        if (
          progressState.failedProfilesList &&
          Array.isArray(progressState.failedProfilesList)
        ) {
          syncDoc.failedProfileDetails = progressState.failedProfilesList.map(
            (fp) => ({
              userId: fp.userId,
              userName: fp.userName,
              userEmail: fp.userEmail,
              userDepartment: fp.userDepartment || "N/A",
              userSection: fp.userSection || "N/A",
              userYear: fp.userYear || "N/A",
              platform: fp.platform,
              platformUsername: fp.platformUsername,
              error: fp.error,
              errorCode: fp.errorCode,
              timestamp: fp.timestamp ? new Date(fp.timestamp) : new Date(),
            })
          );
          console.log(
            `Saved ${syncDoc.failedProfileDetails.length} failed profile details to database on cancellation`
          );
        }

        await syncDoc.save();
        console.log(
          `Updated ProfileSyncHistory document ${syncId} with cancellation data`
        );

        // Cleanup old records (keep only last 3)
        await ProfileSyncHistory.cleanupOldRecords();
      }
    } catch (dbError) {
      console.error(
        `Error updating ProfileSyncHistory on cancellation:`,
        dbError
      );
    }

    // Return status
    res.json({
      success: true,
      message: "Profile synchronization cancelled",
      cancelled: true,
    });
  } catch (err) {
    console.error("Error cancelling sync job:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Daily Stats Cron Status Routes
const DailyStatsStatus = require("../models/DailyStatsStatus");
const {
  processDailyMaintenance,
} = require("../scripts/daily-maintenance-cron");

// Get cron job execution status and history
router.get("/cron-status", [auth, adminAuth], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;

    // Get latest status
    const latestStatus = await DailyStatsStatus.getLatestStatus();

    // Get execution history
    const history = await DailyStatsStatus.getHistory(limit);

    // Calculate next run time (5:00 AM IST)
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(5, 0, 0, 0);

    // If it's already past 5 AM today, schedule for tomorrow
    if (now.getHours() >= 5) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    res.json({
      success: true,
      latestStatus,
      history,
      nextRun: nextRun.toISOString(),
      timeUntilNextRun: nextRun.getTime() - now.getTime(),
    });
  } catch (err) {
    console.error("Error fetching cron status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Manually trigger daily maintenance job
router.post("/trigger-cron", [auth, adminAuth], async (req, res) => {
  try {
    console.log(
      `Admin ${req.user.id} manually triggered daily maintenance job`
    );

    // Create abort controller for this job
    const abortController = new AbortController();

    // Start the job in background
    processDailyMaintenance(req.user.id, "manual", abortController)
      .then((result) => {
        console.log("Manual cron job completed:", result);

        // Cleanup progress state
        if (
          req.app.locals.dailyMaintenanceProgress &&
          req.app.locals.dailyMaintenanceProgress[result.statusRecordId]
        ) {
          delete req.app.locals.dailyMaintenanceProgress[result.statusRecordId];
        }
      })
      .catch((error) => {
        console.error("Manual cron job failed:", error);
      });

    // Wait a moment to get the status record ID
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Find the latest running job (the one we just started)
    const DailyStatsStatus = require("../models/DailyStatsStatus");
    const latestJob = await DailyStatsStatus.findOne({
      status: "running",
    }).sort({ startTime: -1 });

    if (latestJob) {
      // Store progress state with abort controller
      if (!req.app.locals.dailyMaintenanceProgress) {
        req.app.locals.dailyMaintenanceProgress = {};
      }

      req.app.locals.dailyMaintenanceProgress[latestJob._id.toString()] = {
        jobId: latestJob._id,
        inProgress: true,
        cancelled: false,
        abortController: abortController,
        startedAt: new Date(),
        startedBy: req.user.id,
      };

      console.log(
        `Daily maintenance job ${latestJob._id} started with abort controller`
      );
    }

    res.json({
      success: true,
      message: "Daily maintenance job triggered successfully",
      triggeredBy: req.user.id,
      triggeredAt: new Date(),
      jobId: latestJob ? latestJob._id : null,
    });
  } catch (err) {
    console.error("Error triggering cron job:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/admin/cancel-daily-maintenance/:jobId
 * Cancel an ongoing daily maintenance job
 * Admin only
 */
router.post(
  "/cancel-daily-maintenance/:jobId",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const DailyStatsStatus = require("../models/DailyStatsStatus");

      // Find the job
      const job = await DailyStatsStatus.findById(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Check if job is already completed
      if (job.status !== "running") {
        return res.json({
          success: true,
          message: `Job already ${job.status}, no need to cancel`,
          cancelled: false,
        });
      }

      // Check if there's an active progress state in app.locals
      const progressState =
        req.app.locals.dailyMaintenanceProgress &&
        req.app.locals.dailyMaintenanceProgress[jobId];

      if (progressState) {
        // Mark as cancelled in memory
        progressState.cancelled = true;
        progressState.inProgress = false;

        // Abort the process if there's an abort controller
        if (
          progressState.abortController &&
          typeof progressState.abortController.abort === "function"
        ) {
          try {
            progressState.abortController.abort();
            console.log(
              `Abort controller triggered for daily maintenance job ${jobId}`
            );
          } catch (abortError) {
            console.error(`Error triggering abort controller:`, abortError);
          }
        }
      }

      // Update database record
      job.status = "failed";
      job.endTime = new Date();
      job.duration = Math.round((job.endTime - job.startTime) / 1000);
      job.summary = `Job cancelled by admin (${
        req.user.email
      }) at ${new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })} IST`;

      // Add to error log
      job.errorLog.push({
        phase: "admin_cancellation",
        message: `Job cancelled by admin: ${req.user.email}`,
        timestamp: new Date(),
      });

      await job.save();

      console.log(
        `Admin ${req.user.id} (${req.user.email}) cancelled daily maintenance job ${jobId}`
      );

      res.json({
        success: true,
        message: "Daily maintenance job cancelled successfully",
        cancelledBy: req.user.email,
        cancelledAt: new Date(),
        job: {
          _id: job._id,
          status: job.status,
          duration: job.duration,
          summary: job.summary,
        },
      });
    } catch (err) {
      console.error("Error cancelling daily maintenance job:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

/**
 * GET /api/admin/daily-maintenance-status
 * Get current status of daily maintenance cron job
 * Admin only
 */
router.get("/daily-maintenance-status", [auth, adminAuth], async (req, res) => {
  try {
    const DailyStatsStatus = require("../models/DailyStatsStatus");
    const { cronJob } = require("../scripts/daily-maintenance-cron");

    const limit = parseInt(req.query.limit) || 30;

    // Get the latest job
    const latestJob = await DailyStatsStatus.findOne().sort({ startTime: -1 });

    // Get execution history
    const history = await DailyStatsStatus.find()
      .sort({ startTime: -1 })
      .limit(limit)
      .select(
        "_id status startTime endTime duration totalUsers totalUsersProcessed successfulUsers failedUsers summary jobType errorLog"
      )
      .lean();

    // Get cron job status
    const cronStatus = {
      scheduled: cronJob && cronJob.running ? true : false,
      nextRun: cronJob && cronJob.nextDate ? cronJob.nextDate() : null,
    };

    // If nextRun is not available from cron, calculate manually (5:00 AM IST daily)
    if (!cronStatus.nextRun) {
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(5, 0, 0, 0);

      // If it's already past 5 AM today, schedule for tomorrow
      if (now.getHours() >= 5) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      cronStatus.nextRun = nextRun.toISOString();
    }

    res.json({
      success: true,
      cronStatus,
      latestJob: latestJob
        ? {
            _id: latestJob._id,
            status: latestJob.status,
            startTime: latestJob.startTime,
            endTime: latestJob.endTime,
            duration: latestJob.duration,
            totalUsers: latestJob.totalUsers,
            totalUsersProcessed: latestJob.totalUsersProcessed,
            successfulUsers: latestJob.successfulUsers,
            failedUsers: latestJob.failedUsers,
            summary: latestJob.summary,
            jobType: latestJob.jobType,
            errorLog: latestJob.errorLog,
            documentCounts: latestJob.documentCounts,
            rankCalculation: latestJob.rankCalculation,
          }
        : null,
      history,
    });
  } catch (err) {
    console.error("Error fetching daily maintenance status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== USER MANAGEMENT ROUTES =====
// Routes for managing user roles and permissions (Admin only)

/**
 * GET /api/admin/manage-users
 * Get all users for user management interface
 * Admin only - Returns user list with essential details for role management
 */
router.get("/manage-users", [auth, adminAuth], async (req, res) => {
  try {
    console.log(`Admin ${req.user.id} requesting user management data`);

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
        totalScore: 1,
        createdAt: 1,
        lastActive: 1,
      }
    ).sort({ createdAt: -1 });

    // Get summary statistics
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.userType === "admin").length;
    const teacherCount = users.filter((u) => u.userType === "teacher").length;
    const userCount = users.filter((u) => u.userType === "user").length;

    console.log(
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
    console.error("Error fetching users for management:", error);
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
router.put("/change-user-type", [auth, adminAuth], async (req, res) => {
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
      console.log(
        `Current admin count: ${adminCount}, promoting ${targetUser.name} to admin`
      );
    }

    // Update user type
    targetUser.userType = newUserType;
    targetUser.lastActive = new Date(); // Update last active time
    await targetUser.save();

    console.log(
      `Admin ${req.user.email} changed user ${targetUser.name} (${targetUser.email}) from ${oldUserType} to ${newUserType}`
    );

    // Log this action for audit purposes (you might want to create an audit log model)
    console.log(`USER TYPE CHANGE AUDIT LOG:`, {
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
    console.error("Error changing user type:", error);
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
router.get("/user-management-stats", [auth, adminAuth], async (req, res) => {
  try {
    // Get user type distribution
    const userTypeStats = await User.aggregate([
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
    console.error("Error fetching user management stats:", error);
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
    console.error("Error fetching academic year config:", error);
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
    console.error("Error updating academic year config:", error);
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
      console.error("Error auto-generating year mappings:", error);
      res.status(500).json({
        success: false,
        message: "Error auto-generating year mappings",
        error: error.message,
      });
    }
  }
);

module.exports = router;
