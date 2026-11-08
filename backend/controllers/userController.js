/**
 * User controller: the public profile page and the staff tools around it.
 *
 *   Signed-in user    getCurrentUser
 *   Profile page      getPublicProfile (the one profile page, for everyone)
 *   Profile pictures  getProfileImage, proxyProfileImage
 *   Staff only        searchUsers, setUserType
 *
 * Queries and response shapes live in services/userProfileService. Who may
 * call what (login, staff only, rate limit) is decided in routes/users.js.
 */
const https = require("https");
const User = require("../models/User");
const escapeRegex = require("../utils/escapeRegex");
const teacherRequestService = require("../services/teacherRequestService");
const {
  PRIVATE_USER_FIELDS,
  PUBLIC_ACHIEVEMENT_FIELDS,
  findUsersByScore,
  findUserByUsername,
  loadAchievements,
  loadCodingProfiles,
  loadPublicActivity,
  buildDetailedProfile,
  buildPublicProfile,
} = require("../services/userProfileService");
const log = require("../utils/logger").scope("USERS");

const MAX_PROXY_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_HOST_SUFFIXES = [".googleusercontent.com", ".ggpht.com"];

/** Google account pictures are served from these hosts only. */
const isAllowedImageHost = (hostname) => {
  const host = String(hostname).toLowerCase();
  return IMAGE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
};

const USER_TYPES = ["user", "admin", "teacher"];
const NOT_FOUND = { message: "User not found" };

/** Students only: admins and teachers never appear in lists. */
const studentFilter = ({ department, section, graduatingYear }) => ({
  userType: "user",
  ...(department && { department }),
  ...(section && { section }),
  ...(graduatingYear && { graduatingYear: parseInt(graduatingYear, 10) }),
});

// ─── Signed-in user ─────────────────────────────────────────────────────────

/** GET /api/users/me: everything about the signed-in user, including sync status. */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json(NOT_FOUND);

    user.userType = user.userType || "user";

    const [achievements, platforms] = await Promise.all([
      loadAchievements(user._id),
      loadCodingProfiles(user._id, { includeSync: true }),
    ]);

    // Teacher sign-in accounts also report where their access request stands, so the
    // app can send them to the right page.
    const isPendingTeacher = user.userType === "user" && user.signupIntent === "teacher";
    const teacherRequest = isPendingTeacher
      ? (await teacherRequestService.statusFor(user)).request
      : null;

    res.json({
      ...buildDetailedProfile(user, achievements, platforms),
      signupIntent: user.signupIntent || "student",
      teacherRequest,
    });
  } catch (err) {
    log.error("Error fetching current user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Profile pages ──────────────────────────────────────────────────────────

/**
 * GET /api/users/public/:username: the profile page every visitor sees, whoever is asking
 * (2 requests per second per IP; going over blocks the IP for 1 minute, see the rate limit
 * middleware). Only fields meant for anyone are returned.
 */
const getPublicProfile = async (req, res) => {
  try {
    const user = await findUserByUsername(req.params.username, PRIVATE_USER_FIELDS);
    if (!user) return res.status(404).json(NOT_FOUND);

    const [achievements, platforms, activity] = await Promise.all([
      loadAchievements(user._id, PUBLIC_ACHIEVEMENT_FIELDS),
      loadCodingProfiles(user._id),
      loadPublicActivity(user._id),
    ]);

    res.json(buildPublicProfile(user, achievements, platforms, activity));
  } catch (err) {
    log.error("Error fetching public user data:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Profile pictures ───────────────────────────────────────────────────────

/** GET /api/users/profile-image/:userId: the picture URL and name. */
const getProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("profilePicture name");
    if (!user) return res.status(404).json(NOT_FOUND);

    res.json({
      profilePicture: user.profilePicture || "",
      name: user.name || "User",
    });
  } catch (err) {
    log.error("Error fetching profile image:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/users/profile-image-proxy/:userId: streams the picture through this
 * server, because the browser cannot load some picture hosts (CORS).
 */
const proxyProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("profilePicture");
    if (!user || !user.profilePicture) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    // The URL is stored in the user's own record and users can edit it, so it is never
    // fetched blindly: only https pictures on Google's image hosts, which keeps this route
    // from reaching internal addresses (cloud metadata, localhost, private networks).
    let imageUrl;
    try {
      imageUrl = new URL(user.profilePicture);
    } catch {
      return res.status(404).json({ message: "Profile picture not found" });
    }
    if (imageUrl.protocol !== "https:" || imageUrl.port || !isAllowedImageHost(imageUrl.hostname)) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    const request = https.get(imageUrl, { timeout: 5000 }, (imageRes) => {
      const type = String(imageRes.headers["content-type"] || "");
      const length = Number(imageRes.headers["content-length"] || 0);

      // Redirects are not followed (a redirect could point anywhere), and only images
      // up to 2 MB are passed on.
      if (imageRes.statusCode !== 200 || !type.startsWith("image/") || length > MAX_PROXY_IMAGE_BYTES) {
        imageRes.resume();
        return res.status(404).json({ message: "Profile picture not found" });
      }

      res.setHeader("Content-Type", type);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=86400"); // one day
      res.setHeader("Access-Control-Allow-Origin", "*");

      let received = 0;
      imageRes.on("data", (chunk) => {
        received += chunk.length;
        if (received > MAX_PROXY_IMAGE_BYTES) {
          request.destroy();
          res.destroy();
        }
      });
      imageRes.pipe(res);
    });
    request.on("timeout", () => request.destroy(new Error("image host timed out")));
    request.on("error", (err) => {
      log.error("Error fetching profile image:", err);
      if (!res.headersSent) res.status(502).json({ message: "Error fetching profile image" });
    });
  } catch (err) {
    log.error("Error in profile image proxy:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Staff only (routes/users.js applies the admin / teacher check) ─────────

/**
 * GET /api/users/search: students by name, email or roll number, or by class
 * (department, section, graduating year), best score first. With no criteria it
 * returns nothing, unless `all=true`.
 */
const searchUsers = async (req, res) => {
  try {
    const { q, email, department, section, graduatingYear, all, limit = 1000 } = req.query;
    const filter = studentFilter({ department, section, graduatingYear });

    if (!q && !email && !department && !section && !graduatingYear && all !== "true") {
      return res.json({ users: [] });
    }

    if (email && email.trim()) {
      filter.email = { $regex: escapeRegex(email.trim()), $options: "i" };
    } else if (q && q.trim().length >= 3) {
      const text = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ name: text }, { email: text }, { rollNumber: text }];
    }

    res.json({ users: await findUsersByScore(filter, limit) });
  } catch (err) {
    log.error("Error searching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /api/users/set-user-type { userId, userType } */
const setUserType = async (req, res) => {
  try {
    const { userId, userType } = req.body;

    if (!userId || !userType) {
      return res.status(400).json({
        message: "Missing required fields: userId and userType are required",
      });
    }
    if (!USER_TYPES.includes(userType)) {
      return res.status(400).json({
        message: 'Invalid userType: Must be "user", "admin", or "teacher"',
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json(NOT_FOUND);

    const previous = user.userType || "user";
    user.userType = userType;
    await user.save();

    // Role changes are security events: logged with ids, never emails.
    log.info(`user type changed by ${req.user.id}: ${user._id} ${previous} -> ${userType}`);

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
    log.error("Error setting user type:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/users/stats
 * Public by design: the landing page shows how many students, teachers and coding questions the platform has to
 * visitors who are not signed in. Only three counts are exposed. The counts are kept for five minutes, so a
 * page that is shared widely does not become a stream of count queries.
 */
const PUBLIC_STATS_TTL_MS = 5 * 60 * 1000;
let publicStatsCache = { at: 0, body: null };

const getPublicStats = async (req, res) => {
  try {
    if (publicStatsCache.body && Date.now() - publicStatsCache.at < PUBLIC_STATS_TTL_MS) {
      return res.json(publicStatsCache.body);
    }
    const Question = require("../models/Question");
    const [totalStudents, totalTeachers, totalQuestions] = await Promise.all([
      User.countDocuments({ userType: "user" }),
      User.countDocuments({ userType: "teacher" }),
      Question.countDocuments({}),
    ]);
    publicStatsCache = { at: Date.now(), body: { totalStudents, totalTeachers, totalQuestions } };
    return res.json(publicStatsCache.body);
  } catch (error) {
    log.error("Error fetching public stats:", error);
    return res.status(500).json({ message: "Error fetching statistics" });
  }
};
module.exports = {
  getPublicStats,
  getCurrentUser,
  getPublicProfile,
  getProfileImage,
  proxyProfileImage,
  searchUsers,
  setUserType,
};
