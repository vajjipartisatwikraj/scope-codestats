/**
 * Exam attempts routes. A student's exam attempt: the live status and clock, proctoring events, and finishing the exam.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/examController and applies login and admin checks.
 */
const express = require("express");
const auth = require("../../middleware/auth");
const examController = require("../../controllers/cohorts/examController");

const router = express.Router();

// ─── Exam attempt (students) ─────────────────────────────────────────────────

// Live exam state for the countdown and the exam guard
router.get("/:id/exam-status", auth, examController.getExamStatus);
// Record a proctoring event, such as leaving fullscreen
router.post("/:id/proctor/event", auth, examController.recordProctorEvent);
// A student ends their exam attempt
router.post("/:id/exam/finish", auth, examController.finishExam);

module.exports = router;
