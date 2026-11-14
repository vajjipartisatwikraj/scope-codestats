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

  const entries = rows.map(({ attempt }) => {
    return {
      attemptId: attempt._id,
      rank: null,
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
  return assignRanks(entries);
}

/**
 * Ranks entries that are already in leaderboard order: finished attempts get a rank (equal score and
 * time share one), the others none. Call it again on a filtered list to rank inside that group.
 */
function assignRanks(entries) {
  let lastKey = null;
  let lastRank = 0;
  return entries.map((entry, index) => {
    if (entry.status !== "completed") return { ...entry, rank: null };
    const score = typeof entry.finalScore === "number" ? entry.finalScore : null;
    const key = `${score}|${entry.totalTimeUsedSeconds || 0}`;
    const rank = key === lastKey ? lastRank : index + 1;
    lastKey = key;
    lastRank = rank;
    return { ...entry, rank };
  });
}

module.exports = { buildLeaderboard, assignRanks };
