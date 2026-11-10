/**
 * Monitoring (admin panel): API traffic and database size.
 *
 *   requestRecorder         counts finished requests in memory, writes them every minute
 *   apiMetricsService       reads the counters for the API tab
 *   vocalqMetricsService    reads SpeechJudge's own usage reports for the VocalQ API tab
 *   judge0MetricsService    reads Judge0's own statistics, workers and limits for the Judge0 API tab
 *   databaseStatsService    collection sizes, hourly snapshots and their history
 *
 * Wiring: server.js adds middleware/requestMetrics.js, calls start() once the database is open and
 * stop() before closing it; cron-jobs.js runs takeSnapshot() every hour; routes/monitoring.js and
 * controllers/monitoringController.js serve the page.
 */
const requestRecorder = require("./requestRecorder");
const apiMetricsService = require("./apiMetricsService");
const vocalqMetricsService = require("./vocalqMetricsService");
const judge0MetricsService = require("./judge0MetricsService");
const databaseStatsService = require("./databaseStatsService");
const log = require("../../utils/logger").scope("MONITORING");
const logger = require("../../utils/logger");
const config = require("../../config/monitoring");

/** Starts the periodic write of the API counters and takes today's first database snapshot. */
async function start() {
  requestRecorder.start();
  logger.ready(
    "MONITORING",
    config.enabled
      ? `api counters every ${Math.round(config.flushIntervalMs / 1000)} s | database snapshots hourly`
      : "recording off (MONITORING_ENABLED=false)"
  );
  try {
    await databaseStatsService.takeSnapshotIfMissing();
  } catch (err) {
    log.warn(`first database snapshot failed | ${err.message}`);
  }
}

/** Writes the counters that are still in memory. Call before the database connection closes. */
const stop = () => requestRecorder.stop();

module.exports = {
  start,
  stop,
  record: requestRecorder.record,
  api: apiMetricsService,
  vocalq: vocalqMetricsService,
  judge0: judge0MetricsService,
  database: databaseStatsService,
};
