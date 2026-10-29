/**
 * Questions routes. The questions of a module: viewing, exporting, adding (one or in bulk), editing and deleting them.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/questionController and applies login and admin checks.
 */
const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/auth");
const codeExecutionController = require("../../controllers/codeExecutionController");
const { submissionRateLimiter } = require("../../middleware/redisRateLimiter");
const questionController = require("../../controllers/cohorts/questionController");

const router = express.Router();

// ─── Question editor tool (admin or teacher) ─────────────────────────────────
//######## FUTURE ENHANCEMENT REQUIRED########?//
// Checks every test case against the solution code while a question is written
router.post(
  "/submit-code-combined",
  [auth, adminAuth],
  submissionRateLimiter,
  codeExecutionController.submitCodeCombined,
);

// ─── Browse and export ───────────────────────────────────────────────────────

// The questions of a module, with only the fields the list needs
router.get("/:cohortId/modules/:moduleId/questions", auth, questionController.getModuleQuestions);
// Export the questions of a module as JSON
router.get(
  "/:cohortId/modules/:moduleId/questions/export",
  [auth, adminAuth],
  questionController.exportModuleQuestions,
);
// One question with its details
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId",
  auth,
  questionController.getQuestion,
);
// The editorial. Only students who have solved the question can read it
router.get(
  "/:cohortId/questions/:questionId/editorial",
  auth,
  questionController.getQuestionEditorial,
);

// ─── Create, edit, delete (admin or teacher) ─────────────────────────────────

// A question with every field, for the edit form
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/edit",
  [auth, adminAuth],
  questionController.getQuestionForEdit,
);
// Add a question. It is shared by all related cohorts
router.post(
  "/:cohortId/modules/:moduleId/questions",
  [auth, adminAuth],
  questionController.createQuestion,
);
// Add many questions from JSON files in one all-or-nothing upload
router.post(
  "/:cohortId/modules/:moduleId/questions/bulk",
  [auth, adminAuth],
  questionController.bulkCreateQuestions,
);
// Edit a question. This affects all related cohorts
router.put(
  "/:cohortId/modules/:moduleId/questions/:questionId",
  [auth, adminAuth],
  questionController.updateQuestion,
);
// Delete a question from all related cohorts
router.delete(
  "/:cohortId/modules/:moduleId/questions/:questionId",
  [auth, adminAuth],
  questionController.deleteQuestion,
);

module.exports = router;
