/**
 * Loads everything the admin analytics need for one period: every active student with their
 * current platform numbers and their changes over the period.
 *
 * It is the only part that reads the database. Filters, tables and charts are then worked
 * out in memory from this (analyticsBuilder.js), so the dataset is cached per period and
 * changing a filter does not read the database again.
 */
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const AcademicYearConfig = require("../../models/AcademicYearConfig");
const { PLATFORM_STATS } = require("../../config/adminAnalytics");
const { HISTORY_TIMEZONE } = require("../../config/platformProgress");
const { dayKeyOf, addDays } = require("../../utils/dayKeys");
const { activeStudentFilter } = require("../rankings/scoreHistoryService");
const { loadPeriodChanges, trackingSince } = require("./periodGains");
const { buildRow } = require("./rowBuilder");

const PROFILE_FIELDS = [
  "userId",
  "platform",
  "username",
  "lastUpdateStatus",
  "lastUpdated",
  ...new Set(Object.values(PLATFORM_STATS).flatMap((stats) => Object.values(stats))),
].join(" ");

/** graduation year -> label shown to the admin ("2027 · III Year"). */
async function loadYearLabels() {
  const config = await AcademicYearConfig.getConfig();
  return new Map(config.yearMappings.map((m) => [m.graduationYear, `${m.graduationYear} · ${m.displayName}`]));
}

/**
 * @param {number} days length of the period (the last `days` days in IST, ending today)
 * @returns {Promise<{generatedAt: string, range: object, tracking: object,
 *   yearLabels: Map<number,string>, entries: Array<{row: object, changes: object}>}>}
 */
async function loadDataset(days) {
  const endKey = dayKeyOf(new Date(), HISTORY_TIMEZONE);
  const startKey = addDays(endKey, -(days - 1));

  const [students, yearLabels] = await Promise.all([
    User.find(await activeStudentFilter())
      .select("name rollNumber department section graduatingYear weeklyActivity")
      .lean(),
    loadYearLabels(),
  ]);
  const studentIds = new Set(students.map((s) => String(s._id)));

  // Every platform profile, read once; those of people outside the analytics are skipped.
  const profilesByUser = new Map();
  const usernameKeys = new Map();
  const cursor = Profile.find({ platform: { $in: Object.keys(PLATFORM_STATS) } })
    .select(PROFILE_FIELDS)
    .lean()
    .cursor();
  for await (const profile of cursor) {
    const userId = String(profile.userId);
    if (!studentIds.has(userId)) continue;
    if (!profilesByUser.has(userId)) profilesByUser.set(userId, []);
    profilesByUser.get(userId).push(profile);
    usernameKeys.set(`${userId}:${profile.platform}`, String(profile.username || "").trim().toLowerCase());
  }

  const [changes, tracking] = await Promise.all([
    loadPeriodChanges({ startKey, endKey, usernameKeys }),
    trackingSince(),
  ]);

  const entries = students.map((student) => {
    const id = String(student._id);
    const studentChanges = changes.get(id);
    return { row: buildRow(student, profilesByUser.get(id) || [], studentChanges), changes: studentChanges || {} };
  });

  return {
    generatedAt: new Date().toISOString(),
    range: { start: startKey, end: endKey, days, timezone: HISTORY_TIMEZONE },
    tracking,
    yearLabels,
    entries,
  };
}

module.exports = { loadDataset };
