const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const AcademicYearConfig = require("../models/AcademicYearConfig");

router.get("/", auth, async (req, res) => {
  try {
    const {
      department,
      section,
      graduatingYear,
      gender,
      sortBy = "totalScore",
      order = "desc",
      leaderboardType = "score",
      includeUserData = "false",
      includePlatformDetails = "false",
      debug = "false",
    } = req.query;

    if (debug === "true") {
      console.log(
        `Leaderboard request with type ${leaderboardType}, sortBy: ${sortBy}, order: ${order}`
      );
      console.log(
        `Including user data: ${includeUserData}, platform details: ${includePlatformDetails}`
      );
    }

    // Build filter object
    const filter = {};
    if (department && department !== "ALL") filter.department = department;
    if (section && section !== "All") filter.section = section;
    if (graduatingYear && graduatingYear !== "All")
      filter.graduatingYear = parseInt(graduatingYear);
    if (gender && gender !== "All") filter.gender = gender;

    // Always exclude admin and teacher accounts from leaderboard
    filter.userType = { $nin: ["admin", "teacher"] };

    // Exclude graduated users (consistent with daily-maintenance-cron ranking)
    try {
      const academicConfig = await AcademicYearConfig.getConfig();
      const graduatedYears = academicConfig.yearMappings
        .filter((mapping) => mapping.academicYear === "Graduated")
        .map((mapping) => mapping.graduationYear);

      if (graduatedYears.length > 0) {
        // Only apply graduated filter if no specific graduatingYear was requested
        if (!graduatingYear || graduatingYear === "All") {
          filter.$or = [
            { graduatingYear: { $exists: false } },
            { graduatingYear: { $nin: graduatedYears } },
          ];
        }
      }
    } catch (configErr) {
      console.warn("Could not load AcademicYearConfig for graduated filter:", configErr.message);
      // Continue without graduated filter if config fails
    }

    // Build select fields - directly from User model
    const selectFields = [
      "_id",
      "name",
      "rollNumber",
      "email",
      "department",
      "section",
      "graduatingYear",
      "gender",
      "profilePicture",
      "totalScore",
      "totalProblemsSolved",
      "consistencyIndex",
      "sevenDayScore",
      "platformScores", // Contains all platform scores (Map)
    ];

    // Include platformData if requested (raw platform data)
    if (includeUserData === "true") {
      selectFields.push("platformData");
    }

    // Get users directly from User model - NO JOINS NEEDED!
    const users = await User.find(filter)
      .select(selectFields.join(" "))
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .lean();

    // Process users to format data for frontend
    const processedUsers = users.map((user) => {
      // Convert platformScores Map to plain object if it exists
      let platformScores = {};

      if (user.platformScores) {
        // Handle Mongoose Map conversion
        if (user.platformScores instanceof Map) {
          platformScores = Object.fromEntries(user.platformScores);
        } else if (typeof user.platformScores === 'object') {
          platformScores = user.platformScores;
        }
      }

      // Calculate scopeScore from platformScores.scopecodestats
      const scopeScore = platformScores.scopecodestats?.score || 0;

      // Calculate total problems solved from platformScores
      const problemsSolved = user.totalProblemsSolved ||
        Object.values(platformScores).reduce(
          (sum, platform) => sum + (platform.problemsSolved || 0),
          0
        );

      // Build the user object
      const processedUser = {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        email: user.email,
        department: user.department,
        section: user.section,
        graduatingYear: user.graduatingYear,
        gender: user.gender,
        profilePicture: user.profilePicture,
        totalScore: user.totalScore || 0,
        consistencyIndex: user.consistencyIndex || 0,
        sevenDayScore: user.sevenDayScore || 0,
        scopeScore: scopeScore,
        problemsSolved: problemsSolved,
        platformScores: platformScores,
      };

      // Include platforms (platformData) if requested
      if (includeUserData === "true" && user.platformData) {
        processedUser.platforms = user.platformData;
      }

      return processedUser;
    });

    // If debug is enabled, log the first user's data
    if (debug === "true" && processedUsers.length > 0) {
      const firstUser = processedUsers[0];
      console.log(`First user in leaderboard: ${firstUser.name}`);
      console.log(`Total Score: ${firstUser.totalScore}`);
      console.log(`Scope Score: ${firstUser.scopeScore}`);
      console.log(`Has platforms data: ${firstUser.platforms ? "Yes" : "No"}`);
      console.log(`Has platformScores data: ${firstUser.platformScores ? "Yes" : "No"}`);
      if (firstUser.platformScores) {
        console.log("Platform scores:", Object.keys(firstUser.platformScores));
      }
    }

    // Add overall ranks with PROPER tie handling
    // Users with the same score get the same rank (dense ranking)
    let currentOverallRank = 0;
    let lastOverallScore = null;

    const usersWithRanks = processedUsers.map((user, index) => {
      if (user.totalScore !== lastOverallScore) {
        currentOverallRank = index + 1;
        lastOverallScore = user.totalScore;
      }
      return {
        ...user,
        overallRank: currentOverallRank,
      };
    });

    // Calculate department ranks with PROPER tie handling
    const departmentGroups = {};
    usersWithRanks.forEach((user) => {
      if (!departmentGroups[user.department]) {
        departmentGroups[user.department] = [];
      }
      departmentGroups[user.department].push(user);
    });

    const usersWithDepartmentRanks = usersWithRanks.map((user) => {
      const deptUsers = departmentGroups[user.department];
      const userIndex = deptUsers.findIndex((u) => u._id.toString() === user._id.toString());

      // Find the rank considering ties
      let deptRank = 1;
      for (let i = 0; i < userIndex; i++) {
        if (deptUsers[i].totalScore !== deptUsers[userIndex].totalScore) {
          deptRank = i + 1;
        }
      }
      if (userIndex > 0 && deptUsers[userIndex - 1].totalScore !== user.totalScore) {
        deptRank = userIndex + 1;
      }

      return {
        ...user,
        departmentRank: deptRank,
      };
    });

    res.json(usersWithDepartmentRanks);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/export", auth, async (req, res) => {
  try {
    // Get all users directly from User model - no aggregation needed
    const users = await User.find({ userType: { $nin: ["admin", "teacher"] } })
      .select(
        "_id name email rollNumber department section graduatingYear mobileNumber totalScore totalProblemsSolved consistencyIndex sevenDayScore platformScores platformData profiles skills interests about linkedinUrl resumeLink"
      )
      .sort({ totalScore: -1 })
      .lean();

    // Process users and convert platformScores Map to object
    const processedUsers = users.map((user, index) => {
      // Convert platformScores Map to plain object
      let platformScores = {};
      let codingProfiles = {};

      if (user.platformScores) {
        if (user.platformScores instanceof Map) {
          platformScores = Object.fromEntries(user.platformScores);
        } else if (typeof user.platformScores === 'object') {
          platformScores = user.platformScores;
        }
      }

      // Format platform scores as codingProfiles for export
      Object.entries(platformScores).forEach(([platform, data]) => {
        codingProfiles[platform] = {
          username: data.username || "",
          score: data.score || 0,
          problemsSolved: data.problemsSolved || 0,
          rating: data.rating || 0,
          rank: data.rank || "",
          maxRating: data.maxRating || 0,
          contestsParticipated: data.contestsParticipated || 0,
          easyProblemsSolved: data.easyProblemsSolved || 0,
          mediumProblemsSolved: data.mediumProblemsSolved || 0,
          hardProblemsSolved: data.hardProblemsSolved || 0,
          lastUpdated: data.lastUpdated || null,
          // GitHub specific fields
          totalCommits: data.totalCommits || 0,
          publicRepos: data.publicRepos || 0,
          followers: data.followers || 0,
          following: data.following || 0,
          starsReceived: data.starsReceived || 0,
        };
      });

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        department: user.department,
        section: user.section,
        graduatingYear: user.graduatingYear,
        mobileNumber: user.mobileNumber,
        totalScore: user.totalScore || 0,
        totalProblemsSolved: user.totalProblemsSolved || 0,
        consistencyIndex: user.consistencyIndex || 0,
        sevenDayScore: user.sevenDayScore || 0,
        codingProfiles: codingProfiles,
        profiles: user.profiles || {},
        skills: user.skills || [],
        interests: user.interests || [],
        about: user.about || "",
        linkedinUrl: user.linkedinUrl || "",
        resumeLink: user.resumeLink || "",
        rank: index + 1,
      };
    });

    res.json(processedUsers);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Add a new endpoint to get top users by score with count limit
router.get("/top/:count", auth, async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 50;
    const { includeGraduated = "false" } = req.query; // NEW: Only show graduated when explicitly requested
    console.log(`Fetching top ${count} users for cohort eligibility (includeGraduated: ${includeGraduated})`);

    // Filter to get only regular users (not admins)
    const filter = { userType: { $nin: ["admin", "teacher"] } };

    // Exclude graduated students by default
    if (includeGraduated !== "true") {
      const config = await AcademicYearConfig.getConfig();
      const graduatedYears = config.yearMappings
        .filter((m) => m.academicYear === "Graduated")
        .map((m) => m.graduationYear);

      filter.graduatingYear = { $nin: graduatedYears };
    }

    // Fetch users sorted by totalScore in descending order
    const users = await User.find(filter)
      .select(
        "_id name email rollNumber department totalScore consistencyIndex sevenDayScore"
      )
      .sort({ totalScore: -1 })
      .limit(count);

    // Format the response as a leaderboard
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        department: user.department,
      },
      totalScore: user.totalScore || 0,
    }));

    console.log(`Found ${leaderboard.length} top users`);
    return res.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching top users:", error);
    return res
      .status(500)
      .json({ message: "Error fetching top users", error: error.message });
  }
});

// Get academic year configuration (public endpoint with auth)
router.get("/academic-year-config", auth, async (req, res) => {
  try {
    const AcademicYearConfig = require("../models/AcademicYearConfig");
    const config = await AcademicYearConfig.getConfig();

    res.json({
      success: true,
      config: {
        academicYearStartMonth: config.academicYearStartMonth,
        currentAcademicYear: config.currentAcademicYear,
        yearMappings: config.yearMappings,
      },
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

module.exports = router;
