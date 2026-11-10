/**
 * Speech tests, student side: the test list and overview, opening and ending the test,
 * feedback, section results and the ranking.
 *
 * Wired to URLs in routes/speechTests.js (/api/speech-tests), which also applies the login check.
 */
const SpeechTest = require("../../models/SpeechTest");
const SpeechTestAttempt = require("../../models/SpeechTestAttempt");
const SpeechTestFeedback = require("../../models/SpeechTestFeedback");
const User = require("../../models/User");
const engine = require("../../services/speechTestService");
const feedbackService = require("../../services/speechTestFeedback");
const { buildSectionReport } = require("../../services/speechTestReport");
const { buildLeaderboard } = require("../../services/speechTestLeaderboard");
const { windowState, attemptSectionOf } = require("../../services/speechTestState");
const { ServiceError } = require("../../utils/ServiceError");
const { handle, isStaff, loadStudentTest, loadTestById, findSection } = require("./common");
const { serializeTestForStudent, serializeAttempt, summarizeTest } = require("./serializers");

const listMyTests = handle(async (req, res) => {
  const now = new Date();
  const tests = await SpeechTest.find({ isPublished: true, eligibleUsers: req.user.id })
    .sort({ startTime: -1 })
    .select("-eligibleUsers")
    .lean();

  const attempts = await SpeechTestAttempt.find({
    user: req.user.id,
    test: { $in: tests.map((t) => t._id) },
  }).lean();
  const attemptByTest = new Map(attempts.map((a) => [String(a.test), a]));

  res.json({
    serverTime: now,
    tests: tests.map((test) => ({
      ...serializeTestForStudent(test, now),
      attempt: serializeAttempt(attemptByTest.get(String(test._id)), test),
    })),
  });
});

/** Test overview plus the student's attempt. The page polls this for results. */
const getTest = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  const feedbackDone = attempt ? Boolean(await SpeechTestFeedback.exists({ attempt: attempt._id })) : false;

  res.json({
    serverTime: new Date(),
    test: serializeTestForStudent(test),
    attempt: serializeAttempt(attempt, test),
    // True once the student has sent feedback or skipped the form.
    feedbackDone,
  });
});

/**
 * Stores the student's feedback on a finished test, or records that they
 * skipped the form. Only possible once the test has been ended, and only once.
 */
const sendFeedback = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  if (!attempt || attempt.status !== "completed") {
    throw new ServiceError(409, "Feedback opens once you have finished the test");
  }

  let fields;
  try {
    fields = feedbackService.parseFeedback(req.body);
  } catch (error) {
    throw new ServiceError(error.status || 400, error.message);
  }

  // Insert-only: the unique index on `attempt` turns a second send into a conflict.
  try {
    await SpeechTestFeedback.create({ test: test._id, attempt: attempt._id, user: req.user.id, ...fields });
  } catch (error) {
    if (error?.code === 11000) throw new ServiceError(409, "You have already sent feedback for this test");
    throw error;
  }

  res.status(201).json({ message: fields.status === "skipped" ? "Skipped" : "Thank you for your feedback" });
});

/**
 * Detailed results of one scored section: the student's details, a breakdown
 * for every question, and how they compare with the batch.
 */
const getSectionResults = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const section = findSection(test, req.params.sectionId);

  const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  const attemptSection = attempt && attemptSectionOf(attempt, section._id);
  if (!attemptSection || attemptSection.status !== "scored") {
    throw new ServiceError(409, "The results for this section are not ready yet");
  }

  const user = await User.findById(req.user.id).select("name rollNumber department section graduatingYear");
  const report = await buildSectionReport({ test, section, attempt, attemptSection, user });
  res.json({ serverTime: new Date(), report });
});

/** Opens the test for the student. Idempotent: a second call returns the same attempt. */
const startTest = handle(async (req, res) => {
  const test = await loadStudentTest(req);

  const existing = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  if (!existing) {
    const state = windowState(test);
    if (state === "upcoming") throw new ServiceError(403, "This test has not started yet");
    if (state === "ended") throw new ServiceError(403, "This test has ended");
  }

  const attempt = existing || (await engine.getOrCreateAttempt(test, req.user.id));
  res.json({
    serverTime: new Date(),
    test: serializeTestForStudent(test),
    attempt: serializeAttempt(attempt, test),
  });
});

/**
 * Ends the test, whatever state the sections are in. Scored sections keep their score; sections
 * that are open, waiting for a score or failed become `unscored`, and sections never started stay
 * as they are. All of them count as 0 in the final score.
 */
const endTest = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  if (!attempt) throw new ServiceError(409, "You have not started this test");

  if (attempt.status === "in_progress") {
    await engine.discardUnscoredSections(attempt._id);
    const current = await SpeechTestAttempt.findById(attempt._id);
    await engine.finalizeAttempt(current, test, "student");
  }

  const fresh = await SpeechTestAttempt.findById(attempt._id);
  res.json({ serverTime: new Date(), attempt: serializeAttempt(fresh, test) });
});

/** Ranking of a test. Staff may see any test; students only the ones they are eligible for. */
const getLeaderboard = handle(async (req, res) => {
  const test = isStaff(req)
    ? await loadTestById(req, { select: "title sections" })
    : await loadStudentTest(req);

  const entries = await buildLeaderboard(test);
  res.json({ test: summarizeTest(test), entries });
});

module.exports = {
  listMyTests,
  getTest,
  sendFeedback,
  getSectionResults,
  startTest,
  endTest,
  getLeaderboard,
};
