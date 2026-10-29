/**
 * Question reports routes. Reports that students raise about a question, and how staff handle them.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/reportController and applies login and admin checks.
 */
const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/auth");
const reportController = require("../../controllers/cohorts/reportController");

const router = express.Router();

// ─── Raise and read reports ──────────────────────────────────────────────────

// Report a problem with a question
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/report",
  auth,
  reportController.createReport,
);
// The reports on one question
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/reports",
  auth,
  reportController.getQuestionReports,
);

// ─── Handle reports ──────────────────────────────────────────────────────────

// All reports of a cohort
router.get("/:cohortId/reports", [auth, adminAuth], reportController.getCohortReports);
// Update a report's status and reply
router.put("/:cohortId/reports/:reportId", [auth, adminAuth], reportController.updateReport);
// Delete a report
router.delete("/:cohortId/reports/:reportId", auth, reportController.deleteReport);

module.exports = router;
