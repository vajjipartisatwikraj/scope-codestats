/**
 * Heatmap controller.
 *
 * The activity heatmap is event-driven and has no connection to any daily
 * snapshot: each solved problem adds to the day's count when it happens
 * (cohort and practice-arena solves, and growth detected by a profile sync).
 * Wired up in routes/heatmap.js.
 */
const mongoose = require("mongoose");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const User = require("../models/User");
const { isAdminOrTeacher } = require("../utils/userHelpers");
const log = require("../utils/logger").scope("HEATMAP");

const MAX_DAYS = 366;

/** Rolling window length from `?days=` / body, capped to a year. */
const parseDays = (value) => Math.min(parseInt(value, 10) || 365, MAX_DAYS);

/**
 * GET /api/dashboard/heatmap/:userId
 * Daily solved-problem counts plus intensity levels for the last N days.
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

    res.json(await ActivityHeatmap.getHeatmap(userId, days));
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

module.exports = { getHeatmap, rebuildHeatmap };
