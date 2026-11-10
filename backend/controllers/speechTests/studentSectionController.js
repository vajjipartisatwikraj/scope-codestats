/**
 * Speech tests, student side: working through one section. Open it, submit it, retry a failed one.
 *
 * Wired to URLs in routes/speechTests.js (/api/speech-tests/:id/sections/:sectionId/...), which
 * also applies the login check.
 */
const SpeechTestAnswer = require("../../models/SpeechTestAnswer");
const SpeechTestAttempt = require("../../models/SpeechTestAttempt");
const engine = require("../../services/speechTestService");
const { windowState, attemptSectionOf } = require("../../services/speechTestState");
const { ServiceError } = require("../../utils/ServiceError");
const { handle, loadStudentTest, findSection } = require("./common");
const { serializeAttempt } = require("./serializers");

/**
 * Starts a section's clock, or resumes it after a reload or crash.
 *
 * The deadline is set here, once, and kept on the server. Resuming does not
 * restart or pause it: the section stays open for exactly its time limit.
 */
const startSection = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const section = findSection(test, req.params.sectionId);
  const now = new Date();

  let attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  if (!attempt) throw new ServiceError(409, "Start the test first");
  if (attempt.status !== "in_progress") throw new ServiceError(409, "You have already ended this test");

  let state = attemptSectionOf(attempt, section._id);
  if (!state) throw new ServiceError(409, "This section is not part of your attempt");

  if (state.status === "in_progress") {
    if (now >= state.deadlineAt) {
      await engine.submitSection(attempt._id, section._id, { auto: true, now });
      throw new ServiceError(409, "Time is up for this section. Your answers were submitted.", {
        code: "SECTION_TIME_UP",
      });
    }
  } else if (state.status === "not_started") {
    await openSection({ attempt, test, section, now });
  } else {
    throw new ServiceError(409, "This section has already been submitted", {
      code: "SECTION_SUBMITTED",
    });
  }

  attempt = await SpeechTestAttempt.findById(attempt._id);
  state = attemptSectionOf(attempt, section._id);

  const saved = await SpeechTestAnswer.find({
    attempt: attempt._id,
    sectionId: section._id,
  }).select("-audio");

  res.json({
    serverTime: new Date(),
    attemptId: attempt._id,
    section: {
      _id: section._id,
      title: section.title,
      type: section.type,
      instructions: section.instructions,
      timeLimitMinutes: section.timeLimitMinutes,
      startedAt: state.startedAt,
      deadlineAt: state.deadlineAt,
      position: test.sections.findIndex((s) => String(s._id) === String(section._id)) + 1,
      totalSections: test.sections.length,
    },
    questions: section.questions.map((q) => engine.toStudentQuestion(section, q, attempt._id)),
    answers: saved.map((a) => ({
      questionId: a.questionId,
      kind: a.kind,
      durationS: a.durationS,
      text: a.kind === "text" ? a.text : "",
    })),
  });
});

/** Moves a not-started section to in_progress and sets its deadline. */
async function openSection({ attempt, test, section, now }) {
  if (windowState(test, now) !== "live") {
    throw new ServiceError(403, "This test is not live");
  }

  const running = attempt.sections.find((s) => s.status === "in_progress");
  if (running) {
    throw new ServiceError(409, "Finish the section you have open first", {
      code: "SECTION_ALREADY_RUNNING",
      runningSectionId: running.sectionId,
    });
  }

  // Only one section may be open at a time, enforced in the write itself so
  // two tabs cannot both win.
  const started = await SpeechTestAttempt.updateOne(
    {
      _id: attempt._id,
      sections: { $not: { $elemMatch: { status: "in_progress" } } },
    },
    {
      $set: {
        "sections.$[s].status": "in_progress",
        "sections.$[s].startedAt": now,
        "sections.$[s].deadlineAt": engine.computeDeadline(test, section, now),
      },
    },
    { arrayFilters: [{ "s.sectionId": section._id, "s.status": "not_started" }] }
  );

  if ((started.modifiedCount ?? started.nModified ?? 0) === 0) {
    throw new ServiceError(409, "Could not start this section. Please try again.");
  }
}

/** Submits a section. Returns immediately; scoring continues in the background. */
const submitSection = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const section = findSection(test, req.params.sectionId);

  const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  const state = attempt && attemptSectionOf(attempt, section._id);
  if (!attempt || !state) throw new ServiceError(409, "Start the test first");
  if (state.status === "not_started") throw new ServiceError(409, "Start this section first");

  if (state.status === "in_progress") {
    const now = new Date();
    const timedOut = now >= new Date(state.deadlineAt);
    await engine.submitSection(attempt._id, section._id, {
      auto: req.body?.auto === true || timedOut,
      now,
    });
  }
  // Any other status means it was already submitted: report the current state.

  const fresh = await SpeechTestAttempt.findById(attempt._id);
  res.json({ serverTime: new Date(), attempt: serializeAttempt(fresh, test) });
});

/** Re-queues a section whose scoring failed. The answers are still stored. */
const retrySection = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const section = findSection(test, req.params.sectionId);

  const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  const state = attempt && attemptSectionOf(attempt, section._id);
  if (!attempt || !state) throw new ServiceError(409, "Start the test first");
  if (state.status !== "failed") throw new ServiceError(409, "Only a failed section can be retried");

  await engine.retrySection(attempt._id, section._id);
  const fresh = await SpeechTestAttempt.findById(attempt._id);
  res.json({ serverTime: new Date(), attempt: serializeAttempt(fresh, test) });
});

module.exports = { startSection, submitSection, retrySection };
