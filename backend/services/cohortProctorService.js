/**
 * Proctoring for exam-mode cohorts.
 *
 * Two responsibilities:
 *   1. Record integrity events reported by the exam tab (tab switches,
 *      fullscreen exits, and so on) as server-side counters.
 *   2. Rebuild the results side of the record — scores, ranks, timings, and the
 *      module and question breakdowns — from the authoritative collections.
 *
 * Nothing here trusts the client with a number. An event says only that
 * something happened; the increment is applied here. Scores are always read
 * back from UserCohort and Submission.
 *
 * Practice cohorts are ignored throughout, so the existing flow is untouched.
 */

const CohortProctor = require("../models/CohortProctor");
const Cohort = require("../models/Cohort");
const Module = require("../models/Module");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const UserCohort = require("../models/UserCohort");
const User = require("../models/User");
const { EXAM_MODE } = require("../utils/examAccess");

const MAX_VIOLATION_LOG = CohortProctor.MAX_VIOLATION_LOG;
const VIOLATION_TYPES = CohortProctor.VIOLATION_TYPES;

/** Maps an event type onto the counter it increments. */
const COUNTER_BY_TYPE = {
  tab_switch: "tabSwitchCount",
  fullscreen_exit: "fullscreenExitCount",
  window_blur: "windowBlurCount",
  copy: "copyCount",
  paste: "pasteCount",
  context_menu: null, // logged only
};

/** Fetches or creates the proctor document for an exam cohort. */
async function getOrCreateRecord(cohort) {
  if (!cohort || cohort.mode !== EXAM_MODE) return null;

  let record = await CohortProctor.findOne({ cohort: cohort._id });
  if (!record) {
    record = new CohortProctor({
      cohort: cohort._id,
      examStartTime: cohort.examStartTime || null,
      examEndTime: cohort.examEndTime || null,
      totalEligibleUsers: (cohort.eligibleUsers || []).length,
    });
  } else {
    // Keep the snapshot current while the exam has not started yet.
    record.examStartTime = cohort.examStartTime || record.examStartTime;
    record.examEndTime = cohort.examEndTime || record.examEndTime;
    record.totalEligibleUsers = (cohort.eligibleUsers || []).length;
  }

  return record;
}

/**
 * Marks a student as present and records the moment they entered.
 * Idempotent: the first call wins, so re-entering does not reset the clock.
 */
async function recordExamEntry(cohort, userId) {
  const record = await getOrCreateRecord(cohort);
  if (!record) return null;

  const participant = record.ensureParticipant(userId);
  const now = new Date();

  if (!participant.startedAt) participant.startedAt = now;
  participant.lastActivityAt = now;

  record.recomputeTotals();
  await record.save();
  return record;
}

/**
 * Records one integrity event.
 *
 * @param {object} cohort
 * @param {string} userId
 * @param {string} type   one of VIOLATION_TYPES
 * @param {string} [detail]
 * @returns {Promise<null|{tabSwitchCount:number, fullscreenExitCount:number}>}
 */
async function recordViolation(cohort, userId, type, detail) {
  if (!VIOLATION_TYPES.includes(type)) {
    const error = new Error(`Unknown proctor event type "${type}"`);
    error.status = 400;
    throw error;
  }

  const record = await getOrCreateRecord(cohort);
  if (!record) return null;

  const participant = record.ensureParticipant(userId);
  const now = new Date();

  // A student can only report an event for themselves, and only the increment
  // is honoured — never a client-supplied total.
  const counter = COUNTER_BY_TYPE[type];
  if (counter) participant[counter] = (participant[counter] || 0) + 1;

  if (!participant.startedAt) participant.startedAt = now;
  participant.lastActivityAt = now;

  participant.violations.push({
    type,
    at: now,
    ...(detail ? { detail: String(detail).slice(0, 200) } : {}),
  });

  // Counters keep rising after the log is capped; only the detail is dropped.
  if (participant.violations.length > MAX_VIOLATION_LOG) {
    participant.violations = participant.violations.slice(-MAX_VIOLATION_LOG);
  }

  record.recomputeTotals();
  await record.save();

  return {
    tabSwitchCount: participant.tabSwitchCount,
    fullscreenExitCount: participant.fullscreenExitCount,
    windowBlurCount: participant.windowBlurCount,
  };
}

/** Mirrors an END TEST onto the proctor record. */
async function recordExamSubmission(cohort, userId, submittedAt, totalScore) {
  const record = await getOrCreateRecord(cohort);
  if (!record) return null;

  const participant = record.ensureParticipant(userId);

  participant.submittedAt = submittedAt || new Date();
  if (!participant.startedAt) participant.startedAt = participant.submittedAt;
  participant.lastActivityAt = participant.submittedAt;
  participant.totalScore = totalScore || 0;
  participant.timeTakenMs =
    participant.submittedAt.getTime() - participant.startedAt.getTime();

  record.recomputeTotals();
  await record.save();
  return record;
}

/**
 * Rebuilds every result field from the authoritative collections and returns a
 * full report: exam summary, per-student rows, module breakdown and question
 * breakdown.
 *
 * Used by both the admin summary endpoint and the Excel export, so the numbers
 * on screen and in the spreadsheet cannot disagree.
 */
async function buildExamReport(cohortId) {
  const cohort = await Cohort.findById(cohortId).populate(
    "eligibleUsers",
    "name email rollNumber department section graduatingYear"
  );

  if (!cohort) {
    const error = new Error("Cohort not found");
    error.status = 404;
    throw error;
  }
  if (cohort.mode !== EXAM_MODE) {
    const error = new Error("Proctoring data is only available for exam cohorts");
    error.status = 400;
    throw error;
  }

  const moduleIds = cohort.modules || [];

  const [modules, questions, userCohorts, submissions, record] = await Promise.all([
    Module.find({ _id: { $in: moduleIds } }).select("title order").sort({ order: 1 }).lean(),
    Question.find({ module: { $in: moduleIds } })
      .select("title type difficultyLevel marks module")
      .lean(),
    UserCohort.find({ cohort: cohortId })
      .select(
        "user status totalScore rank questionProgress moduleProgress examSubmittedAt enrolledAt"
      )
      .lean(),
    // Only correct submissions are needed for per-question scoring, but every
    // submission is needed for attempt counts.
    Submission.find({ cohort: cohortId })
      .select("user question status score submittedAt")
      .lean(),
    CohortProctor.findOne({ cohort: cohortId }),
  ]);

  const questionById = new Map(questions.map((q) => [q._id.toString(), q]));
  const moduleById = new Map(modules.map((m) => [m._id.toString(), m]));

  // Proctoring counters, keyed by user.
  const proctorByUser = new Map(
    (record?.participants || []).map((p) => [p.user.toString(), p])
  );

  const progressByUser = new Map(
    userCohorts.map((uc) => [uc.user.toString(), uc])
  );

  // Best score per (user, question), and attempt counts per question.
  const bestScore = new Map(); // `${userId}:${questionId}` -> score
  const solvedByQuestion = new Map(); // questionId -> Set(userId)
  const attemptsByQuestion = new Map(); // questionId -> count

  for (const sub of submissions) {
    const userId = sub.user?.toString();
    const questionId = sub.question?.toString();
    if (!userId || !questionId) continue;

    attemptsByQuestion.set(
      questionId,
      (attemptsByQuestion.get(questionId) || 0) + 1
    );

    const key = `${userId}:${questionId}`;
    const score = Number(sub.score) || 0;
    if (!bestScore.has(key) || score > bestScore.get(key)) {
      bestScore.set(key, score);
    }

    if (sub.status === "accepted") {
      if (!solvedByQuestion.has(questionId)) {
        solvedByQuestion.set(questionId, new Set());
      }
      solvedByQuestion.get(questionId).add(userId);
    }
  }

  // ── per-student rows ────────────────────────────────────────────────────
  const students = (cohort.eligibleUsers || []).map((user) => {
    const userId = user._id.toString();
    const progress = progressByUser.get(userId);
    const proctor = proctorByUser.get(userId);

    const startedAt = proctor?.startedAt || progress?.enrolledAt || null;
    const submittedAt = progress?.examSubmittedAt || proctor?.submittedAt || null;
    const attended = Boolean(proctor?.startedAt || progress);

    // Module-level scores, taken from the stored progress where available and
    // otherwise summed from the student's best submissions.
    const moduleScores = modules.map((module) => {
      const stored = (progress?.moduleProgress || []).find(
        (mp) => mp.module?.toString() === module._id.toString()
      );

      const moduleQuestions = questions.filter(
        (q) => q.module?.toString() === module._id.toString()
      );

      const summed = moduleQuestions.reduce(
        (total, q) => total + (bestScore.get(`${userId}:${q._id}`) || 0),
        0
      );

      return {
        moduleId: module._id.toString(),
        title: module.title,
        score: stored?.score ?? summed,
        questionsCompleted: stored?.questionsCompleted ?? 0,
        totalQuestions: moduleQuestions.length,
      };
    });

    const questionScores = questions.map((q) => ({
      questionId: q._id.toString(),
      score: bestScore.get(`${userId}:${q._id}`) || 0,
      solved: Boolean(solvedByQuestion.get(q._id.toString())?.has(userId)),
    }));

    const totalScore =
      progress?.totalScore ??
      questionScores.reduce((sum, q) => sum + q.score, 0);

    const timeTakenMs =
      startedAt && submittedAt
        ? new Date(submittedAt).getTime() - new Date(startedAt).getTime()
        : null;

    return {
      userId,
      name: user.name || "",
      email: user.email || "",
      rollNumber: user.rollNumber || "",
      department: user.department || "",
      section: user.section || "",
      graduatingYear: user.graduatingYear || "",
      attended,
      startedAt,
      submittedAt,
      timeTakenMs,
      totalScore,
      questionsSolved: questionScores.filter((q) => q.solved).length,
      tabSwitchCount: proctor?.tabSwitchCount || 0,
      fullscreenExitCount: proctor?.fullscreenExitCount || 0,
      windowBlurCount: proctor?.windowBlurCount || 0,
      copyCount: proctor?.copyCount || 0,
      pasteCount: proctor?.pasteCount || 0,
      violationCount: (proctor?.violations || []).length,
      moduleScores,
      questionScores,
    };
  });

  // Rank by score, then by the faster completion. Equal scores and equal times
  // share a rank.
  const ranked = [...students].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aTime = a.timeTakenMs ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.timeTakenMs ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  let lastKey = null;
  let lastRank = 0;
  ranked.forEach((student, index) => {
    const key = `${student.totalScore}:${student.timeTakenMs ?? "na"}`;
    if (key !== lastKey) {
      lastRank = index + 1;
      lastKey = key;
    }
    student.rank = student.attended ? lastRank : null;
  });

  // ── question breakdown ─────────────────────────────────────────────────
  const questionBreakdown = questions.map((q) => {
    const questionId = q._id.toString();
    const solvers = solvedByQuestion.get(questionId);
    const module = moduleById.get(q.module?.toString());

    const scores = students
      .map((s) => bestScore.get(`${s.userId}:${questionId}`) || 0)
      .filter((_, i) => students[i].attended);

    return {
      questionId,
      title: q.title,
      type: q.type,
      difficultyLevel: q.difficultyLevel,
      maxMarks: q.marks || 0,
      moduleTitle: module?.title || "—",
      solvedCount: solvers ? solvers.size : 0,
      attemptCount: attemptsByQuestion.get(questionId) || 0,
      averageScore: scores.length
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0,
    };
  });

  // ── module breakdown ───────────────────────────────────────────────────
  const moduleBreakdown = modules.map((module) => {
    const moduleId = module._id.toString();
    const moduleQuestions = questions.filter(
      (q) => q.module?.toString() === moduleId
    );
    const maxMarks = moduleQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

    const attendedStudents = students.filter((s) => s.attended);
    const scores = attendedStudents.map(
      (s) =>
        s.moduleScores.find((m) => m.moduleId === moduleId)?.score || 0
    );

    return {
      moduleId,
      title: module.title,
      totalQuestions: moduleQuestions.length,
      maxMarks,
      averageScore: scores.length
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0,
      highestScore: scores.length ? Math.max(...scores) : 0,
      solvedTotal: moduleQuestions.reduce(
        (sum, q) => sum + (solvedByQuestion.get(q._id.toString())?.size || 0),
        0
      ),
    };
  });

  const attended = students.filter((s) => s.attended);
  const submitted = students.filter((s) => s.submittedAt);
  const totalMarksPossible = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const summary = {
    cohortId: cohort._id.toString(),
    cohortTitle: cohort.title,
    mode: cohort.mode,
    examStartTime: cohort.examStartTime,
    examEndTime: cohort.examEndTime,
    totalEligibleUsers: students.length,
    attendedCount: attended.length,
    notAttendedCount: students.length - attended.length,
    submittedCount: submitted.length,
    totalMarksPossible,
    totalMarksAchieved: students.reduce((sum, s) => sum + s.totalScore, 0),
    averageScore: attended.length
      ? Number(
          (
            attended.reduce((sum, s) => sum + s.totalScore, 0) / attended.length
          ).toFixed(2)
        )
      : 0,
    highestScore: attended.length
      ? Math.max(...attended.map((s) => s.totalScore))
      : 0,
    totalTabSwitches: students.reduce((sum, s) => sum + s.tabSwitchCount, 0),
    totalFullscreenExits: students.reduce(
      (sum, s) => sum + s.fullscreenExitCount,
      0
    ),
    generatedAt: new Date(),
  };

  // Persist the refreshed roll-up so the stored record matches the report.
  if (record) {
    for (const student of students) {
      const participant = record.findParticipant(student.userId);
      if (!participant) continue;
      participant.totalScore = student.totalScore;
      participant.questionsSolved = student.questionsSolved;
      participant.timeTakenMs = student.timeTakenMs;
      if (student.submittedAt) participant.submittedAt = student.submittedAt;
    }
    record.recomputeTotals(students.length);
    await record.save();
  }

  return {
    summary,
    students: ranked,
    modules: moduleBreakdown,
    questions: questionBreakdown,
    questionsMeta: questions.map((q) => ({
      questionId: q._id.toString(),
      title: q.title,
      moduleTitle: moduleById.get(q.module?.toString())?.title || "—",
      maxMarks: q.marks || 0,
    })),
  };
}

module.exports = {
  VIOLATION_TYPES,
  getOrCreateRecord,
  recordExamEntry,
  recordViolation,
  recordExamSubmission,
  buildExamReport,
};
