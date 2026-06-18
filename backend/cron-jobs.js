const cron = require("node-cron");

// Import the daily maintenance cron job
const {
  startDailyMaintenanceCron,
  stopDailyMaintenanceCron,
} = require("./scripts/daily-maintenance-cron");

/**
 * ✅ CRON JOBS ENABLED ✅
 *
 * Initialize all cron jobs for the application
 *
 * ACTIVE CRON JOBS:
 * - Midnight Cron (12:00 AM IST): Daily statistics snapshot & ranking
 *   - Snapshots current User data into DailyStats documents
 *   - Calculates and updates user rankings (overall + department)
 *   - Calculates consistency index (based on score growth)
 *   - Calculates seven-day score for progress tracking
 *   - Regenerates analytics documents (PerformanceOverview, Heatmap, etc.)
 *
 * - Morning Cron (5:00 AM IST): Second daily statistics run
 *   - Same as midnight job - ensures data is captured after any overnight changes
 *   - Acts as a safety net if the midnight job failed or had partial results
 *
 * NOTE: Profile synchronization (fetching from external APIs like LeetCode,
 * Codeforces, etc.) is NOT automated. It must be triggered manually by an
 * admin via: POST /api/admin/sync-profiles from the Admin Dashboard.
 *
 * MANUAL EXECUTION:
 * - Daily maintenance: POST /api/admin/trigger-cron (requires admin auth)
 * - Profile sync: POST /api/admin/sync-profiles (requires admin auth)
 * - Script: node backend/scripts/daily-maintenance-cron.js
 */
function initializeCronJobs() {
  console.log("🕐 Initializing cron jobs...");

  // ✅ ENABLED: Daily maintenance cron jobs (midnight + morning)
  const started = startDailyMaintenanceCron();

  if (started) {
    console.log("✅ Daily maintenance cron jobs started successfully");
    console.log("⏰ Midnight job: Runs daily at 12:00 AM IST (Stats & Rankings)");
    console.log("⏰ Morning job: Runs daily at 5:00 AM IST (Stats & Rankings backup)");
  } else {
    console.log(
      "⚠️  Daily maintenance cron jobs failed to start or were already running"
    );
  }

  console.log("✅ ALL CRON JOBS ARE ENABLED");
  console.log(
    "💡 Profile sync must be triggered manually from the admin dashboard"
  );
  console.log("📋 Cron schedules:");
  console.log("   - 12:00 AM IST: Daily stats snapshot & ranking calculation");
  console.log("   - 5:00 AM IST: Daily stats snapshot & ranking (backup run)");

  // You can add more cron jobs here in the future
  // Example:
  // cron.schedule('0 0 * * 0', () => {
  //   console.log('Weekly maintenance job running...');
  // });
}

/**
 * Gracefully stop all cron jobs
 */
function stopCronJobs() {
  console.log("🛑 Stopping all cron jobs...");
  stopDailyMaintenanceCron();
  console.log("✅ All cron jobs stopped");
}

module.exports = {
  initializeCronJobs,
  stopCronJobs,
};

