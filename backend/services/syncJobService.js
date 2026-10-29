/**
 * Profile sync jobs.
 *
 * Owns the life of one sync run, whoever starts it (an admin or the nightly
 * schedule), so every run shows up in the admin's job list:
 *
 *   1. a ProfileSyncHistory document is created with status "running"
 *   2. the job (scripts/updateUserProfiles.js) runs in the background
 *   3. while it runs, its counters are saved to that document every few
 *      seconds (a heartbeat), so the list shows live progress
 *   4. when it ends, the document gets its final status
 *
 * A run that dies without finishing (server restart, crash) would stay
 * "running" forever, so `reconcileStaleRuns` closes any "running" document that
 * has no live job and has stopped sending heartbeats.
 */
const ProfileSyncHistory = require("../models/ProfileSyncHistory");
const updateAllUserProfiles = require("../scripts/updateUserProfiles");
const log = require("../utils/logger").scope("SYNC-JOB");

const HEARTBEAT_MS = 3000;
// A live job saves every HEARTBEAT_MS; a "running" document that has been
// silent this long, with no job in memory, belongs to a run that died.
const STALE_AFTER_MS = 60 * 1000;
const KEEP_LAST_RUNS = 50;

// Jobs running in this process, by history id.
const activeJobs = new Map();

// ─── Progress ───────────────────────────────────────────────────────────────

const percent = (processed, total) =>
  total > 0 ? Math.min(100, Math.floor((processed / total) * 100)) : 0;

/** Failed profiles in the shape stored on the history document. */
const toFailedProfileDetails = (list = []) =>
  list.map((fp) => ({
    userId: fp.userId,
    userName: fp.userName,
    userEmail: fp.userEmail,
    userDepartment: fp.userDepartment || "N/A",
    userSection: fp.userSection || "N/A",
    userYear: Number(fp.userYear) || undefined,
    platform: fp.platform,
    platformUsername: fp.platformUsername,
    error: fp.error,
    errorCode: fp.errorCode,
    timestamp: fp.timestamp ? new Date(fp.timestamp) : new Date(),
  }));

/** Counters of a live job, in the fields of the history document. */
const countersOf = (state) => ({
  totalUsers: state.totalUsers || 0,
  processedUsers: state.processedUsers || 0,
  updatedProfiles: state.updatedProfiles || 0,
  failedProfiles: state.failedProfiles || 0,
  totalProfiles: state.totalProfiles || 0,
  failedUsers: state.failedUsers || 0,
  progress: percent(state.processedUsers, state.totalUsers),
});

// ─── History document ───────────────────────────────────────────────────────

/** Saves the live counters. Never throws: a missed heartbeat is harmless. */
async function saveHeartbeat(id, state) {
  try {
    await ProfileSyncHistory.updateOne(
      { _id: id, status: "running" },
      { $set: { ...countersOf(state), currentPhase: "syncing_profiles" } }
    );
  } catch (err) {
    log.error(`[SyncJob] heartbeat failed for ${id}:`, err.message);
  }
}

/** Writes the final state of a run. Never throws. */
async function saveOutcome(id, state, { status, error, cancelledBy } = {}) {
  try {
    const doc = await ProfileSyncHistory.findById(id);
    if (!doc) return;

    Object.assign(doc, countersOf(state));
    if (Array.isArray(state.failedProfilesList)) {
      doc.failedProfileDetails = toFailedProfileDetails(state.failedProfilesList);
    }
    doc.status = status;
    doc.endTime = new Date();
    doc.calculateDuration();
    doc.successfulUsers = Math.max(0, doc.totalUsers - doc.failedUsers);
    doc.currentPhase = status === "cancelled" ? "cancelled" : "completed";
    doc.cancelled = status === "cancelled";
    if (status === "completed") doc.progress = 100;
    if (status === "cancelled") {
      doc.cancelledAt = new Date();
      doc.cancellationReason = "Cancelled by admin";
      if (cancelledBy) doc.cancelledBy = cancelledBy;
    }
    if (error) {
      doc.errorLog.push({ phase: "sync", message: error, timestamp: new Date() });
    }
    doc.summary = `Processed ${doc.processedUsers}/${doc.totalUsers} users. Updated ${doc.updatedProfiles} profiles, ${doc.failedProfiles} failed.`;
    await doc.save();
    await ProfileSyncHistory.cleanupOldRecords(KEEP_LAST_RUNS);
  } catch (err) {
    log.error(`[SyncJob] could not save outcome of ${id}:`, err.message);
  }
}

/**
 * Closes "running" documents that no live job owns and that stopped sending
 * heartbeats (staleMs = 0 closes all of them, used at server start).
 * @returns {Promise<number>} how many were closed
 */
async function reconcileStaleRuns(staleMs = STALE_AFTER_MS) {
  const liveIds = [...activeJobs.keys()];
  const cutoff = new Date(Date.now() - staleMs);
  const stale = await ProfileSyncHistory.find({
    status: "running",
    _id: { $nin: liveIds },
    updatedAt: { $lt: cutoff },
  });

  for (const doc of stale) {
    doc.status = "failed";
    doc.endTime = new Date();
    doc.calculateDuration();
    doc.currentPhase = "completed";
    doc.errorLog.push({
      phase: "interrupted",
      message: "The sync stopped before it finished (server restarted or the job stopped responding).",
      timestamp: new Date(),
    });
    doc.summary = `Interrupted after ${doc.processedUsers}/${doc.totalUsers} users.`;
    await doc.save();
  }
  if (stale.length > 0) log.warn(`closed ${stale.length} interrupted sync run(s)`);
  return stale.length;
}

// ─── Jobs ───────────────────────────────────────────────────────────────────

/** The job running right now in this process, if any. */
const getRunningJob = () => [...activeJobs.values()].find((job) => job.inProgress) || null;

/**
 * Starts a sync in the background. Only one runs at a time.
 * @param {{jobType?: "manual"|"scheduled", triggeredBy?: string}} options
 * @returns {Promise<{started: boolean, syncId: string}>} `started` is false
 *   when a sync is already running (then `syncId` is that run's id)
 */
async function startSyncJob({ jobType = "manual", triggeredBy = null } = {}) {
  const running = getRunningJob();
  if (running) return { started: false, syncId: running.id };

  const doc = await new ProfileSyncHistory({
    status: "running",
    jobType,
    startTime: new Date(),
    currentPhase: "initializing",
    triggeredBy: triggeredBy || undefined,
  }).save();
  const id = doc._id.toString();

  const abortController = new AbortController();
  const state = {
    id,
    totalUsers: 0,
    processedUsers: 0,
    updatedProfiles: 0,
    failedProfiles: 0,
    totalProfiles: 0,
    failedUsers: 0,
    failedProfilesList: [],
    inProgress: true,
    cancelled: false,
    error: null,
    startTime: Date.now(),
    lastUpdated: Date.now(),
    completedTime: null,
    abortController,
  };
  activeJobs.set(id, state);

  const heartbeat = setInterval(() => saveHeartbeat(id, state), HEARTBEAT_MS);

  updateAllUserProfiles(state, abortController.signal)
    .then(async () => {
      state.inProgress = false;
      state.completedTime = Date.now();
      await saveOutcome(id, state, { status: state.cancelled ? "cancelled" : "completed" });
    })
    .catch(async (err) => {
      state.inProgress = false;
      state.error = err.message || "Unknown error";
      state.completedTime = Date.now();
      // The profile-sync job already printed its FAILED line; this keeps the run id.
      log.debug(`${id} failed:`, err.message);
      await saveOutcome(id, state, { status: "failed", error: state.error });
    })
    .finally(() => {
      clearInterval(heartbeat);
      delete state.abortController;
      // Finished jobs are answered from the database from now on.
      activeJobs.delete(id);
    });

  return { started: true, syncId: id };
}

/**
 * Cancels the live job `id`.
 * @returns {Promise<"cancelled"|"not_running">}
 */
async function cancelSyncJob(id, adminId) {
  const state = activeJobs.get(id);
  if (!state || !state.inProgress) return "not_running";

  // Flag it before aborting so the job sees it first.
  state.inProgress = false;
  state.cancelled = true;
  state.completedTime = Date.now();
  state.error = "Cancelled by admin";
  try {
    state.abortController?.abort();
  } catch (err) {
    log.error(`[SyncJob] abort failed for ${id}:`, err.message);
  }
  await saveOutcome(id, state, { status: "cancelled", cancelledBy: adminId });
  return "cancelled";
}

/** The live state of a job, or null when it is not running in this process. */
const getLiveJob = (id) => activeJobs.get(id) || null;

module.exports = {
  startSyncJob,
  cancelSyncJob,
  getRunningJob,
  getLiveJob,
  reconcileStaleRuns,
  percent,
};
