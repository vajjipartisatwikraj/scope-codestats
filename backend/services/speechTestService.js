/**
 * Speech test engine: section submission, SpeechJudge dispatch, result polling
 * and the background sweeper that keeps all of it moving.
 *
 * Design rules
 *   - The server is the only clock. A section's deadline is stored when it is
 *     started and enforced here, never trusted from the browser.
 *   - Nothing the student produced lives only in the browser. Answers are
 *     written to SpeechTestAnswer as they are given, and a submit builds the
 *     judge request from that collection.
 *   - Submitting never waits for the judge. A section goes `in_progress ->
 *     queued`, and the sweeper (or an immediate kick) dispatches it and later
 *     collects the result, so the student can start the next section at once.
 *   - Every state change is a compare-and-set on the section's current status,
 *     so the sweeper, an immediate kick and a student request can race safely.
 */

const crypto = require("crypto");
const mongoose = require("mongoose");

const SpeechTest = require("../models/SpeechTest");
const SpeechTestAttempt = require("../models/SpeechTestAttempt");
const SpeechTestAnswer = require("../models/SpeechTestAnswer");
const speechJudge = require("./speechJudgeClient");
const { buildQuestionAnalysis } = require("./speechAnalysis");
const { averageSkills } = require("./speechAnalysis/skills");

const { ObjectId } = mongoose.Types;


// Uploads are accepted a little after the deadline so a recording that was
// being saved when the clock hit zero is not lost.
const UPLOAD_GRACE_MS = 20 * 1000;
// A section the student abandoned is auto-submitted once this has also passed.
const AUTO_SUBMIT_GRACE_MS = UPLOAD_GRACE_MS;

const MAX_DISPATCH_ATTEMPTS = 10;
const STUCK_SCORING_MS = 45 * 60 * 1000;
const SWEEP_INTERVAL_MS = Number(process.env.SPEECH_TEST_SWEEP_MS) || 4000;

/** Longest recording the UI allows per question, and the server accepts. */
const MAX_RECORD_SECONDS = {
  READING: 60,
  REPEAT: 45,
  JUMBLED: 60,
  QUESTION_ANSWER: 120,
  STORYTELLING: 170,
};

/** Section types answered by typing or choosing, with no recording. */
const TEXT_ONLY_TYPES = ["FILL_BLANKS", "MCQ", "EMAIL_WRITING"];

/** Longest typed answer accepted per section type (the judge allows up to 10 000). */
const MAX_TEXT_ANSWER_CHARS = {
  JUMBLED: 1000,
  FILL_BLANKS: 500,
  MCQ: 400,
  EMAIL_WRITING: 5000,
};

const toId = (value) => (value instanceof ObjectId ? value : new ObjectId(String(value)));
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Student-facing question shaping
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Scrambles a sentence's words. Seeded, so a reload shows the same order, and
 * guaranteed to differ from the original whenever that is possible.
 */
function shuffleWords(sentence, seedText) {
  const words = String(sentence).trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words;

  const seed = crypto.createHash("sha1").update(seedText).digest().readUInt32BE(0);
  const rand = mulberry32(seed);
  const original = words.join(" ");

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const out = words.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.join(" ") !== original) return out;
  }
  return words.slice().reverse();
}

/**
 * What a student may see of a question.
 *   REPEAT   the text, which the student's browser speaks aloud. The UI never
 *            displays it, but it is present in the response: this is the
 *            trade-off of speaking with the browser instead of stored audio.
 *   JUMBLED  the scrambled words only, never the correct order.
 */
function toStudentQuestion(section, question, attemptId) {
  const base = {
    _id: question._id,
    maxRecordSeconds: MAX_RECORD_SECONDS[section.type],
  };

  switch (section.type) {
    case "REPEAT":
      return {
        ...base,
        text: question.text,
        accent: question.accent || "en-IN",
        gender: question.gender || "female",
      };
    case "JUMBLED":
      return {
        ...base,
        mode: question.jumbledMode,
        words: shuffleWords(question.text, `${attemptId}:${question._id}`),
      };
    case "FILL_BLANKS":
      // The answer key is never sent.
      return { ...base, text: question.text, maxChars: MAX_TEXT_ANSWER_CHARS.FILL_BLANKS };
    case "MCQ":
      // Options without their keys. Only how many are right is shown, so the
      // screen knows whether to offer one choice or two.
      return {
        ...base,
        text: question.text,
        options: (question.options || []).map((o) => ({ id: String(o._id), text: o.text })),
        selectCount: (question.options || []).filter((o) => o.isCorrect).length === 2 ? 2 : 1,
      };
    case "EMAIL_WRITING":
      return { ...base, text: question.text, maxChars: MAX_TEXT_ANSWER_CHARS.EMAIL_WRITING };
    default:
      return { ...base, text: question.text };
  }
}

function questionAnswerKind(section, question) {
  if (section.type === "JUMBLED" && question.jumbledMode === "ui") return "text";
  if (TEXT_ONLY_TYPES.includes(section.type)) return "text";
  return "audio";
}

// ---------------------------------------------------------------------------
// Clock helpers
// ---------------------------------------------------------------------------

/** Deadline for a section started `startedAt`: its own limit, capped by the window. */
function computeDeadline(test, section, startedAt) {
  const own = startedAt.getTime() + section.timeLimitMinutes * 60 * 1000;
  return new Date(Math.min(own, new Date(test.endTime).getTime()));
}

function secondsBetween(from, to) {
  if (!from || !to) return 0;
  return Math.max(0, Math.round((new Date(to) - new Date(from)) / 1000));
}

// ---------------------------------------------------------------------------
// Submitting a section
// ---------------------------------------------------------------------------

/**
 * Moves a running section to `queued`. Idempotent: submitting twice, or racing
 * the auto-submit sweeper, changes nothing the second time.
 *
 * @returns {Promise<boolean>} true when this call performed the submit
 */
async function submitSection(attemptId, sectionId, { auto = false, now = new Date() } = {}) {
  const attempt = await SpeechTestAttempt.findById(attemptId).select("sections");
  const section = attempt?.sections.find((s) => String(s.sectionId) === String(sectionId));
  if (!section || section.status !== "in_progress") return false;

  // Time used never exceeds the deadline, whatever the grace period allowed.
  const closedAt =
    section.deadlineAt && now > section.deadlineAt ? section.deadlineAt : now;

  const result = await SpeechTestAttempt.updateOne(
    { _id: toId(attemptId) },
    {
      $set: {
        "sections.$[s].status": "queued",
        "sections.$[s].submittedAt": now,
        "sections.$[s].autoSubmitted": Boolean(auto),
        "sections.$[s].timeUsedSeconds": secondsBetween(section.startedAt, closedAt),
        "sections.$[s].lockedUntil": null,
        "sections.$[s].lastError": "",
      },
    },
    { arrayFilters: [{ "s.sectionId": toId(sectionId), "s.status": "in_progress" }] }
  );

  const changed = (result.modifiedCount ?? result.nModified ?? 0) > 0;
  if (changed) {
    // Start scoring straight away instead of waiting for the next sweep.
    setImmediate(() => {
      dispatchSection(attemptId, sectionId).catch((err) =>
        console.error("[SpeechTest] immediate dispatch failed:", err.message)
      );
    });
  }
  return changed;
}

/** Puts a failed section back in the queue. Answers are still stored. */
async function retrySection(attemptId, sectionId) {
  const result = await SpeechTestAttempt.updateOne(
    { _id: toId(attemptId) },
    {
      $set: {
        "sections.$[s].status": "queued",
        "sections.$[s].dispatchAttempts": 0,
        "sections.$[s].lockedUntil": null,
        "sections.$[s].lastError": "",
        "sections.$[s].judgeJobId": null,
      },
    },
    { arrayFilters: [{ "s.sectionId": toId(sectionId), "s.status": "failed" }] }
  );
  const changed = (result.modifiedCount ?? result.nModified ?? 0) > 0;
  if (changed) {
    setImmediate(() => {
      dispatchSection(attemptId, sectionId).catch((err) =>
        console.error("[SpeechTest] retry dispatch failed:", err.message)
      );
    });
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Dispatch to SpeechJudge
// ---------------------------------------------------------------------------

async function setSectionFields(attemptId, sectionId, fromStatus, fields) {
  const $set = {};
  Object.entries(fields).forEach(([key, value]) => {
    $set[`sections.$[s].${key}`] = value;
  });
  const result = await SpeechTestAttempt.updateOne(
    { _id: toId(attemptId) },
    { $set },
    { arrayFilters: [{ "s.sectionId": toId(sectionId), "s.status": fromStatus }] }
  );
  return (result.modifiedCount ?? result.nModified ?? 0) > 0;
}

/** Builds the judge's `questions[]` from stored answers; unanswered ones are skipped. */
function buildJudgeQuestions(section, answersByQuestion) {
  const questions = [];

  section.questions.forEach((question) => {
    const answer = answersByQuestion.get(String(question._id));
    if (!answer) return;

    const entry = { question_id: String(question._id) };

    if (answer.kind === "text") {
      const submitted = String(answer.text || "").trim();
      if (!submitted) return;

      if (section.type === "FILL_BLANKS") {
        // `expected_text` is the answer key; the sentence itself is the question.
        entry.question = question.text;
        entry.expected_text = question.answerKey;
        if ((question.acceptedAnswers || []).length > 0) entry.accepted_answers = question.acceptedAnswers;
        entry.answer = submitted;
      } else if (section.type === "MCQ") {
        // Every option goes with its key and whether this student picked it;
        // the judge only compares the two.
        const picked = new Set(submitted.split(","));
        entry.question = question.text;
        entry.options = (question.options || []).map((o) => ({
          id: String(o._id),
          text: o.text,
          is_correct: Boolean(o.isCorrect),
          selected: picked.has(String(o._id)),
        }));
      } else if (section.type === "EMAIL_WRITING") {
        entry.question = question.text;
        entry.answer = submitted;
      } else {
        // JUMBLED answered on screen: the chosen word order, compared with the sentence.
        entry.expected_text = question.text;
        entry.question_config = { submitted_text: submitted };
      }
    } else {
      if (!answer.audio || answer.audio.length === 0) return;
      entry.audio = answer.audio.toString("base64");
      if (section.type === "QUESTION_ANSWER" || section.type === "STORYTELLING") {
        entry.question = question.text;
      } else {
        entry.expected_text = question.text;
      }
    }
    questions.push(entry);
  });

  return questions;
}

/**
 * Sends a `queued` section to SpeechJudge.
 *
 * A compare-and-set on `lockedUntil` makes sure only one caller dispatches. If
 * the judge is down the section stays queued and is retried with a growing
 * delay; the stored answers are untouched.
 */
async function dispatchSection(attemptId, sectionId, now = new Date()) {
  const attempt = await SpeechTestAttempt.findById(attemptId);
  if (!attempt) return false;

  const attemptSection = attempt.sections.find((s) => String(s.sectionId) === String(sectionId));
  if (!attemptSection || attemptSection.status !== "queued") return false;
  if (attemptSection.lockedUntil && attemptSection.lockedUntil > now) return false;

  // Claim it. Comparing against the lock value we just read means a concurrent
  // dispatcher that got there first makes this update match nothing.
  const claim = await SpeechTestAttempt.updateOne(
    { _id: attempt._id },
    { $set: { "sections.$[s].lockedUntil": new Date(now.getTime() + 90 * 1000) } },
    {
      arrayFilters: [
        {
          "s.sectionId": toId(sectionId),
          "s.status": "queued",
          "s.lockedUntil": attemptSection.lockedUntil || null,
        },
      ],
    }
  );
  if ((claim.modifiedCount ?? claim.nModified ?? 0) === 0) return false;

  const test = await SpeechTest.findById(attempt.test).lean();
  const section = test?.sections.find((s) => String(s._id) === String(sectionId));
  if (!section) {
    await setSectionFields(attemptId, sectionId, "queued", {
      status: "failed",
      lockedUntil: null,
      lastError: "This section no longer exists",
    });
    return false;
  }

  const answers = await SpeechTestAnswer.find({ attempt: attempt._id, sectionId: toId(sectionId) });
  const answersByQuestion = new Map(answers.map((a) => [String(a.questionId), a]));
  const judgeQuestions = buildJudgeQuestions(section, answersByQuestion);

  // Nothing to judge: score it without bothering the service.
  if (judgeQuestions.length === 0) {
    await completeSection(attempt._id, section, "queued", [], 0);
    return true;
  }

  const attemptNumber = attemptSection.dispatchAttempts + 1;
  const requestId = `${attempt._id}:${sectionId}:${attemptNumber}`;

  try {
    const accepted = await speechJudge.submitSection({
      requestId,
      studentId: String(attempt.user),
      sectionType: section.type,
      questions: judgeQuestions,
    });

    await setSectionFields(attemptId, sectionId, "queued", {
      status: "scoring",
      judgeJobId: accepted.job_id,
      judgeRequestId: requestId,
      dispatchAttempts: attemptNumber,
      lockedUntil: null,
      lastError: "",
      questionsAnswered: judgeQuestions.length,
    });
    return true;
  } catch (error) {
    const permanent =
      error instanceof speechJudge.SpeechJudgeError &&
      error.status >= 400 &&
      error.status < 500 &&
      ![408, 429].includes(error.status);

    if (permanent || attemptNumber >= MAX_DISPATCH_ATTEMPTS) {
      await setSectionFields(attemptId, sectionId, "queued", {
        status: "failed",
        dispatchAttempts: attemptNumber,
        lockedUntil: null,
        lastError: error.message,
      });
      console.error(`[SpeechTest] section ${sectionId} failed to dispatch: ${error.message}`);
      return false;
    }

    // Back off: 10s, 20s, 30s ... capped at 2 minutes.
    const delayMs = Math.min(attemptNumber * 10000, 120000);
    await setSectionFields(attemptId, sectionId, "queued", {
      dispatchAttempts: attemptNumber,
      lockedUntil: new Date(now.getTime() + delayMs),
      lastError: error.message,
    });
    console.warn(
      `[SpeechTest] judge unavailable for section ${sectionId} (attempt ${attemptNumber}): ${error.message}`
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Collecting results
// ---------------------------------------------------------------------------

/**
 * Writes a section's final result. Missing and unscored answers count as 0, so
 * skipping questions can never raise a score.
 */
async function completeSection(attemptId, section, fromStatus, judgeResults, answeredCount) {
  const byQuestion = new Map(judgeResults.map((r) => [String(r.question_id), r]));

  // The breakdown only needs the text of an on-screen jumbled answer and the
  // length of a recording, so the audio itself is not loaded here.
  const answers = await SpeechTestAnswer.find({
    attempt: toId(attemptId),
    sectionId: toId(section._id),
  }).select("questionId kind text durationS");
  const answerByQuestion = new Map(answers.map((a) => [String(a.questionId), a]));

  const results = section.questions.map((question) => {
    const judged = byQuestion.get(String(question._id));
    if (!judged) {
      return {
        questionId: question._id,
        status: "ANSWER_MISSING",
        score: 0,
        reason: "No answer was submitted",
        flags: [],
        analysis: null,
      };
    }
    const raw = typeof judged.score === "number" ? judged.score : 0;

    // The breakdown is extra: if it cannot be built the score must still stand.
    let analysis = null;
    try {
      analysis = buildQuestionAnalysis({
        sectionType: section.type,
        question,
        judged,
        answer: answerByQuestion.get(String(question._id)),
      });
    } catch (error) {
      console.error(`[SpeechTest] could not build the breakdown for ${question._id}: ${error.message}`);
    }

    return {
      questionId: question._id,
      status: judged.status || "",
      score: round1(Math.max(0, Math.min(1, raw)) * 100),
      reason: judged.reason || "",
      flags: Array.isArray(judged.flags) ? judged.flags : [],
      analysis,
    };
  });

  const total = results.length || 1;
  const sectionScore = round1(results.reduce((sum, r) => sum + r.score, 0) / total);
  const skills = averageSkills(results.map((r) => r.analysis?.skills).filter(Boolean));

  const applied = await setSectionFields(attemptId, section._id, fromStatus, {
    status: "scored",
    score: sectionScore,
    results,
    skills: Object.keys(skills).length ? skills : null,
    questionsTotal: results.length,
    questionsAnswered: answeredCount || judgeResults.length,
    scoredAt: new Date(),
    lockedUntil: null,
    lastError: "",
  });

  if (applied) {
    // The recordings were only ever temporary: they are removed once scored.
    await SpeechTestAnswer.deleteMany({ attempt: toId(attemptId), sectionId: toId(section._id) });
  }
  return applied;
}

/** Checks one `scoring` section against the judge and records the outcome. */
async function pollSection(attemptId, sectionId, now = new Date()) {
  const attempt = await SpeechTestAttempt.findById(attemptId);
  if (!attempt) return false;

  const attemptSection = attempt.sections.find((s) => String(s.sectionId) === String(sectionId));
  if (!attemptSection || attemptSection.status !== "scoring" || !attemptSection.judgeJobId) {
    return false;
  }

  const requeue = (reason) =>
    setSectionFields(attemptId, sectionId, "scoring", {
      status: "queued",
      judgeJobId: null,
      lockedUntil: null,
      lastError: reason,
    });

  // A job that never finishes must not strand the student.
  if (
    attemptSection.submittedAt &&
    now - attemptSection.submittedAt > STUCK_SCORING_MS &&
    attemptSection.dispatchAttempts < MAX_DISPATCH_ATTEMPTS
  ) {
    await requeue("Scoring took too long; resubmitting");
    return false;
  }

  let job;
  try {
    job = await speechJudge.getJob(attemptSection.judgeJobId);
  } catch (error) {
    if (error instanceof speechJudge.SpeechJudgeError && error.status === 404) {
      // The judge forgot the job (restart or expiry). Answers are still ours.
      await requeue("The speech judge lost the job; resubmitting");
    }
    // Any other error is transient: try again next sweep.
    return false;
  }

  if (job.status === "COMPLETED") {
    const test = await SpeechTest.findById(attempt.test).lean();
    const section = test?.sections.find((s) => String(s._id) === String(sectionId));
    if (!section) return false;
    return completeSection(
      attemptId,
      section,
      "scoring",
      job.results || [],
      attemptSection.questionsAnswered
    );
  }

  if (job.status === "FAILED") {
    return setSectionFields(attemptId, sectionId, "scoring", {
      status: "failed",
      lastError: job.reason || "The speech judge could not score this section",
    });
  }

  return false;
}

// ---------------------------------------------------------------------------
// Finishing a test
// ---------------------------------------------------------------------------

/**
 * Ends an attempt and fixes the final score: the mean of the section scores,
 * out of 100. A section that was never started or never scored counts as 0.
 */
async function finalizeAttempt(attempt, test, reason, now = new Date()) {
  const scores = test.sections.map((section) => {
    const state = attempt.sections.find((s) => String(s.sectionId) === String(section._id));
    return state && typeof state.score === "number" ? state.score : 0;
  });
  const finalScore = scores.length
    ? round2(scores.reduce((sum, n) => sum + n, 0) / scores.length)
    : 0;
  const totalTime = attempt.sections.reduce((sum, s) => sum + (s.timeUsedSeconds || 0), 0);

  const result = await SpeechTestAttempt.updateOne(
    { _id: attempt._id, status: "in_progress" },
    {
      $set: {
        status: "completed",
        completedAt: now,
        finalScore,
        totalTimeUsedSeconds: totalTime,
        endReason: reason,
      },
    }
  );
  return (result.modifiedCount ?? result.nModified ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Attempt creation
// ---------------------------------------------------------------------------

/** Finds the student's attempt, creating it on first start. Safe under double-click. */
async function getOrCreateAttempt(test, userId) {
  const existing = await SpeechTestAttempt.findOne({ test: test._id, user: userId });
  if (existing) return existing;

  try {
    return await SpeechTestAttempt.create({
      test: test._id,
      user: userId,
      sections: test.sections.map((section) => ({
        sectionId: section._id,
        status: "not_started",
        questionsTotal: section.questions.length,
      })),
    });
  } catch (error) {
    // Lost the race against a parallel request: the unique index did its job.
    if (error?.code === 11000) {
      return SpeechTestAttempt.findOne({ test: test._id, user: userId });
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sweeper
// ---------------------------------------------------------------------------

let sweepTimer = null;
let sweeping = false;

/** Runs async tasks with a concurrency cap; one failure never stops the rest. */
async function runLimited(tasks, limit) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next];
      next += 1;
      try {
        await task();
      } catch (error) {
        console.error("[SpeechTest] sweep task failed:", error.message);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

async function runSweep(now = new Date()) {
  if (sweeping) return;
  sweeping = true;
  try {
    // 1. Sections whose time ran out while the student was away.
    const overdueCutoff = new Date(now.getTime() - AUTO_SUBMIT_GRACE_MS);
    const overdue = await SpeechTestAttempt.find({
      status: "in_progress",
      sections: { $elemMatch: { status: "in_progress", deadlineAt: { $lte: overdueCutoff } } },
    })
      .select("sections")
      .limit(200);

    for (const attempt of overdue) {
      for (const section of attempt.sections) {
        if (section.status === "in_progress" && section.deadlineAt <= overdueCutoff) {
          await submitSection(attempt._id, section.sectionId, { auto: true, now });
        }
      }
    }

    // 2. Queued sections waiting for (re)dispatch.
    const queued = await SpeechTestAttempt.find({ "sections.status": "queued" })
      .select("sections")
      .limit(100);
    const dispatchTasks = [];
    queued.forEach((attempt) => {
      attempt.sections.forEach((section) => {
        if (section.status === "queued") {
          dispatchTasks.push(() => dispatchSection(attempt._id, section.sectionId, now));
        }
      });
    });
    await runLimited(dispatchTasks, 4);

    // 3. Sections the judge is working on.
    const scoring = await SpeechTestAttempt.find({ "sections.status": "scoring" })
      .select("sections")
      .limit(100);
    const pollTasks = [];
    scoring.forEach((attempt) => {
      attempt.sections.forEach((section) => {
        if (section.status === "scoring") {
          pollTasks.push(() => pollSection(attempt._id, section.sectionId, now));
        }
      });
    });
    await runLimited(pollTasks, 8);

    // 4. Attempts left open after the test window closed.
    const endedTests = await SpeechTest.find({ endTime: { $lte: now } })
      .select("_id sections endTime")
      .lean();
    if (endedTests.length > 0) {
      const testById = new Map(endedTests.map((t) => [String(t._id), t]));
      const stale = await SpeechTestAttempt.find({
        test: { $in: endedTests.map((t) => t._id) },
        status: "in_progress",
        "sections.status": { $nin: ["in_progress", "queued", "scoring"] },
      }).limit(200);

      for (const attempt of stale) {
        const test = testById.get(String(attempt.test));
        if (test) await finalizeAttempt(attempt, test, "window_closed", now);
      }
    }
  } finally {
    sweeping = false;
  }
}

function startSpeechTestSweeper({ intervalMs = SWEEP_INTERVAL_MS } = {}) {
  if (sweepTimer) return sweepTimer;

  runSweep().catch((err) => console.error("[SpeechTest] sweep (initial) failed:", err.message));
  sweepTimer = setInterval(() => {
    runSweep().catch((err) => console.error("[SpeechTest] sweep failed:", err.message));
  }, intervalMs);
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();

  console.log(`🎙️  Speech test sweeper started (every ${Math.round(intervalMs / 1000)}s)`);
  return sweepTimer;
}

function stopSpeechTestSweeper() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

module.exports = {
  UPLOAD_GRACE_MS,
  MAX_RECORD_SECONDS,
  MAX_TEXT_ANSWER_CHARS,
  toStudentQuestion,
  questionAnswerKind,
  computeDeadline,
  secondsBetween,
  getOrCreateAttempt,
  submitSection,
  retrySection,
  dispatchSection,
  pollSection,
  finalizeAttempt,
  runSweep,
  startSpeechTestSweeper,
  stopSpeechTestSweeper,
};
