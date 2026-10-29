const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { saveUsernames } = require("../services/profileSyncService");
const { normalizeSkillSets } = require("../utils/skillSets");
const log = require("../utils/logger").scope("AUTH");

// Middleware to authenticate token
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Same single active login rule as middleware/auth.js
    if (user.sessionToken && decoded.sessionToken !== user.sessionToken) {
      return res.status(401).json({
        message: "Your session has been invalidated. You have logged in from another device.",
        code: "SESSION_EXPIRED",
        sessionExpired: true,
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" || err.name === "NotBeforeError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    log.error("Auth middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current user data
router.get("/user", auth, async (req, res) => {
  try {
    // Return user data without sensitive information
    const userData = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      department: req.user.department,
      section: req.user.section,
      rollNumber: req.user.rollNumber,
      userType: req.user.userType,
      gender: req.user.gender,
      mobileNumber: req.user.mobileNumber,
      graduatingYear: req.user.graduatingYear,
      skills: req.user.skills,
      interests: req.user.interests,
      about: req.user.about,
      linkedinUrl: req.user.linkedinUrl,
    };

    res.json(userData);
  } catch (err) {
    log.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

const validDepartments = [
  "AERO",
  "CSC",
  "CSD",
  "CSE",
  "CSM",
  "CSIT",
  "IT",
  "ECE",
  "MECH",
  "EEE",
];
const validSections = ["A", "B", "C", "D", "E", "F", "G"];

// Google OAuth Only Info
router.get("/info", (req, res) => {
  res.json({
    message: "This service uses Google OAuth for authentication",
    googleAuthRoute: "/api/auth/google",
    requiredEmail: "@mlrit.ac.in or @mlrinstitutions.ac.in",
  });
});

// Traditional Register route - DISABLED (Google OAuth only)
router.post("/register", (req, res) => {
  res.status(403).json({
    message: "Traditional registration is disabled. Please use Google OAuth.",
    googleAuthRoute: "/api/auth/google",
  });
});

// Traditional Login route - DISABLED (Google OAuth only)
router.post("/login", (req, res) => {
  res.status(403).json({
    message: "Traditional login is disabled. Please use Google OAuth.",
    googleAuthRoute: "/api/auth/google",
  });
});

// Validate user details. Signed-in users only (it tells whether a roll number, mobile number
// or email is taken), and every value must be a plain string, so a body such as
// { "rollNumber": { "$ne": null } } can never reach the query.
router.post("/validate", auth, async (req, res) => {
  try {
    const { rollNumber, mobileNumber, email } = req.body || {};

    for (const value of [rollNumber, mobileNumber, email]) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({ message: "Values must be strings" });
      }
    }

    // Create validation results object
    const validationResults = {};

    // Check if roll number exists (if provided)
    if (rollNumber) {
      const existingRollNumber = await User.findOne({ rollNumber });
      validationResults.rollNumberExists = !!existingRollNumber;
    }

    // Check if mobile number exists (if provided)
    if (mobileNumber) {
      const existingMobileNumber = await User.findOne({ mobileNumber });
      validationResults.mobileNumberExists = !!existingMobileNumber;
    }

    // Check if email exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      validationResults.emailExists = !!existingEmail;
    }

    res.json(validationResults);
  } catch (err) {
    log.error("Validation error:", err);
    res.status(500).json({ message: "Server error during validation" });
  }
});

// Update user profile (complete registration)
router.post("/completeRegistration", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    log.debug(
      "Received completeRegistration request:",
      JSON.stringify(req.body, null, 2),
    );

    const {
      name,
      phone,
      department,
      section,
      rollNumber,
      graduationYear,
      gender,
      mobileNumber,
      linkedinUrl,
      githubUrl,
      about,
      skills,
      interests,
      profiles,
      profileCompleted,
      imageUrl,
    } = req.body;

    // Validate required fields
    const requiredFields = [];
    if (!user.name && !name) requiredFields.push("name");
    if (!user.rollNumber && !rollNumber) requiredFields.push("rollNumber");
    if (!user.department && !department) requiredFields.push("department");

    if (requiredFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        errors: requiredFields.reduce((obj, field) => {
          obj[field] = `${field} is required`;
          return obj;
        }, {}),
      });
    }

    // Update user fields
    if (name) user.name = name;
    if (department) user.department = department;
    if (section) user.section = section;
    if (rollNumber) user.rollNumber = rollNumber;
    if (graduationYear) user.graduatingYear = graduationYear;
    if (gender) user.gender = gender;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (phone) user.mobileNumber = phone; // Map phone to mobileNumber
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl;
    if (about !== undefined) user.about = about;
    if (imageUrl !== undefined) user.profilePicture = imageUrl;

    // Skills are stored as named sets: [{ name, skills: [] }]
    if (skills !== undefined) {
      user.skills = normalizeSkillSets(
        typeof skills === "string" ? skills.split(",") : skills,
      );
    }

    if (interests !== undefined) {
      user.interests =
        typeof interests === "string"
          ? interests.split(",").map((i) => i.trim())
          : interests;
    }

    // Platform usernames live on the Profile collection (no fetch here; the first
    // sync or the student's update from the dashboard loads the stats).
    if (profiles || githubUrl) {
      await saveUsernames(user._id, {
        ...(profiles || {}),
        github: profiles?.github || githubUrl,
      });
    }

    // Mark registration as complete
    user.newUser = false;

    // Update profile completion status if provided
    if (profileCompleted !== undefined) {
      user.profileCompleted = Boolean(profileCompleted);
    }

    log.debug("Saving user with updated data:", {
      name: user.name,
      department: user.department,
      section: user.section,
      skills: user.skills,
      newUser: user.newUser,
      profileCompleted: user.profileCompleted,
    });

    try {
      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          section: user.section,
          rollNumber: user.rollNumber,
          userType: user.userType,
          newUser: user.newUser,
          profileCompleted: user.profileCompleted,
          graduatingYear: user.graduatingYear,
        },
      });
    } catch (saveError) {
      log.error("Error saving user:", saveError);

      if (saveError.name === "ValidationError") {
        const validationErrors = {};

        // Extract validation error messages for each field
        Object.keys(saveError.errors).forEach((field) => {
          validationErrors[field] = saveError.errors[field].message;
        });

        return res.status(400).json({
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      throw saveError; // Pass to the outer catch block
    }
  } catch (err) {
    log.error("Profile update error:", err);

    // Provide more detailed error for debugging
    if (err.name === "ValidationError") {
      log.error("Validation error details:", err.errors);
      return res.status(400).json({
        message: "Validation error",
        errors: Object.keys(err.errors).reduce((result, key) => {
          result[key] = err.errors[key].message;
          return result;
        }, {}),
      });
    }

    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

module.exports = router;
