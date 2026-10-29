/**
 * Notes routes. A student's private notes on a question.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/noteController and applies login and admin checks.
 */
const express = require("express");
const auth = require("../../middleware/auth");
const noteController = require("../../controllers/cohorts/noteController");

const router = express.Router();

// ─── Notes ───────────────────────────────────────────────────────────────────

// The student's notes on a question
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/notes",
  auth,
  noteController.getNotes,
);
// Save the student's notes on a question
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/notes",
  auth,
  noteController.saveNote,
);

module.exports = router;
