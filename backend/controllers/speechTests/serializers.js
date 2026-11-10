/**
 * Shapes of speech test data sent to students.
 */
const { windowState, attemptSectionOf } = require("../../services/speechTestState");

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
    canEnd: attempt.status === "in_progress",
  };
}

/** The short test description used by the results and leaderboard responses. */
const summarizeTest = (test) => ({
  _id: test._id,
  title: test.title,
  sections: test.sections.map((s) => ({ _id: s._id, title: s.title, type: s.type })),
});

module.exports = { serializeTestForStudent, serializeAttempt, summarizeTest };
