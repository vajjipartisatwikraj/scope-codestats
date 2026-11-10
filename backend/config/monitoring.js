/**
 * Settings of the admin monitoring panel (API traffic and database size).
 *
 * Requests are counted in memory and written to MongoDB in one batch every
 * MONITORING_FLUSH_SECONDS (default 60), so monitoring costs a few dozen small writes a minute and
 * never a write per request. See services/monitoring/ for how the numbers are kept.
 */
const positive = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

module.exports = {
  /** MONITORING_ENABLED=false switches the recording off (the panel then shows what was kept). */
  enabled: process.env.MONITORING_ENABLED !== "false",

  /** How often the in-memory counters are written to the database. */
  flushIntervalMs: positive(process.env.MONITORING_FLUSH_SECONDS, 60) * 1000,

  /**
   * Requests are kept as counters in three resolutions at once. A finer one expires, so the
   * database holds a few days of per-minute data, over a year of hourly data and daily data forever.
   * `keepMs: null` means never delete.
   */
  buckets: {
    minute: { sizeMs: MINUTE_MS, keepMs: 7 * DAY_MS },
    hour: { sizeMs: HOUR_MS, keepMs: 400 * DAY_MS },
    day: { sizeMs: DAY_MS, keepMs: null },
  },

  /** Upper edges (ms) of the latency buckets. A last, open-ended bucket holds anything slower. */
  latencyBoundsMs: [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],

  /**
   * Individual requests are kept only when they are worth a look: a server error, a slow request or
   * a client error that is not an expired sign-in. Everything else lives in the counters only.
   * They carry the user id, and are deleted after rawKeepDays.
   */
  slowRequestMs: 1000, // the same limit that marks a request (SLOW) in the server log
  rawKeepDays: 30,
  maxRawPerFlush: 300, // a burst of errors cannot flood the database

  /** Limits that protect memory: one route or one bad scanner cannot grow the counters without end. */
  maxRoutes: 400, // distinct routes counted per flush; the rest are counted under "(other)"
  maxPendingKeys: 6000, // counters held in memory before the next flush

  /** The calendar day of the daily database snapshot (IST, like the rest of the platform). */
  utcOffsetMinutes: 330,
  timeZone: "Asia/Kolkata",

  /** Hourly, at minute 5 (IST). The snapshot of a day is rewritten until the day ends. */
  snapshotSchedule: "5 * * * *",
  /** How long the live database numbers are reused, so reloading the page does not scan again. */
  liveCacheMs: 60 * 1000,
};
