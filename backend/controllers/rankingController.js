/**
 * Ranking controller: the admin's view of score and rank calculation.
 *
 *   GET  /status     the latest ranking runs and whether one is in progress
 *   POST /recompute  calculate scores and ranks now, from the scores already stored
 *
 * Wired up in routes/rankings.js, mounted under /api/admin/rankings, which also applies
 * authentication and rate limiting. The calculation is in services/rankings/scoreHistoryService.
 * (After every profile sync it runs by itself; see scripts/updateUserProfiles.js.)
 */
const scoreHistoryService = require("../services/rankings/scoreHistoryService");
const syncJobs = require("../services/syncJobService");
const log = require("../utils/logger").scope("RANKINGS");

const describe = (run) => ({
  id: run._id,
  dateKey: run.dateKey,
  source: run.source,
  status: run.status,
  startedAt: run.startedAt,
  finishedAt: run.finishedAt,
  durationMs: run.durationMs,
  students: run.students,
  written: run.written,
  unchanged: run.unchanged,
  rankedByPlatform: run.rankedByPlatform instanceof Map ? Object.fromEntries(run.rankedByPlatform) : run.rankedByPlatform || {},
  sync: run.sync,
  error: run.error,
});

/** GET /api/admin/rankings/status */
const getStatus = async (_req, res) => {
  try {
    const { running, runs } = await scoreHistoryService.getStatus(10);
    res.json({
      running,
      syncRunning: Boolean(syncJobs.getRunningJob()),
      runs: runs.map(describe),
    });
  } catch (err) {
    log.error("Error reading ranking status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /api/admin/rankings/recompute */
const recompute = async (req, res) => {
  // While a profile sync is running, scores are changing under the calculation. The sync
  // ranks everyone by itself when it finishes.
  if (syncJobs.getRunningJob()) {
    return res.status(409).json({
      message: "A profile sync is running. Ranks are calculated automatically when it finishes.",
      reason: "sync_running",
    });
  }

  try {
    const run = await scoreHistoryService.recordScoresAndRanks({
      source: "recompute",
      triggeredBy: req.user.id,
    });
    res.json({ message: "Scores and ranks recalculated", run: describe(run) });
  } catch (err) {
    if (err.code === "RANKING_IN_PROGRESS") {
      return res.status(409).json({ message: err.message, reason: "ranking_running" });
    }
    res.status(500).json({ message: "Scores and ranks could not be calculated", error: err.message });
  }
};

module.exports = { getStatus, recompute };
