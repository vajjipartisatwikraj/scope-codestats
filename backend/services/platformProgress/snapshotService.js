/**
 * Writing platform history (the write side of the dashboard Progress tab).
 *
 * Every successful profile sync (services/profileSyncService.js) offers its fresh stats to
 * `recordSnapshot`. A snapshot is stored only when it adds information, which keeps the
 * collection sparse (see models/PlatformSnapshot.js):
 *
 *   - the first reading of an account is stored as its starting point,
 *   - a later reading is stored only if a number changed since the latest stored one,
 *   - several syncs on the same day update that day's document instead of adding more,
 *   - if a day's readings end up equal to the day before, the day's document is removed.
 *
 * Bad readings are kept out of the history:
 *   - incomplete scraper answers (`partial`) are never stored,
 *   - a number that reads 0 after being above 0 is a scrape gap, not progress (a solved
 *     count or contest count does not go back to 0, and a rated user does not become
 *     unrated), so the previous value is kept for that number.
 */
const PlatformSnapshot = require("../../models/PlatformSnapshot");
const { HISTORY_PLATFORMS, HISTORY_TIMEZONE } = require("../../config/platformProgress");
const { dayKeyOf } = require("../../utils/dayKeys");
const log = require("../../utils/logger").scope("PLATFORM-HISTORY");

const METRICS = PlatformSnapshot.METRICS;

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

/** The numbers worth keeping from a profile (rating keeps two decimals, the rest are whole). */
function readMetrics(source) {
  const out = {};
  for (const metric of METRICS) {
    const value = toNumber(source?.[metric]);
    out[metric] = metric === "rating" ? Math.round(value * 100) / 100 : Math.round(value);
  }
  return out;
}

/** A number that reads 0 after being above 0 keeps its previous value (scrape gap). */
function applyGapRule(metrics, previous) {
  if (!previous) return metrics;
  const out = { ...metrics };
  for (const metric of METRICS) {
    if (out[metric] === 0 && (previous[metric] || 0) > 0) out[metric] = previous[metric];
  }
  return out;
}

const sameMetrics = (a, b) => METRICS.every((metric) => (a[metric] || 0) === (b[metric] || 0));
const isAllZero = (metrics) => METRICS.every((metric) => !metrics[metric]);

const usernameKeyOf = (username) => String(username || "").trim().toLowerCase();

/** Deletes every stored snapshot of one user's platform. Returns how many were deleted. */
async function clearHistory(userId, platform) {
  const { deletedCount } = await PlatformSnapshot.deleteMany({ userId, platform });
  if (deletedCount) log.debug(`Cleared ${deletedCount} ${platform} snapshot(s) for user ${userId}`);
  return deletedCount || 0;
}

/** Writes (or updates) the document of one day. */
async function writeDay({ userId, platform, dateKey, username, usernameKey, metrics }) {
  const filter = { userId, platform, dateKey };
  const update = { $set: { ...metrics, username, usernameKey } };
  try {
    await PlatformSnapshot.updateOne(filter, update, { upsert: true });
  } catch (error) {
    // Two syncs of the same profile raced to create the day's document; update it instead.
    if (error.code !== 11000) throw error;
    await PlatformSnapshot.updateOne(filter, update);
  }
}

/**
 * Offers a profile's current stats to the history.
 *
 * @param {object} profile a Profile document (or lean object) after a successful sync
 * @param {object} [options]
 * @param {boolean} [options.partial] the scraper flagged its answer as incomplete
 * @param {Date} [options.now] the moment of the reading (defaults to now)
 * @returns {Promise<{recorded: boolean, reason?: string}>}
 */
async function recordSnapshot(profile, { partial = false, now = new Date() } = {}) {
  const { userId, platform } = profile;
  if (!HISTORY_PLATFORMS[platform]) return { recorded: false, reason: "unsupported_platform" };
  if (partial) return { recorded: false, reason: "partial" };

  const username = String(profile.username || "").trim();
  if (!username) return { recorded: false, reason: "no_username" };
  const usernameKey = usernameKeyOf(username);
  const dateKey = dayKeyOf(now, HISTORY_TIMEZONE);

  // The two latest documents tell us today's state and the state before today.
  let recent = await PlatformSnapshot.find({ userId, platform })
    .sort({ dateKey: -1 })
    .limit(2)
    .lean();

  // History that belongs to another account must never be continued.
  if (recent.length > 0 && recent[0].usernameKey !== usernameKey) {
    await clearHistory(userId, platform);
    recent = [];
  }

  const todayDoc = recent[0]?.dateKey === dateKey ? recent[0] : null;
  const before = todayDoc ? recent[1] : recent[0]; // latest document before today
  const latest = todayDoc || before; // latest known state

  const metrics = applyGapRule(readMetrics(profile), latest);

  if (!latest && isAllZero(metrics)) return { recorded: false, reason: "empty" };

  // Back to what it was before today: today's document no longer adds anything.
  if (before && sameMetrics(metrics, before)) {
    if (todayDoc) await PlatformSnapshot.deleteOne({ _id: todayDoc._id });
    return { recorded: false, reason: "unchanged" };
  }
  if (todayDoc && sameMetrics(metrics, todayDoc)) return { recorded: false, reason: "unchanged" };

  await writeDay({ userId, platform, dateKey, username, usernameKey, metrics });
  return { recorded: true, reason: before || todayDoc ? "changed" : "first_reading" };
}

module.exports = { recordSnapshot, clearHistory, readMetrics, applyGapRule, usernameKeyOf };
