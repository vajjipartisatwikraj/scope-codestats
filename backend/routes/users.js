/**
 * /api/users
 *
 * This file only wires URLs to controllers/userController and applies
 * authentication and rate limiting. Queries and response shapes are in
 * services/userProfileService.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const staffOnly = require("../middleware/staffOnly");
const adminOnly = require("../middleware/adminOnly");
const publicProfileRateLimit = require("../middleware/publicProfileRateLimit");
const userController = require("../controllers/userController");

const router = express.Router();

// ─── Public numbers (landing page) ──────────────────────────────────────────
// Three counts, open to everyone and limited per IP. Declared before the profile routes so that "stats" is never
// read as a username.
const publicStatsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again shortly." },
});
router.get("/stats", publicStatsLimiter, userController.getPublicStats);
// ─── Signed-in user ─────────────────────────────────────────────────────────

router.get("/me", auth, userController.getCurrentUser);

// ─── Staff only (admin or teacher) ──────────────────────────────────────────

router.get(
  "/search",
  auth,
  staffOnly("Access denied. Admin or Teacher only."),
  userController.searchUsers,
);
// Changing a role is admin only. A teacher must not be able to promote anyone.
router.post("/set-user-type", auth, adminOnly, userController.setUserType);

// ─── Profile pictures ───────────────────────────────────────────────────────

router.get("/profile-image/:userId", userController.getProfileImage);
router.get("/profile-image-proxy/:userId", userController.proxyProfileImage);

// ─── Profile pages (username = the part of the email before the "@") ────────

// The one profile page, open to everyone and limited per IP (2 requests per second; going
// over blocks the IP for 1 minute). There is no other profile route: what a visitor can see
// is decided in services/userProfileService.
router.get("/public/:username", publicProfileRateLimit, userController.getPublicProfile);

module.exports = router;
