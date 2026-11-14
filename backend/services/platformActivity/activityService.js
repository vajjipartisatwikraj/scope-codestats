/**
 * The per-day activity of a student's external platforms: writing it (the nightly profile sync and a
 * manual refresh), deleting it (the username changed) and reading it together with the cohort activity
 * for the combined heatmap.
 *
 * The stored copy of a platform is replaced as a whole window on every refresh (models/PlatformDailyActivity),
 * so running a sync twice never adds a day twice, and a day that disappeared on the platform disappears here.
 */
const ActivityHeatmap = require("../../models/ActivityHeatmap");
const PlatformDailyActivity = require("../../models/PlatformDailyActivity");
const Profile = require("../../models/Profile");
const { ACTIVITY_PLATFORMS, STORE_DAYS, ACTIVITY_TIMEZONE } = require("../../config/platformActivity");
const { dayKeyOf, addDays } = require("../../utils/dayKeys");
const { fetchActivity } = require("../platformScraper");
const log = require("../../utils/logger").scope("PLATFORM-ACTIVITY");

const usernameKeyOf = (username) => String(username || "").trim().toLowerCase();
const todayKey = () => dayKeyOf(new Date(), ACTIVITY_TIMEZONE);

/**
 * Replaces the stored days of one platform with `daily` ({ "YYYY-MM-DD": count }).
 * Days older than the stored window, in the future or without activity are ignored.
 * @returns {Promise<{ days: number, total: number }>}
 */
async function saveActivity({ userId, platform, username, daily }) {
  if (!ACTIVITY_PLATFORMS[platform] || !daily || typeof daily !== "object") return { days: 0, total: 0 };

  const today = todayKey();
  const startKey = addDays(today, -(STORE_DAYS - 1));
  const usernameKey = usernameKeyOf(username);
  if (!usernameKey) return { days: 0, total: 0 };

  const entries = Object.entries(daily).filter(([key, count]) => key >= startKey && key <= today && count > 0);
  const operations = entries.map(([dateKey, count]) => ({
    updateOne: {
      filter: { userId, platform, dateKey },
      update: { $set: { count, usernameKey } },
      upsert: true,
    },
  }));
  // Days of the window that the platform no longer reports
  operations.push({
    deleteMany: { filter: { userId, platform, dateKey: { $gte: startKey, $nin: entries.map(([key]) => key) } } },
  });

  await PlatformDailyActivity.bulkWrite(operations, { ordered: false });
  return { days: entries.length, total: entries.reduce((sum, [, count]) => sum + count, 0) };
}

/** Deletes everything stored about one platform of one student. Returns how many days were deleted. */
async function clearActivity(userId, platform) {
  const { deletedCount } = await PlatformDailyActivity.deleteMany({ userId, platform });
  return deletedCount || 0;
}

/**
 * The combined heatmap of the last `days` days: cohort solves and every external platform, one entry
 * per day that had activity. Same shape as ActivityHeatmap.getHeatmap, with `sources` filled in:
 *   { dailyActivity: [{ date, count, level, sources: { cohort, leetcode, ... } }], activeDays, totalCount, days }
 * `count` adds the sources together; what one source counts is in config/platformActivity.js.
 */
async function getCombinedHeatmap(userId, days = 365) {
  const startKey = addDays(todayKey(), -(days - 1));
  const [cohort, rows] = await Promise.all([
    ActivityHeatmap.getHeatmap(userId, days),
    PlatformDailyActivity.find({ userId, dateKey: { $gte: startKey } }).select("platform dateKey count").lean(),
  ]);

  const byDay = new Map();
  const dayOf = (date) => {
    if (!byDay.has(date)) byDay.set(date, { date, count: 0, sources: {} });
    return byDay.get(date);
  };
  for (const day of cohort.dailyActivity) {
    if (day.count > 0) {
      const entry = dayOf(day.date);
      entry.sources.cohort = day.count;
      entry.count += day.count;
    }
  }
  for (const row of rows) {
    const entry = dayOf(row.dateKey);
    entry.sources[row.platform] = row.count;
    entry.count += row.count;
  }

  const dailyActivity = [...byDay.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((entry) => ({ ...entry, level: ActivityHeatmap.levelForCount(entry.count) }));

  return {
    dailyActivity,
    activeDays: dailyActivity.length,
    totalCount: dailyActivity.reduce((sum, entry) => sum + entry.count, 0),
    days,
  };
}

/**
 * Reads the activity of every platform a student linked, now, and stores it. One platform at a time
 * (the sites' rate limits are enforced inside each scraper). A platform that fails keeps its stored days.
 * @returns {Promise<Array<{ platform: string, username: string, ok: boolean, days?: number, total?: number, error?: string }>>}
 */
async function refreshUserActivity(userId) {
  const profiles = await Profile.find({ userId, platform: { $in: Object.keys(ACTIVITY_PLATFORMS) } })
    .select("platform username")
    .lean();

  const results = [];
  for (const profile of profiles) {
    const username = String(profile.username || "").trim();
    if (!username) continue;
    try {
      const activity = await fetchActivity(profile.platform, username);
      if (!activity) {
        results.push({ platform: profile.platform, username, ok: false, error: "The platform did not return an activity graph" });
        continue;
      }
      const saved = await saveActivity({ userId, platform: profile.platform, username, daily: activity.daily });
      results.push({ platform: profile.platform, username, ok: true, ...saved });
    } catch (error) {
      log.warn(`activity refresh failed | user=${String(userId).slice(-6)} platform=${profile.platform}: ${error.message}`);
      results.push({ platform: profile.platform, username, ok: false, error: error.message });
    }
  }
  return results;
}

module.exports = { saveActivity, clearActivity, getCombinedHeatmap, refreshUserActivity };
