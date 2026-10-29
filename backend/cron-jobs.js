/**
 * Scheduled jobs. This is the only place that schedules anything.
 *
 * Active job:
 *   - Profile sync, every day at 12:00 AM IST: refreshes every student's
 *     platform Profiles (LeetCode, Codeforces, CodeChef, HackerRank, GitHub,
 *     Scope-CodeStats). The job itself lives in scripts/updateUserProfiles.js and
 *     is run through services/syncJobService, which also records it in the
 *     sync history.
 *
 * Admins can also run it on demand from the admin dashboard
 * (POST /api/admin/sync-jobs, see controllers/dailyCronController.js).
 */
const cron = require("node-cron");
const { startSyncJob } = require("./services/syncJobService");
const logger = require("./utils/logger");

const PROFILE_SYNC_SCHEDULE = "0 0 * * *"; // 12:00 AM
const TIMEZONE = "Asia/Kolkata";

const profileSyncJob = cron.schedule(
  PROFILE_SYNC_SCHEDULE,
  async () => {
    try {
      // Goes through the job service so the run appears in the admin's list.
      // The job itself reports its progress and completion (scripts/updateUserProfiles.js).
      const { started, syncId } = await startSyncJob({ jobType: "scheduled" });
      if (started) {
        logger.info("CRON", "profile sync triggered (12:00 AM IST)", { sync: syncId });
      } else {
        logger.warn("CRON", "profile sync skipped, one is already running", { sync: syncId });
      }
    } catch (error) {
      logger.error("CRON", error, { note: "scheduled profile sync could not start" });
    }
  },
  { scheduled: false, timezone: TIMEZONE }
);

function initializeCronJobs() {
  profileSyncJob.start();
  logger.ready("CRON", "profile sync daily at 12:00 AM IST");
}

function stopCronJobs() {
  profileSyncJob.stop();
  logger.info("CRON", "stopped");
}

module.exports = { initializeCronJobs, stopCronJobs, profileSyncJob };
