/**
 * Speech (communication) tests.
 *
 *   /api/speech-tests/admin/...   teachers and admins: author, schedule, results
 *   /api/speech-tests/...         eligible students: take the test, see ranking
 *
 * Grading is delegated to the external SpeechJudge service through
 * services/speechTestService.js. Nothing here talks to it directly.
 */

const express = require("express");
const mongoose = require("mongoose");

const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const User = require("../models/User");
const SpeechTest = require("../models/SpeechTest");
const SpeechTestAnswer = require("../models/SpeechTestAnswer");
const SpeechTestAttempt = require("../models/SpeechTestAttempt");
const speechJudge = require("../services/speechJudgeClient");
const engine = require("../services/speechTestService");
const { buildSectionReport } = require("../services/speechTestReport");
const SpeechTestFeedback = require("../models/SpeechTestFeedback");
const feedbackService = require("../services/speechTestFeedback");
const { resolveRollNumbers, RollResolveError } = require("../utils/resolveRollNumbers");

const router = express.Router();
const { ObjectId } = mongoose.Types;

const MAX_AUDIO_UPLOAD_BYTES = 8 * 1024 * 1024;
const SECTION_TYPES = SpeechTest.SECTION_TYPES;
const ACCENTS = ["en-IN", "en-US", "en-GB", "en-AU"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isValidId = (value) => ObjectId.isValid(String(value)) && String(new ObjectId(String(value))) === String(value);

const asyncRoute = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((error) => handleError(res, error));

function handleError(res, error) {
  if (error instanceof speechJudge.SpeechJudgeError || error instanceof RollResolveError) {
    return res.status(error.status || 400).json({ message: error.message, code: error.code });
  }
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors || {})[0];
    return res.status(400).json({ message: first?.message || error.message });
  }
  console.error("[SpeechTest] route error:", error);
  return res.status(500).json({ message: "Server error", error: error.message });
}

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Wraps a handler so `throw new HttpError(...)` becomes a JSON response. */
const route = (handler) =>
  asyncRoute(async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message, ...error.extra });
      }
      throw error;
    }
  });

function windowState(test, now = new Date()) {
  if (now < new Date(test.startTime)) return "upcoming";
  if (now >= new Date(test.endTime)) return "ended";
  return "live";
}

const isStaff = (req) => req.user.userType === "admin" || req.user.userType === "teacher";

/** Loads a test a student may open: published and they are on the eligible list. */
async function loadStudentTest(req) {
  if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");

  const test = await SpeechTest.findOne({
    _id: req.params.id,
    isPublished: true,
    eligibleUsers: req.user.id,
  });
  if (!test) throw new HttpError(404, "Test not found or you are not eligible for it");
  return test;
}

function findSection(test, sectionId) {
  if (!isValidId(sectionId)) throw new HttpError(404, "Section not found");
  const section = test.sections.find((s) => String(s._id) === String(sectionId));
  if (!section) throw new HttpError(404, "Section not found");
  return section;
}

const attemptSectionOf = (attempt, sectionId) =>
  attempt.sections.find((s) => String(s.sectionId) === String(sectionId));

// ---------------------------------------------------------------------------
// Serialisers
// ---------------------------------------------------------------------------

function serializeTestForStudent(test, now = new Date()) {
  return {
    _id: test._id,
    title: test.title,
    description: test.description,
    instructions: test.instructions,
    startTime: test.startTime,
    endTime: test.endTime,
    state: windowState(test, now),
    sections: test.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      type: section.type,
      instructions: section.instructions,
      timeLimitMinutes: section.timeLimitMinutes,
      questionCount: section.questions.length,
    })),
  };
}

function serializeAttempt(attempt, test) {
  if (!attempt) return null;

  const sections = test.sections.map((section) => {
    const state = attemptSectionOf(attempt, section._id) || {};
    return {
      sectionId: section._id,
      title: section.title,
      type: section.type,
      timeLimitMinutes: section.timeLimitMinutes,
      questionCount: section.questions.length,
      status: state.status || "not_started",
      startedAt: state.startedAt || null,
      deadlineAt: state.deadlineAt || null,
      submittedAt: state.submittedAt || null,
      scoredAt: state.scoredAt || null,
      autoSubmitted: Boolean(state.autoSubmitted),
      timeUsedSeconds: state.timeUsedSeconds || 0,
      score: typeof state.score === "number" ? state.score : null,
      questionsAnswered: state.questionsAnswered || 0,
      error: state.status === "failed" || state.status === "queued" ? state.lastError || "" : "",
      results: (state.results || []).map((r) => ({
        questionId: r.questionId,
        status: r.status,
        score: r.score,
        reason: r.reason,
        flags: r.flags,
      })),
    };
  });

  const allScored = sections.length > 0 && sections.every((s) => s.status === "scored");

  return {
    _id: attempt._id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    finalScore: attempt.finalScore,
    endReason: attempt.endReason,
    totalTimeUsedSeconds: attempt.totalTimeUsedSeconds,
    sections,
    allScored,
    canEnd: attempt.status === "in_progress" && allScored,
  };
}

// ---------------------------------------------------------------------------
// Test authoring helpers
// ---------------------------------------------------------------------------

const wordCount = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;

/**
 * Cleans the author's payload into schema-ready sections. Lenient on purpose:
 * a draft may be saved half-finished. Completeness is checked on publish.
 */
async function normalizeSections(rawSections) {
  if (!Array.isArray(rawSections)) return [];
  if (rawSections.length > 20) throw new HttpError(400, "A test can have at most 20 sections");

  const sections = [];
  for (const [sIndex, raw] of rawSections.entries()) {
    const label = `Section ${sIndex + 1}`;
    if (!SECTION_TYPES.includes(raw?.type)) {
      throw new HttpError(400, `${label}: choose a valid section type`);
    }

    const timeLimit = Number(raw.timeLimitMinutes);
    if (!Number.isFinite(timeLimit) || timeLimit < 1 || timeLimit > 120) {
      throw new HttpError(400, `${label}: time limit must be between 1 and 120 minutes`);
    }

    const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
    if (rawQuestions.length > 50) {
      throw new HttpError(400, `${label}: at most 50 questions per section`);
    }

    const questions = [];
    for (const [qIndex, q] of rawQuestions.entries()) {
      const text = String(q?.text || "").trim();
      if (!text) throw new HttpError(400, `${label}, question ${qIndex + 1}: text is required`);
      if (text.length > 1000) {
        throw new HttpError(400, `${label}, question ${qIndex + 1}: text is too long`);
      }

      const question = { text };
      if (isValidId(q._id)) question._id = q._id;

      if (raw.type === "REPEAT") {
        question.accent = ACCENTS.includes(q.accent) ? q.accent : "en-IN";
        question.gender = q.gender === "male" ? "male" : "female";
      }

      if (raw.type === "JUMBLED") {
        question.jumbledMode = q.jumbledMode === "audio" ? "audio" : "ui";
      }

      if (raw.type === "FILL_BLANKS") {
        question.answerKey = String(q.answerKey || "").trim().slice(0, 500);
        // Other correct answers: trimmed, no blanks, no repeats (the main answer included).
        const seen = new Set([question.answerKey.toLowerCase()]);
        question.acceptedAnswers = (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [])
          .map((a) => String(a || "").trim().slice(0, 500))
          .filter((a) => {
            if (!a || seen.has(a.toLowerCase())) return false;
            seen.add(a.toLowerCase());
            return true;
          });
        if (question.acceptedAnswers.length > 20) {
          throw new HttpError(400, `${label}, question ${qIndex + 1}: at most 20 other accepted answers`);
        }
      }

      if (raw.type === "MCQ") {
        const rawOptions = Array.isArray(q.options) ? q.options : [];
        if (rawOptions.length > 6) {
          throw new HttpError(400, `${label}, question ${qIndex + 1}: at most 6 options`);
        }
        question.options = rawOptions
          .map((o) => ({
            ...(isValidId(o?._id) ? { _id: o._id } : {}),
            text: String(o?.text || "").trim().slice(0, 300),
            isCorrect: Boolean(o?.isCorrect),
          }))
          .filter((o) => o.text);
      }

      questions.push(question);
    }

    sections.push({
      ...(isValidId(raw._id) ? { _id: raw._id } : {}),
      title: String(raw.title || "").trim() || `Section ${sIndex + 1}`,
      type: raw.type,
      instructions: String(raw.instructions || "").trim(),
      timeLimitMinutes: timeLimit,
      questions,
    });
  }
  return sections;
}

/** Everything that must be true before students may see the test. */
function publishProblems(test) {
  const problems = [];
  if (test.sections.length === 0) problems.push("Add at least one section");

  test.sections.forEach((section, sIndex) => {
    const label = `Section ${sIndex + 1} (${section.title})`;
    if (section.questions.length === 0) problems.push(`${label}: add at least one question`);

    section.questions.forEach((question, qIndex) => {
      const qLabel = `${label}, question ${qIndex + 1}`;
      if (section.type === "JUMBLED" && wordCount(question.text) < 3) {
        problems.push(`${qLabel}: a jumbled sentence needs at least 3 words`);
      }

      if (section.type === "FILL_BLANKS" && !String(question.answerKey || "").trim()) {
        problems.push(`${qLabel}: enter the correct answer`);
      }

      if (section.type === "MCQ") {
        const options = question.options || [];
        const correct = options.filter((o) => o.isCorrect).length;
        if (options.length < 2 || options.length > 6) {
          problems.push(`${qLabel}: a multiple-choice question needs 2 to 6 options`);
        }
        if (correct < 1 || correct > 2) {
          problems.push(`${qLabel}: mark 1 or 2 options as correct`);
        }
      }
    });
  });

  if (new Date(test.endTime) <= new Date()) problems.push("The end time is already in the past");
  return problems;
}

/** A comparable fingerprint of what students are tested on. */
function sectionsSignature(sections) {
  return JSON.stringify(
    (sections || []).map((s) => ({
      id: String(s._id || ""),
      type: s.type,
      title: s.title,
      limit: s.timeLimitMinutes,
      instructions: s.instructions || "",
      questions: (s.questions || []).map((q) => ({
        id: String(q._id || ""),
        text: q.text,
        mode: q.jumbledMode || "",
        accent: q.accent || "",
        gender: q.gender || "",
        key: q.answerKey || "",
        accepted: q.acceptedAnswers || [],
        options: (q.options || []).map((o) => ({
          id: String(o._id || ""),
          text: o.text,
          correct: Boolean(o.isCorrect),
        })),
      })),
    }))
  );
}

/**
 * True when `next` is `current` plus new sections and/or new questions added at
 * the end. Anything students may already have answered must stay untouched.
 */
function onlyAppends(next, current) {
  if (next.length < current.length) return false;
  const head = next.slice(0, current.length).map((section, i) => ({
    ...section,
    questions: section.questions.slice(0, current[i].questions.length),
  }));
  return sectionsSignature(head) === sectionsSignature(current);
}

function parseTimes(body, existing = {}) {
  const startTime = body.startTime ? new Date(body.startTime) : existing.startTime;
  const endTime = body.endTime ? new Date(body.endTime) : existing.endTime;
  if (!startTime || Number.isNaN(new Date(startTime).getTime())) {
    throw new HttpError(400, "A valid start time is required");
  }
  if (!endTime || Number.isNaN(new Date(endTime).getTime())) {
    throw new HttpError(400, "A valid end time is required");
  }
  if (new Date(endTime) <= new Date(startTime)) {
    throw new HttpError(400, "End time must be after the start time");
  }
  return { startTime, endTime };
}

// ===========================================================================
// ADMIN / TEACHER
// ===========================================================================

/** Diagnostics: is the judge reachable and ready? */
router.get(
  "/admin/judge/status",
  [auth, adminAuth],
  route(async (_req, res) => {
    const status = { configured: speechJudge.isConfigured(), baseUrl: speechJudge.BASE_URL };
    try {
      status.ready = await speechJudge.ready();
    } catch (error) {
      status.error = error.message;
    }
    res.json(status);
  })
);

router.get(
  "/admin",
  [auth, adminAuth],
  route(async (_req, res) => {
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
  })
);

router.post(
  "/admin",
  [auth, adminAuth],
  route(async (req, res) => {
    const body = req.body || {};
    const title = String(body.title || "").trim();
    if (!title) throw new HttpError(400, "Title is required");

    const { startTime, endTime } = parseTimes(body);
    const sections = await normalizeSections(body.sections);

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
  })
);

router.get(
  "/admin/:id",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const test = await SpeechTest.findById(req.params.id).select("-eligibleUsers").lean();
    if (!test) throw new HttpError(404, "Test not found");

    const attemptCount = await SpeechTestAttempt.countDocuments({ test: test._id });
    const eligibleCount =
      (await SpeechTest.findById(test._id).select("eligibleUsers").lean())?.eligibleUsers?.length || 0;

    res.json({ test: { ...test, state: windowState(test) }, attemptCount, eligibleCount });
  })
);

router.put(
  "/admin/:id",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const test = await SpeechTest.findById(req.params.id);
    if (!test) throw new HttpError(404, "Test not found");

    const body = req.body || {};
    const title = body.title !== undefined ? String(body.title).trim() : test.title;
    if (!title) throw new HttpError(400, "Title is required");

    const { startTime, endTime } = parseTimes(body, test);

    const knownSectionIds = new Set(test.sections.map((s) => String(s._id)));
    let hasAttempts = false;

    if (body.sections !== undefined) {
      const sections = await normalizeSections(body.sections);
      hasAttempts = Boolean(await SpeechTestAttempt.exists({ test: test._id }));

      // Once students have started, what they were tested on must stay as it
      // was, so only additions are accepted: new sections and new questions.
      if (hasAttempts && !onlyAppends(sections, test.sections.toObject())) {
        throw new HttpError(
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
      const problems = publishProblems(test);
      if (problems.length > 0) {
        throw new HttpError(400, "A published test must stay complete", { problems });
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
  })
);

router.post(
  "/admin/:id/publish",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const test = await SpeechTest.findById(req.params.id);
    if (!test) throw new HttpError(404, "Test not found");

    const publish = req.body?.publish !== false;

    if (publish) {
      const problems = publishProblems(test);
      if (problems.length > 0) {
        throw new HttpError(400, "This test is not ready to publish", { problems });
      }
      if (test.eligibleUsers.length === 0) {
        throw new HttpError(400, "Add at least one eligible student before publishing", {
          problems: ["Add at least one eligible student"],
        });
      }
    }

    test.isPublished = publish;
    await test.save();
    res.json({ test: { _id: test._id, isPublished: test.isPublished } });
  })
);

router.delete(
  "/admin/:id",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const test = await SpeechTest.findById(req.params.id).select("_id");
    if (!test) throw new HttpError(404, "Test not found");

    await Promise.all([
      SpeechTestAnswer.deleteMany({ test: test._id }),
      SpeechTestAttempt.deleteMany({ test: test._id }),
      SpeechTestFeedback.deleteMany({ test: test._id }),
    ]);
    await SpeechTest.deleteOne({ _id: test._id });

    res.json({ message: "Test deleted" });
  })
);

/** What students said about this test: totals, averages, spread and latest comments. */
router.get(
  "/admin/:id/feedback",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const exists = await SpeechTest.exists({ _id: req.params.id });
    if (!exists) throw new HttpError(404, "Test not found");

    res.json({ summary: await feedbackService.summarize(new ObjectId(req.params.id)) });
  })
);

// ----- eligible students ----------------------------------------------------

router.get(
  "/admin/:id/eligible-users",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const test = await SpeechTest.findById(req.params.id)
      .select("eligibleUsers")
      .populate("eligibleUsers", "name email department section graduatingYear rollNumber");
    if (!test) throw new HttpError(404, "Test not found");

    res.json({ users: test.eligibleUsers || [], totalCount: test.eligibleUsers?.length || 0 });
  })
);

router.put(
  "/admin/:id/eligible-users",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const { userIds } = req.body || {};
    if (!Array.isArray(userIds) || !userIds.every(isValidId)) {
      throw new HttpError(400, "userIds must be an array of user ids");
    }

    const test = await SpeechTest.findById(req.params.id);
    if (!test) throw new HttpError(404, "Test not found");

    // Only real student accounts can be eligible.
    const students = await User.find({
      _id: { $in: [...new Set(userIds)] },
      userType: { $nin: ["admin", "teacher"] },
    }).select("_id");

    test.eligibleUsers = students.map((u) => u._id);
    await test.save();

    res.json({ message: "Eligible students updated", totalCount: test.eligibleUsers.length });
  })
);

router.post(
  "/admin/:id/eligible-users/resolve-rolls",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const test = await SpeechTest.findById(req.params.id).select("title eligibleUsers");
    if (!test) throw new HttpError(404, "Test not found");

    const eligibleIds = new Set((test.eligibleUsers || []).map((id) => id.toString()));
    const resolved = await resolveRollNumbers(req.body?.rollNumbers, eligibleIds);

    res.json({ testId: test._id, testTitle: test.title, ...resolved });
  })
);

// ----- results --------------------------------------------------------------

/**
 * Ranked results of a test.
 *
 * Order: higher final score first; ties go to the student who used less time,
 * and students with identical score and time share a rank.
 */
async function buildLeaderboard(test, { includeInProgress = false } = {}) {
  const query = { test: test._id };
  if (!includeInProgress) query.status = "completed";

  const attempts = await SpeechTestAttempt.find(query).populate({
    path: "user",
    match: { userType: { $nin: ["admin", "teacher"] } },
    select: "name rollNumber email department section graduatingYear graduationYear profilePicture",
  });

  const rows = attempts
    .filter((attempt) => attempt.user)
    .map((attempt) => ({
      attempt,
      score: typeof attempt.finalScore === "number" ? attempt.finalScore : null,
      time: attempt.totalTimeUsedSeconds || 0,
    }));

  rows.sort((a, b) => {
    if (a.attempt.status !== b.attempt.status) return a.attempt.status === "completed" ? -1 : 1;
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (a.time !== b.time) return a.time - b.time;
    return new Date(a.attempt.completedAt || 0) - new Date(b.attempt.completedAt || 0);
  });

  let lastKey = null;
  let lastRank = 0;
  return rows.map((row, index) => {
    const completed = row.attempt.status === "completed";
    const key = `${row.score}|${row.time}`;
    const rank = completed ? (key === lastKey ? lastRank : index + 1) : null;
    if (completed) {
      lastKey = key;
      lastRank = rank;
    }

    const { attempt } = row;
    return {
      attemptId: attempt._id,
      rank,
      status: attempt.status,
      user: {
        _id: attempt.user._id,
        name: attempt.user.name,
        rollNumber: attempt.user.rollNumber,
        email: attempt.user.email,
        department: attempt.user.department,
        section: attempt.user.section,
        graduatingYear: attempt.user.graduatingYear || attempt.user.graduationYear,
        profilePicture: attempt.user.profilePicture,
      },
      finalScore: attempt.finalScore,
      totalTimeUsedSeconds: attempt.totalTimeUsedSeconds,
      completedAt: attempt.completedAt,
      sectionScores: test.sections.map((section) => {
        const state = attemptSectionOf(attempt, section._id);
        return {
          sectionId: section._id,
          title: section.title,
          type: section.type,
          status: state?.status || "not_started",
          score: typeof state?.score === "number" ? state.score : null,
        };
      }),
    };
  });
}

router.get(
  "/admin/:id/results",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
    const test = await SpeechTest.findById(req.params.id).select("title sections startTime endTime");
    if (!test) throw new HttpError(404, "Test not found");

    const entries = await buildLeaderboard(test, { includeInProgress: true });
    res.json({
      test: {
        _id: test._id,
        title: test.title,
        sections: test.sections.map((s) => ({ _id: s._id, title: s.title, type: s.type })),
      },
      entries,
    });
  })
);

/**
 * Deletes one student's submission (their attempt and any saved answers).
 *
 * The student is no longer shown as having taken the test, so they can start it
 * again as long as the test window is still open. Anything the speech judge is
 * still scoring for the deleted attempt is simply discarded when it returns.
 */
router.delete(
  "/admin/:id/attempts/:attemptId",
  [auth, adminAuth],
  route(async (req, res) => {
    if (!isValidId(req.params.id) || !isValidId(req.params.attemptId)) {
      throw new HttpError(404, "Submission not found");
    }

    const attempt = await SpeechTestAttempt.findOne({
      _id: req.params.attemptId,
      test: req.params.id,
    }).select("_id");
    if (!attempt) throw new HttpError(404, "Submission not found");

    await SpeechTestAnswer.deleteMany({ attempt: attempt._id });
    await SpeechTestFeedback.deleteMany({ attempt: attempt._id });
    await SpeechTestAttempt.deleteOne({ _id: attempt._id });

    res.json({ message: "Submission deleted. The student can take the test again." });
  })
);

// ===========================================================================
// STUDENT
// ===========================================================================

router.get(
  "/my",
  auth,
  route(async (req, res) => {
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
  })
);

/** Test overview plus the student's attempt. The page polls this for results. */
router.get(
  "/:id",
  auth,
  route(async (req, res) => {
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
  })
);

/**
 * Stores the student's feedback on a finished test, or records that they
 * skipped the form. Only possible once the test has been ended, and only once.
 */
router.post(
  "/:id/feedback",
  auth,
  route(async (req, res) => {
    const test = await loadStudentTest(req);
    const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    if (!attempt || attempt.status !== "completed") {
      throw new HttpError(409, "Feedback opens once you have finished the test");
    }

    let fields;
    try {
      fields = feedbackService.parseFeedback(req.body);
    } catch (error) {
      throw new HttpError(error.status || 400, error.message);
    }

    // Insert-only: the unique index on `attempt` turns a second send into a conflict.
    try {
      await SpeechTestFeedback.create({ test: test._id, attempt: attempt._id, user: req.user.id, ...fields });
    } catch (error) {
      if (error?.code === 11000) throw new HttpError(409, "You have already sent feedback for this test");
      throw error;
    }

    res.status(201).json({ message: fields.status === "skipped" ? "Skipped" : "Thank you for your feedback" });
  })
);

/**
 * Detailed results of one scored section: the student's details, a breakdown
 * for every question, and how they compare with the batch.
 */
router.get(
  "/:id/sections/:sectionId/results",
  auth,
  route(async (req, res) => {
    const test = await loadStudentTest(req);
    const section = findSection(test, req.params.sectionId);

    const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    const attemptSection = attempt && attemptSectionOf(attempt, section._id);
    if (!attemptSection || attemptSection.status !== "scored") {
      throw new HttpError(409, "The results for this section are not ready yet");
    }

    const user = await User.findById(req.user.id).select(
      "name rollNumber department section graduatingYear"
    );
    const report = await buildSectionReport({ test, section, attempt, attemptSection, user });
    res.json({ serverTime: new Date(), report });
  })
);

/** Opens the test for the student. Idempotent: a second call returns the same attempt. */
router.post(
  "/:id/start",
  auth,
  route(async (req, res) => {
    const test = await loadStudentTest(req);

    const existing = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    if (!existing) {
      const state = windowState(test);
      if (state === "upcoming") throw new HttpError(403, "This test has not started yet");
      if (state === "ended") throw new HttpError(403, "This test has ended");
    }

    const attempt = existing || (await engine.getOrCreateAttempt(test, req.user.id));
    res.json({
      serverTime: new Date(),
      test: serializeTestForStudent(test),
      attempt: serializeAttempt(attempt, test),
    });
  })
);

/**
 * Starts a section's clock, or resumes it after a reload or crash.
 *
 * The deadline is set here, once, and kept on the server. Resuming does not
 * restart or pause it: the section stays open for exactly its time limit.
 */
router.post(
  "/:id/sections/:sectionId/start",
  auth,
  route(async (req, res) => {
    const test = await loadStudentTest(req);
    const section = findSection(test, req.params.sectionId);
    const now = new Date();

    let attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    if (!attempt) throw new HttpError(409, "Start the test first");
    if (attempt.status !== "in_progress") throw new HttpError(409, "You have already ended this test");

    let state = attemptSectionOf(attempt, section._id);
    if (!state) throw new HttpError(409, "This section is not part of your attempt");

    if (state.status === "in_progress") {
      if (now >= state.deadlineAt) {
        await engine.submitSection(attempt._id, section._id, { auto: true, now });
        throw new HttpError(409, "Time is up for this section. Your answers were submitted.", {
          code: "SECTION_TIME_UP",
        });
      }
    } else if (state.status === "not_started") {
      if (windowState(test, now) !== "live") {
        throw new HttpError(403, "This test is not live");
      }

      const running = attempt.sections.find((s) => s.status === "in_progress");
      if (running) {
        throw new HttpError(409, "Finish the section you have open first", {
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
        throw new HttpError(409, "Could not start this section. Please try again.");
      }
    } else {
      throw new HttpError(409, "This section has already been submitted", {
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
  })
);

/**
 * Reads a WAV header. The browser always sends 16 kHz mono 16-bit PCM, but a
 * hand-made request must not be able to store arbitrary bytes or a huge clip.
 */
function parseWav(buffer) {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return null;
  }

  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let dataBytes = 0;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt " && offset + 24 <= buffer.length) {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bits = buffer.readUInt16LE(offset + 22);
    } else if (id === "data") {
      dataBytes = Math.min(size, buffer.length - offset - 8);
      break;
    }
    offset += 8 + size + (size % 2);
  }

  if (!channels || !sampleRate || !bits || !dataBytes) return null;
  return { durationS: dataBytes / (sampleRate * channels * (bits / 8)) };
}

/** Saves (or replaces) one answer the moment it is given. */
router.put(
  "/:id/sections/:sectionId/answers/:questionId",
  auth,
  express.raw({
    type: ["audio/wav", "audio/x-wav", "audio/wave", "application/octet-stream"],
    limit: MAX_AUDIO_UPLOAD_BYTES,
  }),
  route(async (req, res) => {
    const test = await loadStudentTest(req);
    const section = findSection(test, req.params.sectionId);
    if (!isValidId(req.params.questionId)) throw new HttpError(404, "Question not found");
    const question = section.questions.find((q) => String(q._id) === req.params.questionId);
    if (!question) throw new HttpError(404, "Question not found");

    const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    const state = attempt && attemptSectionOf(attempt, section._id);
    const now = new Date();

    if (!attempt || attempt.status !== "in_progress" || !state || state.status !== "in_progress") {
      throw new HttpError(409, "This section is not open for answers", { code: "SECTION_CLOSED" });
    }
    if (now.getTime() > new Date(state.deadlineAt).getTime() + engine.UPLOAD_GRACE_MS) {
      throw new HttpError(409, "Time is up for this section", { code: "SECTION_TIME_UP" });
    }

    const kind = engine.questionAnswerKind(section, question);
    const key = { attempt: attempt._id, questionId: question._id };
    const base = {
      test: test._id,
      user: req.user.id,
      sectionId: section._id,
      kind,
    };

    if (kind === "audio") {
      const audio = req.body;
      if (!Buffer.isBuffer(audio) || audio.length === 0) {
        throw new HttpError(400, "Send the recording as audio/wav");
      }
      const wav = parseWav(audio);
      if (!wav) throw new HttpError(400, "That is not a valid WAV recording");

      const limit = engine.MAX_RECORD_SECONDS[section.type] + 5;
      if (wav.durationS > limit) {
        throw new HttpError(400, `Recording is too long (max ${limit - 5} seconds)`);
      }

      await SpeechTestAnswer.findOneAndUpdate(
        key,
        { $set: { ...base, audio, durationS: Math.round(wav.durationS * 10) / 10, text: "" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.json({ saved: true, kind, durationS: wav.durationS });
    }

    let text = String(req.body?.text || "").trim();
    const maxChars = engine.MAX_TEXT_ANSWER_CHARS[section.type] || 1000;
    if (text.length > maxChars) throw new HttpError(400, "Answer is too long");

    // A multiple-choice answer is the ids of the chosen options, comma separated.
    if (section.type === "MCQ" && text) {
      const valid = new Set((question.options || []).map((o) => String(o._id)));
      const picked = [...new Set(text.split(",").map((id) => id.trim()).filter(Boolean))];
      if (picked.some((id) => !valid.has(id))) throw new HttpError(400, "That is not one of the options");
      text = picked.sort().join(",");
    }

    // Clearing an on-screen answer removes it, so a half-built answer is not scored.
    if (!text) {
      await SpeechTestAnswer.deleteOne(key);
      return res.json({ saved: true, kind, cleared: true });
    }

    await SpeechTestAnswer.findOneAndUpdate(
      key,
      { $set: { ...base, audio: null, durationS: 0, text } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ saved: true, kind });
  })
);

// Last audio-check time per student, so the (heavier) judge call cannot be spammed.
const audioCheckLastCall = new Map();
const AUDIO_CHECK_MIN_GAP_MS = 3000;

const AUDIO_ISSUES = {
  EXCESSIVE_NOISE: "There is a lot of background noise. Move somewhere quieter.",
  CLIPPING: "Your voice is distorted. Lower your microphone volume or sit a little further back.",
};

/**
 * Microphone check shown before the test starts.
 *
 * The student says their name; the judge transcribes it (scored as a short
 * reading of their own name) and we report what it heard plus whether the
 * recording was clean. Nothing is stored. If the judge is unreachable the
 * response says so, and the student is not blocked from starting.
 */
router.post(
  "/:id/audio-check",
  auth,
  express.raw({
    type: ["audio/wav", "audio/x-wav", "audio/wave", "application/octet-stream"],
    limit: 4 * 1024 * 1024,
  }),
  route(async (req, res) => {
    await loadStudentTest(req);

    const last = audioCheckLastCall.get(req.user.id) || 0;
    if (Date.now() - last < AUDIO_CHECK_MIN_GAP_MS) {
      throw new HttpError(429, "Please wait a moment before checking again");
    }
    audioCheckLastCall.set(req.user.id, Date.now());

    const audio = req.body;
    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      throw new HttpError(400, "Send the recording as audio/wav");
    }
    const wav = parseWav(audio);
    if (!wav) throw new HttpError(400, "That is not a valid WAV recording");
    if (wav.durationS > 20) throw new HttpError(400, "Recording is too long for a quick check");

    const student = await User.findById(req.user.id).select("name").lean();
    const spokenName = String(student?.name || "").trim() || "my name";

    let result;
    try {
      result = await speechJudge.evaluate({
        requestId: `audio-check:${req.user.id}:${Date.now()}`,
        questionType: "READING",
        audio: audio.toString("base64"),
        expectedText: spokenName,
      });
    } catch (error) {
      if (error instanceof speechJudge.SpeechJudgeError) {
        console.warn(`[SpeechTest] audio check unavailable: ${error.message}`);
        return res.json({ available: false });
      }
      throw error;
    }

    const transcript = String(result?.evaluation?.transcription?.text || "").trim();
    const flags = Array.isArray(result?.flags) ? result.flags : [];

    const issues = [];
    if (result?.status === "LOW_AUDIO_QUALITY") {
      issues.push(result.reason || "We could not hear you clearly. Speak a little louder.");
    }
    flags.forEach((flag) => {
      if (AUDIO_ISSUES[flag]) issues.push(AUDIO_ISSUES[flag]);
    });
    if (!transcript && issues.length === 0) {
      issues.push("We could not make out any words. Say your name clearly and try again.");
    }

    res.json({
      available: true,
      clear: issues.length === 0 && Boolean(transcript),
      transcript,
      issues,
    });
  })
);

/** Submits a section. Returns immediately; scoring continues in the background. */
router.post(
  "/:id/sections/:sectionId/submit",
  auth,
  route(async (req, res) => {
    const test = await loadStudentTest(req);
    const section = findSection(test, req.params.sectionId);

    const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    const state = attempt && attemptSectionOf(attempt, section._id);
    if (!attempt || !state) throw new HttpError(409, "Start the test first");
    if (state.status === "not_started") throw new HttpError(409, "Start this section first");

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
  })
);

/** Re-queues a section whose scoring failed. The answers are still stored. */
router.post(
  "/:id/sections/:sectionId/retry",
  auth,
  route(async (req, res) => {
    const test = await loadStudentTest(req);
    const section = findSection(test, req.params.sectionId);

    const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    const state = attempt && attemptSectionOf(attempt, section._id);
    if (!attempt || !state) throw new HttpError(409, "Start the test first");
    if (state.status !== "failed") throw new HttpError(409, "Only a failed section can be retried");

    await engine.retrySection(attempt._id, section._id);
    const fresh = await SpeechTestAttempt.findById(attempt._id);
    res.json({ serverTime: new Date(), attempt: serializeAttempt(fresh, test) });
  })
);

/** Ends the test. Only possible once every section has been scored. */
router.post(
  "/:id/end",
  auth,
  route(async (req, res) => {
    const test = await loadStudentTest(req);
    const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
    if (!attempt) throw new HttpError(409, "You have not started this test");

    if (attempt.status === "in_progress") {
      const summary = serializeAttempt(attempt, test);
      if (!summary.allScored) {
        throw new HttpError(
          409,
          "Submit every section and wait for all results before ending the test."
        );
      }
      await engine.finalizeAttempt(attempt, test, "student");
    }

    const fresh = await SpeechTestAttempt.findById(attempt._id);
    res.json({ serverTime: new Date(), attempt: serializeAttempt(fresh, test) });
  })
);

router.get(
  "/:id/leaderboard",
  auth,
  route(async (req, res) => {
    let test;
    if (isStaff(req)) {
      if (!isValidId(req.params.id)) throw new HttpError(404, "Test not found");
      test = await SpeechTest.findById(req.params.id).select("title sections");
      if (!test) throw new HttpError(404, "Test not found");
    } else {
      test = await loadStudentTest(req);
    }

    const entries = await buildLeaderboard(test);
    res.json({
      test: {
        _id: test._id,
        title: test.title,
        sections: test.sections.map((s) => ({ _id: s._id, title: s.title, type: s.type })),
      },
      entries,
    });
  })
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
  console.error("[SpeechTest] unhandled router error:", err);
  return res.status(500).json({ message: "Server error", error: err.message });
});

module.exports = router;
