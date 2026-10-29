/**
 * One student's analytics row: identity, current numbers on every platform, totals, and the
 * changes over the period. Pure functions; the data comes from analyticsDataset.js.
 *
 * Shape (also what the admin table shows):
 *   { id, name, rollNumber, department, section, graduatingYear,
 *     platformsLinked, consistencyIndex, activeDays (last 7 days),
 *     totalScore, totalProblems, totalContests,
 *     scoreGain, problemsGain, contestsGain,      // null when the history has no reading
 *     lastSynced,
 *     platforms: { leetcode: { username, status, score, problems, rating, ...,
 *                              scoreGain, problemsGain, contestsGain, ratingChange } | null } }
 * A platform the student has not linked is null (not zeros). A change is null when there is
 * no stored reading to measure it from.
 */
const {
  PLATFORM_STATS,
  CONTEST_STAT,
  GAIN_STATS,
  GAIN_FIELD,
} = require("../../config/adminAnalytics");

const number = (value) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const readPath = (object, path) => path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);

/** The numbers of one platform profile, under the API names. */
function readStats(platform, profile, changes) {
  const out = {
    // The internal platform stores the student's email as its "username"; it is not shown.
    username: platform === "scopecodestats" ? "" : profile.username || "",
    status: profile.lastUpdateStatus || "pending",
    lastUpdated: profile.lastUpdated || null,
  };
  for (const [stat, path] of Object.entries(PLATFORM_STATS[platform])) out[stat] = number(readPath(profile, path));
  for (const [kind, platforms] of Object.entries(GAIN_STATS)) {
    if (!platforms.includes(platform)) continue;
    const key = kind === "score" ? `score.${platform}` : `${kind}.${platform}`;
    out[GAIN_FIELD[kind]] = changes && changes[key] ? changes[key].gain : null;
  }
  return out;
}

/** Sum of the numbers that are not null; null when all are (nothing was measured). */
function sumKnown(values) {
  const known = values.filter((v) => v !== null && v !== undefined);
  return known.length ? Math.round(known.reduce((a, b) => a + b, 0) * 100) / 100 : null;
}

/**
 * @param {object} student lean User: _id, name, rollNumber, department, section, graduatingYear
 * @param {Array<object>} profiles lean Profile documents of the student
 * @param {object|undefined} changes the student's period changes (periodGains.js)
 */
function buildRow(student, profiles, changes) {
  const platforms = Object.fromEntries(Object.keys(PLATFORM_STATS).map((platform) => [platform, null]));
  for (const profile of profiles) {
    if (PLATFORM_STATS[profile.platform]) platforms[profile.platform] = readStats(profile.platform, profile, changes);
  }

  const linked = Object.values(platforms).filter(Boolean);
  let totalScore = 0;
  let totalProblems = 0;
  let totalContests = 0;
  for (const [platform, entry] of Object.entries(platforms)) {
    if (!entry) continue;
    totalScore += entry.score;
    totalProblems += entry.problems || 0;
    if (CONTEST_STAT[platform]) totalContests += entry[CONTEST_STAT[platform]] || 0;
  }

  const lastSynced = linked.reduce((latest, entry) => {
    const when = entry.lastUpdated ? new Date(entry.lastUpdated).getTime() : 0;
    return when > latest ? when : latest;
  }, 0);

  return {
    id: String(student._id),
    name: student.name || "",
    rollNumber: student.rollNumber || "",
    department: student.department || "",
    section: student.section || "",
    graduatingYear: student.graduatingYear || null,
    platformsLinked: linked.length,
    // The last 7 days, whatever period is chosen (services/weeklyActivity)
    consistencyIndex: student.weeklyActivity?.consistencyIndex || 0,
    activeDays: student.weeklyActivity?.activeDays || 0,
    totalScore: Math.round(totalScore * 100) / 100,
    totalProblems,
    totalContests,
    // Total score change comes from the total itself, not the sum of platforms, so a platform
    // linked mid-period (whose first reading is its starting point) still counts in the total.
    scoreGain: changes && changes.score ? changes.score.gain : null,
    problemsGain: sumKnown(linked.map((entry) => entry.problemsGain)),
    contestsGain: sumKnown(linked.map((entry) => entry.contestsGain)),
    lastSynced: lastSynced ? new Date(lastSynced).toISOString() : null,
    platforms,
  };
}

/** The value of a sort key ("totalScore", "leetcode.rating") of a row; undefined if absent. */
function sortValue(row, key) {
  if (!key.includes(".")) return row[key];
  const [platform, stat] = key.split(".");
  return row.platforms[platform]?.[stat];
}

module.exports = { buildRow, sortValue, sumKnown };
