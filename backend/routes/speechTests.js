/**
 * Speech (communication) tests.
 *
 *   /api/speech-tests/admin/...   teachers and admins: author, schedule, results
 *   /api/speech-tests/...         eligible students: take the test, see ranking
 *
 * Only URLs, middleware and ordering live here; the handlers are in controllers/speechTests/.
 * Grading is delegated to the external SpeechJudge service through
 * services/speechTestService.js.
 *
 * Order matters: fixed paths (/admin/judge/status, /my) come before the /:id patterns.
 */

const express = require("express");

const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const {
  adminTestController,
  adminResultsController,
  studentTestController,
  studentSectionController,
  studentAnswerController,
  userGroupController,
} = require("../controllers/speechTests");
const log = require("../utils/logger").scope("SPEECH-TESTS");

const router = express.Router();

const WAV_TYPES = ["audio/wav", "audio/x-wav", "audio/wave", "application/octet-stream"];
const MAX_AUDIO_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_CHECK_BYTES = 4 * 1024 * 1024;

const staff = [auth, adminAuth];
const rawAudio = (limit) => express.raw({ type: WAV_TYPES, limit });

// ===========================================================================
// ADMIN / TEACHER
// ===========================================================================

router.get("/admin/judge/status", staff, adminTestController.judgeStatus);

router.get("/admin", staff, adminTestController.listTests);
router.post("/admin", staff, adminTestController.createTest);
router.get("/admin/:id", staff, adminTestController.getTest);
router.put("/admin/:id", staff, adminTestController.updateTest);
router.post("/admin/:id/publish", staff, adminTestController.setPublished);
router.delete("/admin/:id", staff, adminTestController.deleteTest);
router.get("/admin/:id/feedback", staff, adminTestController.getFeedbackSummary);

// ----- eligible students (through user groups) ------------------------------

// The groups attached to a test
router.get("/admin/:id/user-groups", staff, userGroupController.listTestUserGroups);
// Add students who joined the attached groups since they were attached. Never removes anyone
router.post("/admin/:id/user-groups/sync", staff, userGroupController.syncUserGroups);
// Attach a group: its students become eligible
router.put("/admin/:id/user-groups/:groupId", staff, userGroupController.attachUserGroup);
// Detach a group. Students no other group covers lose access; ?preview=true shows who
router.delete("/admin/:id/user-groups/:groupId", staff, userGroupController.detachUserGroup);

// ----- results --------------------------------------------------------------

router.get("/admin/:id/results", staff, adminResultsController.getResults);
router.get("/admin/:id/export", staff, adminResultsController.exportResults);
router.delete("/admin/:id/attempts/:attemptId", staff, adminResultsController.deleteAttempt);

// ===========================================================================
// STUDENT
// ===========================================================================

router.get("/my", auth, studentTestController.listMyTests);
router.get("/:id", auth, studentTestController.getTest);
router.post("/:id/feedback", auth, studentTestController.sendFeedback);
router.get("/:id/sections/:sectionId/results", auth, studentTestController.getSectionResults);
router.post("/:id/start", auth, studentTestController.startTest);
router.post("/:id/end", auth, studentTestController.endTest);
router.get("/:id/leaderboard", auth, studentTestController.getLeaderboard);

router.post("/:id/sections/:sectionId/start", auth, studentSectionController.startSection);
router.post("/:id/sections/:sectionId/submit", auth, studentSectionController.submitSection);
router.post("/:id/sections/:sectionId/retry", auth, studentSectionController.retrySection);

router.put(
  "/:id/sections/:sectionId/answers/:questionId",
  auth,
  rawAudio(MAX_AUDIO_UPLOAD_BYTES),
  studentAnswerController.saveAnswer
);
router.post(
  "/:id/audio-check",
  auth,
  rawAudio(MAX_AUDIO_CHECK_BYTES),
  studentAnswerController.checkAudio
);

// Body-parser errors (oversized upload, malformed JSON) carry a status of their own.
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "The recording is too large" });
  }
  if (err?.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }
  log.error("[SpeechTest] unhandled router error:", err);
  return res.status(500).json({ message: "Server error", error: err.message });
});

module.exports = router;
