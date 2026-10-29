/**
 * /api/leaderboard
 *
 * This file only wires URLs to controllers/leaderboardController and applies
 * authentication and rate limiting.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const staffOnly = require("../middleware/staffOnly");
const leaderboardController = require("../controllers/leaderboardController");

const router = express.Router();

// ─── Rate limiting ──────────────────────────────────────────────────────────

// The full leaderboard and export read every user and profile, so they are
// limited per signed-in user (these routes run after `auth`).
const heavyReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many leaderboard requests. Please try again shortly." },
});

// The landing page is public, so it is limited per IP.
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again shortly." },
});

// ─── Routes ─────────────────────────────────────────────────────────────────

// Signed-in users
router.get("/", auth, heavyReadLimiter, leaderboardController.getLeaderboard);
// Staff only: the export carries every student's email, mobile number and roll number.
router.get(
  "/export",
  auth,
  staffOnly("Access denied. Admin or Teacher only."),
  heavyReadLimiter,
  leaderboardController.exportLeaderboard,
);
router.get("/top/:count", auth, leaderboardController.getTopUsers);
router.get("/academic-year-config", auth, leaderboardController.getAcademicYearConfig);

// Public (landing page)
router.get("/public/top10", publicLimiter, leaderboardController.getPublicTop10);

module.exports = router;
