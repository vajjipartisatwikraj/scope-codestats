/**
 * SQL questions routes. SQL questions: authoring them against the SQLJudge engine, and solving them.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/sqlQuestionController and applies login and admin checks.
 */
const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/auth");
const sqlQuestionController = require("../../controllers/cohorts/sqlQuestionController");

const router = express.Router();

// ─── Authoring (admin or teacher) ────────────────────────────────────────────

// Run the solution against the seeds and return the expected rows. Nothing is saved
router.post(
  "/:cohortId/modules/:moduleId/sql-questions/generate-outputs",
  [auth, adminAuth],
  sqlQuestionController.generateOutputs,
);
// Re-run the solution and compare it with the expected rows that were supplied
router.post(
  "/:cohortId/modules/:moduleId/sql-questions/validate",
  [auth, adminAuth],
  sqlQuestionController.validateTestcases,
);
// Publish the question to SQLJudge, then save it in the module
router.post(
  "/:cohortId/modules/:moduleId/sql-questions",
  [auth, adminAuth],
  sqlQuestionController.publishSqlQuestion,
);

// ─── Solving (students) ──────────────────────────────────────────────────────

// Schema, starting query and visible test cases for the solving screen
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/sql/context",
  auth,
  sqlQuestionController.getSqlContext,
);
// Run a query against the visible test cases
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/sql/run",
  auth,
  sqlQuestionController.runSqlQuery,
);

module.exports = router;
