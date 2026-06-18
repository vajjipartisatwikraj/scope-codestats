const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Achievement = require("../models/Achievement");
const Profile = require("../models/Profile");
const { isAdminOrTeacher } = require("../utils/userHelpers");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Sophisticated rate limiting for public profiles (like CodeChef, GitHub, etc.)
// This handles both authenticated and non-authenticated users differently
const publicUsernameRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute window

  // Dynamic limit based on authentication status
  // Note: This must be synchronous, not async!
  max: (req) => {
    // Check if user is authenticated
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Authenticated users get higher limits
        // 30 requests per minute (like GitHub authenticated API)
        return 15;
      } catch (err) {
        // Invalid token, treat as unauthenticated
        // 15 requests per minute for anonymous users
        return 15;
      }
    }

    // Non-authenticated users: 15 requests per minute
    return 15;
  },

  // Skip rate limiting for admin/teacher users
  // Note: This must be async to check user type from DB
  skip: async (req) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check user type from database
        const user = await User.findById(decoded.userId)
          .select("userType")
          .lean();

        if (
          user &&
          (user.userType === "admin" || user.userType === "teacher")
        ) {
          console.log(
            `[Public Profile Rate Limiter] Skipping for ${user.userType}: ${decoded.userId}`,
          );
          return true; // Skip rate limiting
        }
      } catch (err) {
        // Invalid token or DB error, apply rate limiting
        console.log(
          "[Public Profile Rate Limiter] Error checking user type, applying rate limit:",
          err.message,
        );
      }
    }
    return false; // Apply rate limiting
  },

  // Custom key generator to handle:
  // 1. Authenticated users: rate limit by user ID
  // 2. Anonymous users: rate limit by IP + User-Agent (fingerprinting)
  keyGenerator: (req) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // For authenticated users: use their user ID
        // This prevents WiFi/shared IP issues
        return `user_${decoded.userId}_${req.params.username}`;
      } catch (err) {
        // Invalid token, fall through to IP-based limiting
      }
    }

    // For anonymous users: combine IP + User-Agent for better fingerprinting
    // This helps differentiate users on same WiFi/network
    const userAgent = req.headers["user-agent"] || "unknown";
    const fingerprint = Buffer.from(userAgent)
      .toString("base64")
      .substring(0, 20);

    return `anon_${req.ip}_${fingerprint}_${req.params.username}`;
  },

  // Informative error messages with retry information
  handler: (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const isAuthenticated = token ? true : false;

    res.status(429).json({
      error: "Rate limit exceeded",
      message: isAuthenticated
        ? "You have made too many requests. Please wait a moment before trying again."
        : "Too many requests from your network. Please try again in a moment or log in for higher limits.",
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000),
      limit: req.rateLimit.limit,
      current: req.rateLimit.current,
      remaining: req.rateLimit.remaining,
      hint: !isAuthenticated ? "Tip: Log in to get higher rate limits" : null,
    });
  },

  // Modern rate limit headers (RFC draft)
  standardHeaders: true,
  legacyHeaders: false,

  // Skip rate limiting for requests that fail (404, etc.)
  skipFailedRequests: true,

  // Skip successful requests to not penalize legitimate usage
  skipSuccessfulRequests: false,
});

// Get current authenticated user
router.get("/me", auth, async (req, res) => {
  try {
    // Add log to verify userType is included
    console.log(
      `GET /users/me - User ${req.user.id} (type: ${
        req.user.userType || "user"
      })`,
    );

    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure userType is included
    if (!user.userType) {
      user.userType = "user";
    }

    // Fetch user's achievements
    const achievements = await Achievement.find({ user: user._id }).lean();

    // Fetch user's coding profiles
    const profiles = await Profile.find({ userId: user._id }).lean();

    // Format coding profiles data
    const codingProfiles = {};
    profiles.forEach((profile) => {
      codingProfiles[profile.platform] = {
        username:
          typeof profile.username === "object"
            ? profile.username.username || ""
            : profile.username || "",
        rating: profile.rating || 0,
        rank: profile.rank || "unrated",
        problemsSolved: profile.problemsSolved || 0,
        score: profile.score || 0,
        contestsParticipated: profile.contestsParticipated || 0,
        easyProblemsSolved: profile.easyProblemsSolved || 0,
        mediumProblemsSolved: profile.mediumProblemsSolved || 0,
        hardProblemsSolved: profile.hardProblemsSolved || 0,
      };
    });

    // Format the response
    const userData = {
      ...user,
      skills: user.skills || [],
      interests: user.interests || [],
      about: user.about || "",
      linkedinUrl: user.linkedinUrl || "",
      graduatingYear: user.graduatingYear,
      achievements: achievements.map((achievement) => ({
        title: achievement.title,
        description: achievement.description,
        type: achievement.type,
        tags: achievement.tags || [],
        link: achievement.link || "",
        imageUrl: achievement.imageUrl || "",
        startDate: achievement.startDate,
        endDate: achievement.endDate,
        domainLink: achievement.domainLink || "",
      })),
      codingProfiles,
      totalScore: user.totalScore || 0,
      leetcode: codingProfiles.leetcode || { rating: 0 },
      codechef: codingProfiles.codechef || { rating: 0 },
      codeforces: codingProfiles.codeforces || { rating: 0 },
      hackerrank: codingProfiles.hackerrank || { rating: 0 },
    };

    res.json(userData);
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Search users by name, email, or filters (admin only)
router.get("/search", auth, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (!isAdminOrTeacher(req.user)) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin or Teacher only." });
    }

    const {
      q,
      email,
      department,
      section,
      graduatingYear,
      limit = 1000,
    } = req.query;

    // Build search query
    const searchQuery = {
      userType: "user", // Exclude admin and teacher users
    };

    // If email is provided, search specifically by email
    if (email && email.trim()) {
      searchQuery.email = { $regex: email.trim(), $options: "i" };
    }
    // If q is provided, search by name, email, or roll number
    else if (q && q.trim().length >= 3) {
      searchQuery.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { rollNumber: { $regex: q, $options: "i" } },
      ];
    }

    // Add optional filters
    if (department) {
      searchQuery.department = department;
    }
    if (section) {
      searchQuery.section = section;
    }
    if (graduatingYear) {
      searchQuery.graduatingYear = parseInt(graduatingYear);
    }

    // If no search criteria, return filtered users (for class-based filtering)
    if (!q && !email && (department || section || graduatingYear)) {
      const users = await User.find(searchQuery)
        .select(
          "name email rollNumber department section graduatingYear totalScore profilePicture",
        )
        .limit(parseInt(limit))
        .sort({ totalScore: -1 })
        .lean();

      return res.json({ users });
    }

    // If no search criteria at all, return empty unless all=true
    if (!q && !email && !department && !section && !graduatingYear) {
      if (req.query.all === "true") {
        const users = await User.find(searchQuery)
          .select(
            "name email rollNumber department section graduatingYear totalScore profilePicture",
          )
          .limit(parseInt(limit))
          .sort({ totalScore: -1 })
          .lean();
        return res.json({ users });
      }
      return res.json({ users: [] });
    }

    const users = await User.find(searchQuery)
      .select(
        "name email rollNumber department section graduatingYear totalScore profilePicture",
      )
      .limit(parseInt(limit))
      .sort({ totalScore: -1 })
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user by username (from email) - public endpoint
router.get("/public/:username", publicUsernameRateLimit, async (req, res) => {
  try {
    console.log(
      `🌐 PUBLIC API REQUEST - Username: ${req.params.username}, IP: ${req.ip}`,
    );

    // Find user by email prefix (username)
    const user = await User.findOne({
      email: new RegExp(`^${req.params.username}@`, "i"),
    })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch user's achievements
    const achievements = await Achievement.find({ user: user._id })
      .select(
        "title description type tags link imageUrl startDate endDate domainLink",
      )
      .lean();

    // Fetch user's coding profiles
    const profiles = await Profile.find({ userId: user._id })
      .select(
        "platform username rating rank problemsSolved score contestsParticipated easyProblemsSolved mediumProblemsSolved hardProblemsSolved",
      )
      .lean();

    // Format coding profiles data
    const codingProfiles = {};
    profiles.forEach((profile) => {
      codingProfiles[profile.platform] = {
        username:
          typeof profile.username === "object"
            ? profile.username.username || ""
            : profile.username || "",
        rating: profile.rating || 0,
        rank: profile.rank || "unrated",
        problemsSolved: profile.problemsSolved || 0,
        score: profile.score || 0,
        contestsParticipated: profile.contestsParticipated || 0,
        easyProblemsSolved: profile.easyProblemsSolved || 0,
        mediumProblemsSolved: profile.mediumProblemsSolved || 0,
        hardProblemsSolved: profile.hardProblemsSolved || 0,
      };
    });

    // Format the response
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department || null,
      section: user.section || null,
      rollNumber: user.rollNumber || null,
      graduatingYear: user.graduatingYear || null,
      about: user.about || null,
      linkedinUrl: user.linkedinUrl || null,
      resumeLink: user.resumeLink || null,
      profilePicture: user.profilePicture || null,
      totalScore: user.totalScore || 0,
      // Missing fields from User schema
      skills: user.skills || [],
      interests: user.interests || [],
      githubStats: user.githubStats || {
        totalCommits: 0,
        publicRepos: 0,
        starsReceived: 0,
        followers: 0,
        contributionsLastYear: 0,
        lastUpdated: null,
      },
      rankingInfo: user.rankingInfo || {
        overallRank: null,
        departmentRank: null,
        yearRank: null,
        lastRankUpdate: null,
        rankChange: 0,
        departmentRankChange: 0,
        totalUsers: 0,
        departmentUsers: 0,
        percentile: 0,
      },
      platformData: user.platformData || {},
      contestStats: user.contestStats || {
        totalContestsParticipated: 0,
        bestRank: 0,
        lastContestDate: null,
        contestsByPlatform: {
          codeforces: 0,
          codechef: 0,
          leetcode: 0,
          hackerrank: 0,
        },
      },
      totalProblemsSolved: user.totalProblemsSolved || 0,
      problemStats: user.problemStats || {
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
      },
      consistencyIndex: user.consistencyIndex || 0,
      sevenDayScore: user.sevenDayScore || 0,
      lastProfileSync: user.lastProfileSync || null,
      achievements,
      codingProfiles,
    };

    res.json(userData);
  } catch (error) {
    console.error("Error fetching public user data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user by username (from email)
router.get("/:username", async (req, res) => {
  try {
    // Find user by email prefix (username)
    const user = await User.findOne({
      email: new RegExp(`^${req.params.username}@`, "i"),
    })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch user's achievements - OPTIMIZED with field selection and .lean()
    const achievements = await Achievement.find({ user: user._id })
      .select(
        "title description type tags link imageUrl startDate endDate domainLink",
      )
      .lean();

    // Fetch user's coding profiles - OPTIMIZED with field selection and .lean()
    const profiles = await Profile.find({ userId: user._id })
      .select(
        "platform username rating rank problemsSolved score contestsParticipated easyProblemsSolved mediumProblemsSolved hardProblemsSolved",
      )
      .lean();

    // Format coding profiles data
    const codingProfiles = {};
    profiles.forEach((profile) => {
      codingProfiles[profile.platform] = {
        username:
          typeof profile.username === "object"
            ? profile.username.username || ""
            : profile.username || "",
        rating: profile.rating || 0,
        rank: profile.rank || "unrated",
        problemsSolved: profile.problemsSolved || 0,
        score: profile.score || 0,
        contestsParticipated: profile.contestsParticipated || 0,
        easyProblemsSolved: profile.easyProblemsSolved || 0,
        mediumProblemsSolved: profile.mediumProblemsSolved || 0,
        hardProblemsSolved: profile.hardProblemsSolved || 0,
      };
    });

    // Format the response
    const userData = {
      ...user,
      skills: user.skills || [],
      interests: user.interests || [],
      about: user.about || "",
      linkedinUrl: user.linkedinUrl || "",
      resumeLink: user.resumeLink || "",
      graduatingYear: user.graduatingYear,
      achievements: achievements.map((achievement) => ({
        title: achievement.title,
        description: achievement.description,
        type: achievement.type,
        tags: achievement.tags || [],
        link: achievement.link || "",
        imageUrl: achievement.imageUrl || "",
        startDate: achievement.startDate,
        endDate: achievement.endDate,
        domainLink: achievement.domainLink || "",
      })),
      codingProfiles,
      totalScore: user.totalScore || 0,
      leetcode: codingProfiles.leetcode || { rating: 0 },
      codechef: codingProfiles.codechef || { rating: 0 },
      codeforces: codingProfiles.codeforces || { rating: 0 },
      hackerrank: codingProfiles.hackerrank || { rating: 0 },
    };

    res.json(userData);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin-only: Check and set user type
router.post("/set-user-type", auth, async (req, res) => {
  try {
    // Ensure the current user is an admin or teacher
    if (!isAdminOrTeacher(req.user)) {
      return res.status(403).json({
        message: "Forbidden: Only admins or teachers can access this endpoint",
      });
    }

    const { userId, userType } = req.body;

    // Validate input
    if (!userId || !userType) {
      return res.status(400).json({
        message: "Missing required fields: userId and userType are required",
      });
    }

    // Validate userType value
    if (!["user", "admin", "teacher"].includes(userType)) {
      return res.status(400).json({
        message: 'Invalid userType: Must be "user", "admin", or "teacher"',
      });
    }

    // Find and update the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log the change
    console.log(
      `User type change by admin ${req.user.email}: ${user.email} from ${
        user.userType || "user"
      } to ${userType}`,
    );

    // Update user type
    user.userType = userType;
    await user.save();

    // Return success message
    res.json({
      message: `User ${user.email} updated successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error("Error setting user type:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Proxy endpoint for profile images to avoid CORS issues
router.get("/profile-image-proxy/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "profilePicture",
    );

    if (!user || !user.profilePicture) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    // Fetch the image from the external URL
    const https = require("https");
    const http = require("http");
    const url = require("url");

    const imageUrl = user.profilePicture;
    const parsedUrl = url.parse(imageUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;

    client
      .get(imageUrl, (imageRes) => {
        // Set appropriate headers
        res.setHeader(
          "Content-Type",
          imageRes.headers["content-type"] || "image/jpeg",
        );
        res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
        res.setHeader("Access-Control-Allow-Origin", "*");

        // Pipe the image data
        imageRes.pipe(res);
      })
      .on("error", (err) => {
        console.error("Error fetching profile image:", err);
        res.status(500).json({ message: "Error fetching profile image" });
      });
  } catch (error) {
    console.error("Error in profile image proxy:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get top users with advanced filtering options (admin only)
router.get("/top/:count", auth, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (!isAdminOrTeacher(req.user)) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin or Teacher only." });
    }

    const { count } = req.params;
    const { department, section, graduatingYear } = req.query;

    if (!count || isNaN(count) || count <= 0) {
      return res.status(400).json({ message: "Invalid count provided" });
    }

    // Build filter query
    const filterQuery = {
      userType: "user", // Exclude admin and teacher users
    };

    // Add optional filters
    if (department) {
      filterQuery.department = department;
    }
    if (section) {
      filterQuery.section = section;
    }
    if (graduatingYear) {
      filterQuery.graduatingYear = parseInt(graduatingYear);
    }

    const users = await User.find(filterQuery)
      .select(
        "name email rollNumber department section graduatingYear totalScore profilePicture",
      )
      .sort({ totalScore: -1 })
      .limit(parseInt(count))
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("Error fetching top users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user profile picture
router.get("/profile-image/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "profilePicture name",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the profile picture URL or default if not found
    return res.json({
      profilePicture: user.profilePicture || "",
      name: user.name || "User",
    });
  } catch (error) {
    console.error("Error fetching profile image:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
