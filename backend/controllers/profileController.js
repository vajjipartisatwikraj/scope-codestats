/**
 * Profile controller.
 *
 * Request handlers for the signed-in user's own profile page and platform
 * profiles. Wired up in routes/profiles.js, which also applies authentication
 * and rate limiting, so every handler here can rely on `req.user`.
 *
 * Platform stats live on the Profile model and are written only by
 * services/profileSyncService. Nothing platform related is stored on User.
 */
const mongoose = require("mongoose");
const Profile = require("../models/Profile");
const User = require("../models/User");
const { normalizeSkillSets } = require("../utils/skillSets");
const { normalizeEducation, validateEducation } = require("../utils/education");
const { isInstitutionEmail } = require("../config/loginAccess");
const {
  extractUsername,
  saveUsernames,
  removePlatform: syncRemovePlatform,
  updatePlatform: syncPlatform,
} = require("../services/profileSyncService");
const log = require("../utils/logger").scope("PROFILE");

// ─── Helpers ────────────────────────────────────────────────────────────────

// HTTP status for each reason a platform fetch can fail. Our own cooldown is
// the only 429, because the dashboard treats 429 as "cooldown active".
const ERROR_STATUS = {
  invalid_username: 400,
  not_found: 404,
  rate_limited: 503,
  timeout: 504,
  service_unavailable: 503,
  network: 502,
  unknown: 500,
};

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} hour${hours !== 1 ? "s" : ""} and ${minutes} minute${minutes !== 1 ? "s" : ""}`;
};

const calculateGraduationYear = (rollNumber) => {
  if (!rollNumber || rollNumber.length < 2) return new Date().getFullYear();
  const yearCode = rollNumber.substring(0, 2);
  if (!/^\d{2}$/.test(yearCode)) return new Date().getFullYear();
  return 2000 + parseInt(yearCode, 10) + 4;
};

/** The part of the email before the "@": the public address of accounts that have no stored username. */
const handleOf = (user) => user.username || String(user.email || "").split("@")[0];

/**
 * The personal-details part of the profile page response.
 * `institutional` is false for someone who is not on a college address: they type their own
 * roll number, department, year and college in the setup (the roll number cannot be read from
 * their email), so the page shows those fields.
 */
const toProfilePage = (user) => {
  const institutional = isInstitutionEmail(user.email);
  // A new account outside the college starts with a placeholder roll number and department
  // (services/newAccountService). They are not the person's details, so the page gets them blank.
  const unset = /^EXT-[a-f0-9]{24}$/i.test(user.rollNumber || "");
  return {
    user: user._id,
    name: user.name,
    email: user.email,
    username: handleOf(user),
    institutional,
    collegeName: user.collegeName || "",
    phone: user.mobileNumber || user.phone || "",
    department: unset ? "" : user.department || "",
    section: user.section || "",
    rollNumber: unset ? "" : user.rollNumber || "",
    graduationYear: user.graduatingYear || (institutional ? calculateGraduationYear(user.rollNumber) : null),
    skills: normalizeSkillSets(user.skills),
    interests: user.interests || [],
    education: normalizeEducation(user.education),
    about: user.about || "",
    linkedinUrl: user.linkedinUrl || "",
    profilePicture: user.profilePicture || "",
  };
};

// ─── Platform profiles ──────────────────────────────────────────────────────

/**
 * POST /api/profiles/:platform
 * Adds or changes one platform username, then fetches its stats.
 */
const updatePlatform = async (req, res) => {
  try {
    const { platform } = req.params;
    if (!Profile.EXTERNAL_PLATFORMS.includes(platform)) {
      return res.status(400).json({ success: false, message: "Invalid platform" });
    }

    const rawUsername = req.body?.username;
    if (typeof rawUsername !== "string" || !rawUsername.trim() || rawUsername.length > 200) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }
    const username = extractUsername(rawUsername);

    const result = await syncPlatform(req.user.id, platform, username);

    if (result.cooldownEndsAt) {
      const remainingTime = Math.ceil((result.cooldownEndsAt - Date.now()) / 1000);
      const formattedTime = formatDuration(remainingTime);
      return res.status(429).json({
        success: false,
        message: `Please wait ${formattedTime} before updating your ${platform} profile again.`,
        remainingTime,
        formattedTime,
        cooldownEndsAt: result.cooldownEndsAt,
      });
    }

    const profile = Profile.toClient(result.profile);

    if (!result.ok) {
      return res.status(ERROR_STATUS[result.error.type] || 500).json({
        success: false,
        message: result.error.message,
        errorType: result.error.type,
        profile,
      });
    }

    res.json({
      success: true,
      data: { platform, username: profile.username, details: profile },
      profile: { platform, username: profile.username, details: profile },
    });
  } catch (err) {
    // Typically a username that fails the Profile format validation.
    if (err.name === "ValidationError" || /Invalid profile format/.test(err.message)) {
      return res.status(400).json({
        success: false,
        errorType: "invalid_username",
        message: `Invalid ${req.params.platform} username format.`,
      });
    }
    log.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/profiles/:platform   body: { confirm: true }
 * Removes a linked platform: the username, its stats and its whole stored history
 * (progress snapshots, plus the platform's score and rank history).
 * This cannot be undone, so the request must say it was confirmed.
 */
const removePlatform = async (req, res) => {
  try {
    const { platform } = req.params;
    if (!Profile.EXTERNAL_PLATFORMS.includes(platform)) {
      return res.status(400).json({ success: false, message: "Invalid platform" });
    }
    if (req.body?.confirm !== true) {
      return res.status(400).json({
        success: false,
        code: "confirmation_required",
        message: "Removing a username deletes its progress history. Send { confirm: true } to continue.",
      });
    }

    const { removed, historyDeleted, scoreHistoryCleared } = await syncRemovePlatform(req.user.id, platform);
    if (!removed && historyDeleted === 0 && scoreHistoryCleared === 0) {
      return res.status(404).json({ success: false, message: `No ${platform} username is linked.` });
    }

    res.json({
      success: true,
      message: `${platform} removed`,
      platform,
      historyDeleted,
      scoreHistoryCleared,
    });
  } catch (err) {
    log.error("Profile removal error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/profiles/stats
 * Stats for every linked platform, including sync status and the last error.
 */
const getMyStats = async (req, res) => {
  try {
    const profiles = await Profile.find({ userId: req.user.id }).lean();
    const formatted = profiles.map((p) => Profile.toClient(p));

    res.json({
      success: true,
      totalScore: formatted.reduce((sum, p) => sum + p.score, 0),
      totalProblemsSolved: formatted.reduce((sum, p) => sum + p.problemsSolved, 0),
      profiles: formatted,
    });
  } catch (err) {
    log.error("Error fetching profile stats:", err);
    res.status(500).json({ success: false, message: "Server error fetching profile stats" });
  }
};

// ─── Profile page ───────────────────────────────────────────────────────────

/**
 * GET /api/profiles/me
 * Personal details plus every linked platform.
 */
const getMyProfile = async (req, res) => {
  try {
    const [user, platformProfiles] = await Promise.all([
      User.findById(req.user.id)
        .select(
          "name email username collegeName phone department section graduatingYear rollNumber mobileNumber skills interests education about linkedinUrl resumeLink profilePicture"
        )
        .lean(),
      Profile.find({ userId: req.user.id }).lean(),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    const profiles = Object.fromEntries(
      Profile.EXTERNAL_PLATFORMS.map((platform) => [platform, { username: "", details: null }])
    );
    for (const p of platformProfiles) {
      profiles[p.platform] = { username: p.username, details: Profile.toClient(p) };
    }

    res.json({ ...toProfilePage(user), resumeLink: user.resumeLink || "", profiles });
  } catch (err) {
    log.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/profiles/me
 * Updates the profile page. Platform usernames are stored on Profile only.
 */
const updateMyProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      section,
      rollNumber,
      graduationYear,
      collegeName,
      skills,
      interests,
      education,
      about,
      linkedinUrl,
      resumeLink,
      githubUrl,
      profiles,
    } = req.body;

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number. Please enter a valid 10-digit mobile number",
      });
    }

    // Only touch the fields the client sent, so per-section saves from the
    // profile page don't wipe everything else.
    const updateFields = {};
    if (phone !== undefined) updateFields.mobileNumber = phone;
    if (section !== undefined) updateFields.section = section;
    if (about !== undefined) updateFields.about = about || "";
    if (linkedinUrl !== undefined) updateFields.linkedinUrl = linkedinUrl || "";
    if (resumeLink !== undefined) updateFields.resumeLink = resumeLink || "";
    if (interests !== undefined) {
      updateFields.interests = Array.isArray(interests) ? interests : [];
    }
    if (skills !== undefined) updateFields.skills = normalizeSkillSets(skills);
    if (name) updateFields.name = name;
    if (department) updateFields.department = department;
    if (rollNumber) updateFields.rollNumber = rollNumber;
    if (typeof collegeName === "string") updateFields.collegeName = collegeName.trim();

    if (graduationYear) {
      updateFields.graduatingYear = graduationYear;
    } else if (rollNumber && rollNumber.length >= 2) {
      updateFields.graduatingYear = calculateGraduationYear(rollNumber);
    }

    try {
      const existingUser = await User.findById(req.user.id);
      if (!existingUser) return res.status(404).json({ message: "User not found" });

      // Engineering entries always take their stream from the department.
      if (education !== undefined) {
        const normalizedEducation = normalizeEducation(education, {
          engineeringStream: updateFields.department || existingUser.department || "",
        });
        const educationError = validateEducation(normalizedEducation);
        if (educationError) {
          return res.status(400).json({ success: false, message: educationError });
        }
        updateFields.education = normalizedEducation;
      }

      // Validate the combined document before writing anything.
      existingUser.set(updateFields);
      await existingUser.validate();

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select("-password");

      // Platform usernames go to the Profile collection.
      const submitted = { ...(profiles && typeof profiles === "object" ? profiles : {}) };
      if (githubUrl && !submitted.github) submitted.github = githubUrl;
      await saveUsernames(user._id, submitted);

      const saved = await Profile.find({ userId: user._id }).select("platform username").lean();
      const usernames = Object.fromEntries(saved.map((p) => [p.platform, p.username]));

      res.json({
        success: true,
        message: "Profile updated successfully",
        profile: { ...toProfilePage(user), githubUrl: usernames.github || "", profiles: usernames },
      });
    } catch (validationError) {
      if (validationError.name === "ValidationError") {
        const errors = {};
        Object.keys(validationError.errors).forEach((field) => {
          errors[field] = validationError.errors[field].message;
        });
        return res.status(400).json({ message: "Validation error", errors });
      }
      // Roll numbers are unique: a number that is taken gets a sentence, not a 500
      if (validationError.code === 11000 && validationError.keyPattern?.rollNumber) {
        const message = "That roll number is already registered to another account.";
        return res.status(409).json({ message, errors: { rollNumber: message } });
      }
      throw validationError;
    }
  } catch (err) {
    log.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Sync schedule ──────────────────────────────────────────────────────────

/**
 * GET /api/profiles/sync-info
 * Next scheduled sync, for the countdown in the sidebar.
 */
const getSyncInfo = async (req, res) => {
  try {
    const syncInfo = await mongoose.connection.db
      .collection("system")
      .findOne({ _id: "sync_info" });

    const now = new Date();
    if (!syncInfo) {
      // No sync recorded yet: the next scheduled run is 11:55 UTC.
      const nextSync = new Date();
      nextSync.setUTCHours(11, 55, 0, 0);
      if (nextSync <= now) nextSync.setDate(nextSync.getDate() + 1);

      return res.json({
        lastSync: null,
        nextSync,
        timeRemaining: nextSync.getTime() - now.getTime(),
        syncStats: null,
        scheduledTime: "5:25 PM IST (11:55 AM UTC)",
        message: "No sync has occurred yet. First sync will run at the scheduled time.",
      });
    }

    const timeRemaining = syncInfo.nextSync.getTime() - now.getTime();
    res.json({
      lastSync: syncInfo.lastSync,
      nextSync: syncInfo.nextSync,
      timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
      syncStats: syncInfo.syncStats || null,
      scheduledTime: "5:25 PM IST (11:55 AM UTC)",
      message: syncInfo.lastSync
        ? `Last sync completed on ${new Date(syncInfo.lastSync).toLocaleString()}. Next sync at ${new Date(syncInfo.nextSync).toLocaleString()}.`
        : "No sync has occurred yet.",
    });
  } catch (error) {
    log.error("Error fetching sync info:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  updatePlatform,
  removePlatform,
  getMyStats,
  getMyProfile,
  updateMyProfile,
  getSyncInfo,
};
