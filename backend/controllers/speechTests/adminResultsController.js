/**
 * Speech tests, teacher and admin side: results, the Excel export and removing a submission.
 *
 * Wired to URLs in routes/speechTests.js (/api/speech-tests/admin/:id/...), which also applies
 * the login and admin checks.
 */
const SpeechTestAnswer = require("../../models/SpeechTestAnswer");
const SpeechTestAttempt = require("../../models/SpeechTestAttempt");
const SpeechTestFeedback = require("../../models/SpeechTestFeedback");
const exportService = require("../../services/speechTestExportService");
const { buildLeaderboard } = require("../../services/speechTestLeaderboard");
const { loadProgress } = require("../../services/speechTestProgress");
const { isValidId } = require("../../services/speechTestState");
const { ServiceError } = require("../../utils/ServiceError");
const { handle, loadTestById } = require("./common");
const { summarizeTest } = require("./serializers");

/** Ranked results of a test, including students who have not finished. */
const getResults = handle(async (req, res) => {
  const test = await loadTestById(req, { select: "title sections startTime endTime" });

  const entries = await buildLeaderboard(test, { includeInProgress: true });
  res.json({ test: summarizeTest(test), entries });
});

/**
 * How the students a staff member mentors are doing: the numbers, the ranked students and the ones
 * who have not started. Filters: ?mentorship=<id|all> and, for admins, &mentor=<id|all>. A teacher
 * always sees their own students.
 */
const getProgress = handle(async (req, res) => {
  const test = await loadTestById(req, { lean: true });

  const query = { mentorship: req.query.mentorship || "all", mentor: req.query.mentor || "all" };
  const { entries, notStarted, stats, filters } = await loadProgress(test, req.user, query);
  res.json({ test: summarizeTest(test), stats, filters, entries, notStarted });
});

/**
 * The complete results of a test as an Excel workbook: the leaderboard of every eligible student with
 * all section scores and their mentors, a sheet per section and per question, and the feedback
 * students sent. With ?mentorship= and ?mentor= (the progress page's filters) it covers those
 * students only, and a single mentorship adds a sheet that compares its mentors, with charts.
 */
const exportResults = handle(async (req, res) => {
  const test = await loadTestById(req, { lean: true });

  const progress = await loadProgress(test, req.user, req.query);
  const buffer = await exportService.buildSpeechTestWorkbook({ test, ...progress });
  const filename = exportService.exportFileName(test);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.setHeader("Content-Length", buffer.length);
  res.send(Buffer.from(buffer));
});

/**
 * Deletes one student's submission (their attempt and any saved answers).
 *
 * The student is no longer shown as having taken the test, so they can start it
 * again as long as the test window is still open. Anything the speech judge is
 * still scoring for the deleted attempt is simply discarded when it returns.
 */
const deleteAttempt = handle(async (req, res) => {
  if (!isValidId(req.params.id) || !isValidId(req.params.attemptId)) {
    throw new ServiceError(404, "Submission not found");
  }

  const attempt = await SpeechTestAttempt.findOne({
    _id: req.params.attemptId,
    test: req.params.id,
  }).select("_id");
  if (!attempt) throw new ServiceError(404, "Submission not found");

  await SpeechTestAnswer.deleteMany({ attempt: attempt._id });
  await SpeechTestFeedback.deleteMany({ attempt: attempt._id });
  await SpeechTestAttempt.deleteOne({ _id: attempt._id });

  res.json({ message: "Submission deleted. The student can take the test again." });
});

module.exports = { getResults, getProgress, exportResults, deleteAttempt };
