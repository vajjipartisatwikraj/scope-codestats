/**
 * Analytics routes. Cohort statistics, progress, the leaderboard, and the exam report export.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/analyticsController and applies login and admin checks.
 */
const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/auth");
const analyticsController = require("../../controllers/cohorts/analyticsController");

const router = express.Router();

// ─── Statistics, progress and leaderboard ────────────────────────────────────

// Enrollment, completion and per-module completion rates
router.get("/:id/stats", auth, analyticsController.getCohortStats);
// Quick counts for the cohort list
router.get("/:id/progress", auth, analyticsController.getCohortProgress);
// The cohort's students ranked by score
router.get("/:cohortId/leaderboard", auth, analyticsController.getCohortLeaderboard);

// ─── Exam report (admin or teacher) ──────────────────────────────────────────

// Excel report of an exam cohort
router.get("/:id/exam-report/export", [auth, adminAuth], analyticsController.exportExamReport);

module.exports = router;
