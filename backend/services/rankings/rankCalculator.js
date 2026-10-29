/**
 * Ranking students by score. Pure functions: no database, no clock.
 *
 * Ties share the best rank ("competition ranking"): scores 90, 80, 80, 70 rank 1, 2, 2, 4.
 * `of` is the size of the group that was ranked.
 */
const { SCORE_PLATFORMS, MIN_PLATFORM_SCORE_TO_RANK } = require("../../config/rankings");

const toScore = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

/**
 * Ranks the given entries by score, highest first.
 * @param {Array<{key: string, score: number}>} entries
 * @returns {Map<string, {rank: number, of: number}>}
 */
function rankEntries(entries) {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const result = new Map();
  let rank = 1;
  sorted.forEach((entry, index) => {
    if (index > 0 && entry.score < sorted[index - 1].score) rank = index + 1;
    result.set(entry.key, { rank, of: sorted.length });
  });
  return result;
}

/**
 * Scores and ranks of a set of students.
 *
 * @param {Array<{userId: string, department?: string, scores: Object<string, number>}>} students
 *   `scores` has an entry for each platform the student has linked (0 is a real score).
 * @returns {Map<string, {
 *   department: string,
 *   totalScore: number,
 *   scores: Object<string, number>,
 *   ranks: {
 *     overall: {rank, of},
 *     department: {rank, of} | null,
 *     platforms: Object<string, {rank, of}>
 *   }
 * }>>} keyed by userId
 */
function computeRanks(students) {
  const prepared = students.map((student) => {
    const scores = {};
    for (const platform of SCORE_PLATFORMS) {
      if (student.scores && student.scores[platform] !== undefined && student.scores[platform] !== null) {
        scores[platform] = toScore(student.scores[platform]);
      }
    }
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    return {
      key: String(student.userId),
      department: String(student.department || "").trim(),
      scores,
      totalScore,
    };
  });

  const overall = rankEntries(prepared.map((s) => ({ key: s.key, score: s.totalScore })));

  const byDepartment = new Map();
  for (const student of prepared) {
    if (!student.department) continue;
    if (!byDepartment.has(student.department)) byDepartment.set(student.department, []);
    byDepartment.get(student.department).push({ key: student.key, score: student.totalScore });
  }
  const department = new Map();
  for (const entries of byDepartment.values()) {
    for (const [key, value] of rankEntries(entries)) department.set(key, value);
  }

  const platformRanks = {};
  for (const platform of SCORE_PLATFORMS) {
    platformRanks[platform] = rankEntries(
      prepared
        .filter((s) => (s.scores[platform] || 0) > MIN_PLATFORM_SCORE_TO_RANK)
        .map((s) => ({ key: s.key, score: s.scores[platform] }))
    );
  }

  const result = new Map();
  for (const student of prepared) {
    const platforms = {};
    for (const platform of SCORE_PLATFORMS) {
      const ranked = platformRanks[platform].get(student.key);
      if (ranked) platforms[platform] = ranked;
    }
    result.set(student.key, {
      department: student.department,
      totalScore: student.totalScore,
      scores: student.scores,
      ranks: {
        overall: overall.get(student.key),
        department: department.get(student.key) || null,
        platforms,
      },
    });
  }
  return result;
}

/** Share of the group ranked below the student, 0-100 (rank 1 of 100 -> 99). */
function percentileOf({ rank, of }) {
  if (!of || of <= 1) return 100;
  return Math.round(((of - rank) / of) * 10000) / 100;
}

module.exports = { rankEntries, computeRanks, percentileOf };
