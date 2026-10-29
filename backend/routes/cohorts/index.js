/**
 * /api/cohorts
 *
 * Cohort routes, split by what they work on. Each file wires its URLs to a controller in
 * controllers/cohorts/ and applies the login and admin checks.
 *
 *   cohort        cohorts: browse, create, edit, delete, enroll
 *   userGroup     user groups attached to a cohort; they decide who is eligible (admin)
 *   exam          a student's exam attempt
 *   analytics     statistics, progress, leaderboard, exam report
 *   module        modules of a cohort
 *   question      questions of a module
 *   sqlQuestion   SQL questions (authoring and solving)
 *   submission    submitting and reading submissions
 *   note          a student's notes on a question
 *   report        reports about a question
 *   feedback      ratings and reviews of a cohort
 *
 * Order matters where a fixed word and an id share a position: "/admin" must be tried
 * before "/:id", so the cohort routes come first.
 */
const express = require("express");

const router = express.Router();

router.use(require("./cohort.routes"));
router.use(require("./userGroup.routes"));
router.use(require("./exam.routes"));
router.use(require("./analytics.routes"));
router.use(require("./module.routes"));
router.use(require("./question.routes"));
router.use(require("./sqlQuestion.routes"));
router.use(require("./submission.routes"));
router.use(require("./note.routes"));
router.use(require("./report.routes"));
router.use(require("./feedback.routes"));

module.exports = router;
