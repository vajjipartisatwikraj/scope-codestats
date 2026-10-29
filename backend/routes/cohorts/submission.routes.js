/**
 * Submissions routes. Submitting an answer (graded on the server), and reading submissions.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/submissionController and applies login and admin checks.
 */
const express = require("express");
const auth = require("../../middleware/auth");
const { submissionRateLimiter } = require("../../middleware/redisRateLimiter");
const submissionController = require("../../controllers/cohorts/submissionController");

const router = express.Router();

// A programming submission runs the code on Judge0, so it has the 5 second cooldown that the
// old "run all test cases" request had. MCQ and SQL submissions do not, so answering two
// questions quickly never gets blocked.
const limitProgrammingSubmissions = (req, res, next) =>
  req.body?.submissionType === "programming" ? submissionRateLimiter(req, res, next) : next();

// ─── Submissions ─────────────────────────────────────────────────────────────

// Submit an answer. MCQ, programming and SQL answers are all graded on the server.
// A programming answer is run once, and the response carries the test results to show
// (`execution`) next to the saved submission.
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/submit",
  auth,
  limitProgrammingSubmissions,
  submissionController.submitAnswer,
);
// Other students' submissions, shown once the student has submitted their own
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/all-submissions",
  auth,
  submissionController.getAllSubmissions,
);
// The signed-in student's submissions for a question
router.get(
  "/:cohortId/questions/:questionId/submissions",
  auth,
  submissionController.getMySubmissions,
);

module.exports = router;
