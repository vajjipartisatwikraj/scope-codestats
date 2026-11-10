/**
 * Ranked results of a speech test.
 *
 * Order: higher final score first; ties go to the student who used less time,
 * and students with identical score and time share a rank.
 */
const SpeechTestAttempt = require("../models/SpeechTestAttempt");
const { attemptSectionOf } = require("./speechTestState");

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

module.exports = { buildLeaderboard };
