/**
 * Reading platform progress for the dashboard Progress tab.
 *
 *   getOverview      one line per platform: linked?, state, current numbers
 *   getHistory       a stored-history platform (LeetCode, CodeChef, Codeforces, HackerRank)
 *                    over a range of days, as charts-ready series
 *
 * GitHub is not stored; see githubTimelineService.js.
 *
 * Every answer carries a `state`, so the page can explain what it shows:
 *   not_linked        no username saved for the platform
 *   pending           username saved, first sync has not finished yet
 *   invalid_username  the platform says the account does not exist (never synced)
 *   sync_failed       the first sync failed for another reason (never synced)
 *   no_history        synced, but nothing to chart yet (for example an empty account)
 *   ok                data follows (`warning` explains a failing latest sync, if any)
 */
const Profile = require("../../models/Profile");
const PlatformSnapshot = require("../../models/PlatformSnapshot");
const {
  HISTORY_PLATFORMS,
  GITHUB,
  PROGRESS_PLATFORMS,
  HISTORY_TIMEZONE,
} = require("../../config/platformProgress");
const { dayKeyOf, addDays, daysBetween } = require("../../utils/dayKeys");
const { recordSnapshot, usernameKeyOf } = require("./snapshotService");
const { buildDailySeries, summarize, bucketize } = require("./seriesBuilder");

const PROFILE_FIELDS =
  "userId platform username problemsSolved easyProblemsSolved mediumProblemsSolved hardProblemsSolved rating contestsParticipated lastUpdated lastUpdateStatus lastUpdateError lastErrorType lastErrorAt details";

const SNAPSHOT_FIELDS =
  "dateKey problemsSolved easyProblemsSolved mediumProblemsSolved hardProblemsSolved rating contestsParticipated";

// Errors that mean the account itself cannot be found on the platform
const ACCOUNT_ERRORS = new Set(["invalid_username", "not_found"]);

/**
 * What the profile's situation is, before any history is looked at.
 * @returns {"not_linked"|"pending"|"invalid_username"|"sync_failed"|"synced"}
 */
function resolveProfileState(profile) {
  if (!profile || !String(profile.username || "").trim()) return "not_linked";
  if (profile.lastUpdated) return "synced";
  if (ACCOUNT_ERRORS.has(profile.lastErrorType)) return "invalid_username";
  if (profile.lastUpdateStatus === "error") return "sync_failed";
  return "pending";
}

/** The latest failed sync of a profile that has data, for a warning banner. */
function warningOf(profile) {
  if (profile.lastUpdateStatus !== "error" || !profile.lastUpdateError) return null;
  return {
    errorType: profile.lastErrorType || "unknown",
    message: profile.lastUpdateError,
    at: profile.lastErrorAt || null,
    accountMissing: ACCOUNT_ERRORS.has(profile.lastErrorType),
  };
}

/** Fields shared by every answer about one platform. */
function baseAnswer(platform, profile, state) {
  const failed = profile && (state === "invalid_username" || state === "sync_failed");
  return {
    platform,
    state,
    username: profile?.username || "",
    message: failed ? profile.lastUpdateError || null : null,
    errorType: failed ? profile.lastErrorType || null : null,
  };
}

const currentOf = (profile) => ({
  problemsSolved: profile.problemsSolved || 0,
  rating: profile.rating > 0 ? profile.rating : null,
  contests: profile.contestsParticipated || 0,
});

/**
 * One entry per platform plus totals for the "problems by platform" pie chart.
 * One query, from the Profile documents (no history needed).
 */
async function getOverview(userId) {
  const profiles = await Profile.find({ userId, platform: { $in: PROGRESS_PLATFORMS } })
    .select(PROFILE_FIELDS)
    .lean();
  const byPlatform = new Map(profiles.map((profile) => [profile.platform, profile]));

  const platforms = PROGRESS_PLATFORMS.map((platform) => {
    const profile = byPlatform.get(platform);
    const profileState = resolveProfileState(profile);
    const state = profileState === "synced" ? "ok" : profileState;
    const answer = {
      ...baseAnswer(platform, profile, state),
      stored: Boolean(HISTORY_PLATFORMS[platform]),
      capabilities: HISTORY_PLATFORMS[platform] || null,
      lastSyncedAt: profile?.lastUpdated || null,
      warning: state === "ok" ? warningOf(profile) : null,
    };
    if (state === "ok") {
      answer.current = platform === GITHUB ? { repos: profile.details?.publicRepos || 0 } : currentOf(profile);
    }
    return answer;
  });

  const problemsByPlatform = platforms
    .filter((entry) => entry.stored && entry.state === "ok" && entry.current.problemsSolved > 0)
    .map((entry) => ({ platform: entry.platform, value: entry.current.problemsSolved }));

  return {
    platforms,
    problemsByPlatform,
    totalProblemsSolved: problemsByPlatform.reduce((sum, item) => sum + item.value, 0),
  };
}

/** Snapshots for a range plus the one carried in from before it (two indexed reads). */
async function loadWindow({ userId, platform, usernameKey, startKey, endKey }) {
  const scope = { userId, platform, usernameKey };
  const [records, carryIn, first] = await Promise.all([
    PlatformSnapshot.find({ ...scope, dateKey: { $gte: startKey, $lte: endKey } })
      .sort({ dateKey: 1 })
      .select(SNAPSHOT_FIELDS)
      .lean(),
    PlatformSnapshot.findOne({ ...scope, dateKey: { $lt: startKey } })
      .sort({ dateKey: -1 })
      .select(SNAPSHOT_FIELDS)
      .lean(),
    PlatformSnapshot.findOne(scope).sort({ dateKey: 1 }).select("dateKey").lean(),
  ]);
  return { records, carryIn, trackingSince: first?.dateKey || null };
}

/**
 * History of one stored platform over the last `days` days (IST days, ending today).
 */
async function getHistory(userId, platform, days) {
  const capabilities = HISTORY_PLATFORMS[platform];
  const profile = await Profile.findOne({ userId, platform }).select(PROFILE_FIELDS).lean();
  const profileState = resolveProfileState(profile);

  if (profileState !== "synced") {
    return { ...baseAnswer(platform, profile, profileState), capabilities };
  }

  const endKey = dayKeyOf(new Date(), HISTORY_TIMEZONE);
  const startKey = addDays(endKey, -(days - 1));
  const query = {
    userId,
    platform,
    usernameKey: usernameKeyOf(profile.username),
    startKey,
    endKey,
  };

  let window = await loadWindow(query);
  if (!window.records.length && !window.carryIn) {
    // Accounts synced before history existed have no snapshot yet: start it from the
    // numbers the profile already holds, dated by its last successful sync.
    await recordSnapshot(profile, { now: profile.lastUpdated });
    window = await loadWindow(query);
  }

  const answer = {
    ...baseAnswer(platform, profile, "ok"),
    capabilities,
    range: { start: startKey, end: endKey, days, timezone: HISTORY_TIMEZONE },
    lastSyncedAt: profile.lastUpdated,
    // Whole days since the last successful sync (0 = synced today). The numbers are
    // carried forward from that sync, so a large value means they may be out of date.
    staleDays: Math.max(0, daysBetween(dayKeyOf(profile.lastUpdated, HISTORY_TIMEZONE), endKey)),
    warning: warningOf(profile),
    current: currentOf(profile),
    trackingSince: window.trackingSince,
  };

  if (!window.records.length && !window.carryIn) {
    return { ...answer, state: "no_history" };
  }

  const series = buildDailySeries({
    records: window.records,
    carryIn: window.carryIn,
    startKey,
    endKey,
  });

  return {
    ...answer,
    summary: summarize(series, window.carryIn),
    series,
    buckets: bucketize(series, days, {
      sum: { problemsSolved: "problemsGain", contests: "contestsGain", ratingChange: "ratingChange" },
      last: { rating: "rating", totalProblems: "problemsSolved" },
    }),
    difficulty: capabilities.difficulty
      ? (() => {
          const latest = series[series.length - 1];
          return { easy: latest.easy, medium: latest.medium, hard: latest.hard };
        })()
      : null,
  };
}

module.exports = { getOverview, getHistory, resolveProfileState, warningOf };
