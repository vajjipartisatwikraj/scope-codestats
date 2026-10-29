/**
 * Cohorts routes. Listing, viewing, creating, editing, duplicating, deleting and enrolling in cohorts.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/cohortController and applies login and admin checks.
 */
const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/auth");
const cohortController = require("../../controllers/cohorts/cohortController");

const router = express.Router();

// ─── Browse ──────────────────────────────────────────────────────────────────

// All cohorts with minimal data, for the admin list
router.get("/admin", [auth, adminAuth], cohortController.getAdminCohorts);
// The cohorts the signed-in student is eligible for, with their progress
router.get("/", auth, cohortController.getMyCohorts);
// One cohort for the admin view
router.get("/admin/:id", [auth, adminAuth], cohortController.getAdminCohort);
// One cohort for a student, with modules, progress and leaderboard. Opening an exam cohort starts the student's clock
router.get("/:id", auth, cohortController.getCohort);

// ─── Manage (admin or teacher) ───────────────────────────────────────────────

// Create a cohort
router.post("/", [auth, adminAuth], cohortController.createCohort);
// Duplicate a cohort. The copy shares the same modules and questions
router.post("/:id/duplicate", [auth, adminAuth], cohortController.duplicateCohort);
// Edit a cohort
router.put("/:id", [auth, adminAuth], cohortController.updateCohort);
// What deleting the cohort would remove, shown before the admin confirms
router.get("/:id/deletion-impact", [auth, adminAuth], cohortController.getDeletionImpact);
// Delete a cohort
router.delete("/:id", [auth, adminAuth], cohortController.deleteCohort);

// ─── Enrollment (students) ───────────────────────────────────────────────────

// Enroll an eligible student
router.post("/:id/enroll", auth, cohortController.enrollInCohort);

module.exports = router;
