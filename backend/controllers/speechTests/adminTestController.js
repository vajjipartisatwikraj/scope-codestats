/**
 * Speech tests, teacher and admin side: author, schedule, publish and delete a test.
 *
 * Wired to URLs in routes/speechTests.js (/api/speech-tests/admin), which also applies the
 * login and admin checks.
 */
const mongoose = require("mongoose");

const SpeechTest = require("../../models/SpeechTest");
const SpeechTestAnswer = require("../../models/SpeechTestAnswer");
const SpeechTestAttempt = require("../../models/SpeechTestAttempt");
const SpeechTestFeedback = require("../../models/SpeechTestFeedback");
const speechJudge = require("../../services/speechJudgeClient");
const feedbackService = require("../../services/speechTestFeedback");
const authoring = require("../../services/speechTestAuthoring");
const { windowState, isValidId } = require("../../services/speechTestState");
const { ServiceError } = require("../../utils/ServiceError");
const { handle, loadTestById } = require("./common");

const { ObjectId } = mongoose.Types;

/** Diagnostics: is the judge reachable and ready? */
const judgeStatus = handle(async (_req, res) => {
  const status = { configured: speechJudge.isConfigured(), baseUrl: speechJudge.BASE_URL };
  try {
    status.ready = await speechJudge.ready();
  } catch (error) {
    status.error = error.message;
  }
  res.json(status);
});

const listTests = handle(async (_req, res) => {
  const tests = await SpeechTest.find()
    .sort({ startTime: -1 })
    .select("-eligibleUsers")
    .populate("createdBy", "name")
    .lean();

  const eligibleCounts = await SpeechTest.aggregate([
    { $project: { count: { $size: { $ifNull: ["$eligibleUsers", []] } } } },
  ]);
  const attemptCounts = await SpeechTestAttempt.aggregate([
    {
      $group: {
        _id: "$test",
        attempts: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      },
    },
  ]);

  const eligibleById = new Map(eligibleCounts.map((c) => [String(c._id), c.count]));
  const attemptsById = new Map(attemptCounts.map((c) => [String(c._id), c]));
  const feedbackById = await feedbackService.countsByTest();
  const now = new Date();

  res.json({
    tests: tests.map((test) => ({
      _id: test._id,
      title: test.title,
      description: test.description,
      startTime: test.startTime,
      endTime: test.endTime,
      isPublished: test.isPublished,
      state: windowState(test, now),
      sectionCount: test.sections.length,
      questionCount: test.sections.reduce((sum, s) => sum + s.questions.length, 0),
      eligibleCount: eligibleById.get(String(test._id)) || 0,
      attemptCount: attemptsById.get(String(test._id))?.attempts || 0,
      completedCount: attemptsById.get(String(test._id))?.completed || 0,
      feedbackCount: feedbackById.get(String(test._id))?.count || 0,
      feedbackAverage: feedbackById.get(String(test._id))?.average ?? null,
      createdBy: test.createdBy?.name || "",
      sections: test.sections.map((s) => ({ _id: s._id, title: s.title, type: s.type })),
    })),
  });
});

const createTest = handle(async (req, res) => {
  const body = req.body || {};
  const title = String(body.title || "").trim();
  if (!title) throw new ServiceError(400, "Title is required");

  const { startTime, endTime } = authoring.parseTimes(body);
  const sections = authoring.normalizeSections(body.sections);

  const test = await SpeechTest.create({
    title,
    description: String(body.description || "").trim(),
    instructions: String(body.instructions || "").trim(),
    startTime,
    endTime,
    sections,
    createdBy: req.user.id,
  });

  res.status(201).json({ test });
});

const getTest = handle(async (req, res) => {
  const test = await loadTestById(req, { select: "-eligibleUsers", lean: true });

  const attemptCount = await SpeechTestAttempt.countDocuments({ test: test._id });
  const eligibleCount =
    (await SpeechTest.findById(test._id).select("eligibleUsers").lean())?.eligibleUsers?.length || 0;

  res.json({ test: { ...test, state: windowState(test) }, attemptCount, eligibleCount });
});

const updateTest = handle(async (req, res) => {
  const test = await loadTestById(req);

  const body = req.body || {};
  const title = body.title !== undefined ? String(body.title).trim() : test.title;
  if (!title) throw new ServiceError(400, "Title is required");

  const { startTime, endTime } = authoring.parseTimes(body, test);

  const knownSectionIds = new Set(test.sections.map((s) => String(s._id)));
  let hasAttempts = false;

  if (body.sections !== undefined) {
    const sections = authoring.normalizeSections(body.sections);
    hasAttempts = Boolean(await SpeechTestAttempt.exists({ test: test._id }));

    // Once students have started, what they were tested on must stay as it
    // was, so only additions are accepted: new sections and new questions.
    if (hasAttempts && !authoring.onlyAppends(sections, test.sections.toObject())) {
      throw new ServiceError(
        409,
        "Students have already started this test. You can add sections and questions, but existing ones can no longer be changed or removed."
      );
    }
    test.sections = sections;
  }

  test.title = title;
  if (body.description !== undefined) test.description = String(body.description).trim();
  if (body.instructions !== undefined) test.instructions = String(body.instructions).trim();
  test.startTime = startTime;
  test.endTime = endTime;

  if (test.isPublished) {
    const problems = authoring.publishProblems(test);
    if (problems.length > 0) {
      throw new ServiceError(400, "A published test must stay complete", { problems });
    }
  }

  await test.save();

  // Students who are mid-test get any new section as "not started".
  const addedSections = hasAttempts ? test.sections.filter((s) => !knownSectionIds.has(String(s._id))) : [];
  if (addedSections.length > 0) {
    await SpeechTestAttempt.updateMany(
      { test: test._id, status: "in_progress" },
      { $push: { sections: { $each: addedSections.map((s) => ({ sectionId: s._id, status: "not_started" })) } } }
    );
  }

  res.json({ test });
});

const setPublished = handle(async (req, res) => {
  const test = await loadTestById(req);
  const publish = req.body?.publish !== false;

  if (publish) {
    const problems = authoring.publishProblems(test);
    if (problems.length > 0) {
      throw new ServiceError(400, "This test is not ready to publish", { problems });
    }
    if (test.eligibleUsers.length === 0) {
      throw new ServiceError(400, "Add at least one eligible student before publishing", {
        problems: ["Add at least one eligible student"],
      });
    }
  }

  test.isPublished = publish;
  await test.save();
  res.json({ test: { _id: test._id, isPublished: test.isPublished } });
});

const deleteTest = handle(async (req, res) => {
  const test = await loadTestById(req, { select: "_id" });

  await Promise.all([
    SpeechTestAnswer.deleteMany({ test: test._id }),
    SpeechTestAttempt.deleteMany({ test: test._id }),
    SpeechTestFeedback.deleteMany({ test: test._id }),
  ]);
  await SpeechTest.deleteOne({ _id: test._id });

  res.json({ message: "Test deleted" });
});

/** What students said about this test: totals, averages, spread and latest comments. */
const getFeedbackSummary = handle(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ServiceError(404, "Test not found");
  const exists = await SpeechTest.exists({ _id: req.params.id });
  if (!exists) throw new ServiceError(404, "Test not found");

  res.json({ summary: await feedbackService.summarize(new ObjectId(req.params.id)) });
});

module.exports = {
  judgeStatus,
  listTests,
  createTest,
  getTest,
  updateTest,
  setPublished,
  deleteTest,
  getFeedbackSummary,
};
