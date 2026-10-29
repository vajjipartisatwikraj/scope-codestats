/**
 * Daily cron controller.
 *
 * Admin endpoints for the profile sync jobs: the nightly run (scheduled in
 * cron-jobs.js) and runs an admin starts by hand. Wired up in
 * routes/dailyCrons.js, mounted under /api/admin, which also applies auth and
 * adminAuth.
 *
 *   GET  /sync-jobs            every run, newest first, with live progress
 *   GET  /sync-jobs/stats      totals for the last N days
 *   GET  /sync-jobs/:id        one run in detail (% done, passed / failed, failed profiles)
 *   POST /sync-jobs            start a run
 *   POST /sync-jobs/:id/cancel cancel a running run
 *
 * The runs themselves are managed by services/syncJobService.
 */
const mongoose = require("mongoose");
const ProfileSyncHistory = require("../models/ProfileSyncHistory");
const syncJobs = require("../services/syncJobService");
const log = require("../utils/logger").scope("DAILY-CRON");

const MAX_PAGE_SIZE = 100;
const DEFAULT_STATS_DAYS = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

const serverError = (res, err, label) => {
  log.error(`${label}:`, err);
  res.status(500).json({ message: "Server error" });
};

const validId = (res, id) => {
  if (mongoose.isValidObjectId(id)) return true;
  res.status(400).json({ message: "Invalid sync id" });
  return false;
};

const secondsSince = (time) => Math.max(0, Math.floor((Date.now() - new Date(time).getTime()) / 1000));

/** Fields of a run that are the same in the list and in the detail view. */
function summarize(doc) {
  const running = doc.status === "running";
  return {
    id: String(doc._id),
    status: doc.status,
    jobType: doc.jobType,
    inProgress: running,
    cancelled: Boolean(doc.cancelled),
    progress: doc.status === "completed" ? 100 : syncJobs.percent(doc.processedUsers, doc.totalUsers),
    totalUsers: doc.totalUsers || 0,
    processedUsers: doc.processedUsers || 0,
    updatedProfiles: doc.updatedProfiles || 0,
    failedProfiles: doc.failedProfiles || 0,
    totalProfiles: doc.totalProfiles || 0,
    startTime: doc.startTime,
    endTime: doc.endTime || null,
    elapsedSeconds: running ? secondsSince(doc.startTime) : doc.duration || 0,
    triggeredBy: doc.triggeredBy || null,
    summary: doc.summary || null,
  };
}

/** Latest error message recorded for a run. */
const lastError = (doc) => (doc.errorLog?.length ? doc.errorLog[doc.errorLog.length - 1].message : null);

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/sync-jobs?page=1&limit=20
 * Every run (previous and running), newest first. Cheap: no failed-profile
 * details, so it can be refreshed often.
 */
const listSyncs = async (req, res) => {
  try {
    // A run that died must not show as "running" forever.
    await syncJobs.reconcileStaleRuns();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [docs, total] = await Promise.all([
      ProfileSyncHistory.find()
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-failedProfileDetails -errorLog -platformStats")
        .populate("triggeredBy", "name email")
        .lean(),
      ProfileSyncHistory.countDocuments(),
    ]);

    res.json({
      syncs: docs.map(summarize),
      runningSyncId: syncJobs.getRunningJob()?.id || null,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    serverError(res, err, "Error listing sync jobs");
  }
};

/**
 * GET /api/admin/sync-jobs/stats?days=30
 */
const getSyncStats = async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || DEFAULT_STATS_DAYS));
    const stats = await ProfileSyncHistory.getSyncStatistics(days);
    res.json(
      stats || {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        cancelledSyncs: 0,
        totalProfilesUpdated: 0,
        averageDuration: 0,
        averageSuccessRate: 0,
      }
    );
  } catch (err) {
    serverError(res, err, "Error fetching sync stats");
  }
};

/**
 * GET /api/admin/sync-jobs/:id
 * One run in detail. A running run is answered from memory (always current);
 * a finished one from its saved record.
 */
const getSyncStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(res, id)) return;

    await syncJobs.reconcileStaleRuns();
    const doc = await ProfileSyncHistory.findById(id).populate("triggeredBy", "name email").lean();
    if (!doc) return res.status(404).json({ message: "Sync job not found" });

    const live = syncJobs.getLiveJob(id);
    if (live && live.inProgress) {
      return res.json({
        ...summarize({
          ...doc,
          status: "running",
          processedUsers: live.processedUsers,
          totalUsers: live.totalUsers,
          updatedProfiles: live.updatedProfiles,
          failedProfiles: live.failedProfiles,
          totalProfiles: live.totalProfiles,
        }),
        failedProfilesList: live.failedProfilesList || [],
        error: null,
        platformStats: [],
      });
    }

    res.json({
      ...summarize(doc),
      failedProfilesList: doc.failedProfileDetails || [],
      error: doc.status === "completed" ? null : lastError(doc),
      platformStats: doc.platformStats || [],
    });
  } catch (err) {
    serverError(res, err, "Error fetching sync status");
  }
};

/**
 * POST /api/admin/sync-jobs
 * Starts a run and returns its id right away. Only one run at a time.
 */
const startSync = async (req, res) => {
  try {
    const { started, syncId } = await syncJobs.startSyncJob({
      jobType: "manual",
      triggeredBy: req.user.id,
    });

    if (!started) {
      return res.status(409).json({
        success: false,
        message: "A profile sync is already running.",
        syncId,
      });
    }
    log.info(`profile sync ${syncId} started by admin ${req.user.id}`);
    res.status(202).json({ success: true, message: "Profile sync started", syncId });
  } catch (err) {
    serverError(res, err, "Error starting profile sync");
  }
};

/**
 * POST /api/admin/sync-jobs/:id/cancel
 */
const cancelSync = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(res, id)) return;

    const result = await syncJobs.cancelSyncJob(id, req.user.id);
    if (result === "not_running") {
      return res.status(409).json({ success: false, message: "That sync is not running." });
    }
    log.info(`profile sync ${id} cancelled by admin ${req.user.id}`);
    res.json({ success: true, message: "Profile sync cancelled" });
  } catch (err) {
    serverError(res, err, "Error cancelling sync job");
  }
};

module.exports = {
  listSyncs,
  getSyncStats,
  getSyncStatus,
  startSync,
  cancelSync,
};
