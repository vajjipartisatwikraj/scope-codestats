/**
 * Heatmap controller.
 *
 * The activity heatmap combines two things: cohort solves, added to the day's count when they happen
 * (models/ActivityHeatmap), and the per-day activity of the student's external platforms, copied from the
 * platforms by the nightly profile sync (models/PlatformDailyActivity, services/platformActivity).
 * Wired up in routes/heatmap.js.
 */
const mongoose = require("mongoose");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const { getCombinedHeatmap, refreshUserActivity } = require("../services/platformActivity/activityService");
const { MANUAL_REFRESH_COOLDOWN_MS } = require("../config/platformActivity");
const User = require("../models/User");
const { isAdminOrTeacher } = require("../utils/userHelpers");
const log = require("../utils/logger").scope("HEATMAP");

const MAX_DAYS = 366;

/** Rolling window length from `?days=` / body, capped to a year. */
const parseDays = (value) => Math.min(parseInt(value, 10) || 365, MAX_DAYS);

// When each student last asked for a manual refresh of their platform activity
const lastRefresh = new Map();

/**
 * GET /api/dashboard/heatmap/:userId
 * Daily activity for the last N days: cohort solves and every linked platform together, with the
 * count of each source on each day and the intensity level.
 * Any signed-in user may read it: profile pages show other students' heatmaps.
 */
const getHeatmap = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const days = parseDays(req.query.days);

    // A user with no heatmap yet (an account that predates the feature) gets
    // one built once from their solve history. Live events keep it current.
    if ((await ActivityHeatmap.countDocuments({ userId })) === 0) {
      await ActivityHeatmap.rebuildFromEvents(userId, days).catch((err) =>
        log.error("[Heatmap] bootstrap failed:", err.message)
      );
    }

    res.json(await getCombinedHeatmap(userId, days));
  } catch (error) {
    log.error(`[Heatmap] fetch failed | user=${req.params.userId}`, error);
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
};

/**
 * POST /api/dashboard/heatmap/generate/:userId
 * Rebuilds a user's heatmap from their solve history. Only the user
 * themselves, or an admin / teacher, may trigger it.
 */
const rebuildHeatmap = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (userId !== String(req.user.id) && !isAdminOrTeacher(req.user)) {
      return res.status(403).json({ error: "You can only rebuild your own heatmap" });
    }

    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ error: "User not found" });
    }

    const days = parseDays(req.body?.days);
    const result = await ActivityHeatmap.rebuildFromEvents(userId, days);
    const data = await ActivityHeatmap.getHeatmap(userId, days);

    res.json({
      success: true,
      message: `Heatmap rebuilt from ${result.inserted} days of activity`,
      data,
    });
  } catch (error) {
    log.error(`[Heatmap] rebuild failed | user=${req.params.userId}`, error);
    res.status(500).json({ error: "Failed to generate heatmap data" });
  }
};

/**
 * POST /api/dashboard/heatmap/refresh/:userId
 * Reads the activity of every platform the student linked right now and stores it, then answers with the
 * new heatmap. The nightly profile sync does the same for everybody; this is for a student who has just
 * linked an account. Only the user themselves, or an admin / teacher, may trigger it, and a student may
 * ask once every few minutes.
 */
const refreshActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (userId !== String(req.user.id) && !isAdminOrTeacher(req.user)) {
      return res.status(403).json({ error: "You can only refresh your own activity" });
    }

    const waitMs = (lastRefresh.get(userId) || 0) + MANUAL_REFRESH_COOLDOWN_MS - Date.now();
    if (waitMs > 0) {
      return res.status(429).json({ error: `Your activity was refreshed a moment ago. Try again in ${Math.ceil(waitMs / 60000)} minute(s).` });
    }
    lastRefresh.set(userId, Date.now());

    const results = await refreshUserActivity(userId);
    log.info(`[Heatmap] activity refreshed | user=${userId.slice(-6)} platforms=${results.length} failed=${results.filter((r) => !r.ok).length}`);
    res.json({ results, data: await getCombinedHeatmap(userId, parseDays(req.body?.days)) });
  } catch (error) {
    log.error(`[Heatmap] refresh failed | user=${req.params.userId}`, error);
    res.status(500).json({ error: "Failed to refresh the activity" });
  }
};

module.exports = { getHeatmap, rebuildHeatmap, refreshActivity };
