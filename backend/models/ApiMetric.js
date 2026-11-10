const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * API traffic counters. One document is the number of requests for one route, method, status code
 * and response kind inside one time bucket:
 *
 *   bucket "minute" | "hour" | "day"   the size of the time bucket
 *   start                              where the bucket begins (a day starts at 00:00 IST)
 *   method, route, status, kind        what was counted. `route` is the route pattern
 *                                      ("/api/users/:id"), never the real URL
 *
 * Every request is added to its minute, its hour and its day, so charts of any length read the
 * coarsest bucket that is fine enough. Minute and hour documents delete themselves
 * (`expiresAt`); day documents are kept forever.
 *
 *   count    requests
 *   sumMs    their total time (average = sumMs / count)
 *   maxMs    the slowest
 *   bytes    bytes sent to clients
 *   lat      requests per latency bucket, { "0": n, "1": n, ... } (config/monitoring.js latencyBoundsMs).
 *            Percentiles are worked out from these, because percentiles cannot be averaged.
 *
 * The documents are written in batches with bulk upserts (services/monitoring/requestRecorder.js),
 * not through Mongoose, so there is no per-save overhead.
 */
const apiMetricSchema = new Schema(
  {
    bucket: { type: String, enum: ["minute", "hour", "day"], required: true },
    start: { type: Date, required: true },
    method: { type: String, required: true },
    route: { type: String, required: true },
    status: { type: Number, required: true },
    kind: { type: String, required: true },

    count: { type: Number, default: 0 },
    sumMs: { type: Number, default: 0 },
    maxMs: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    lat: { type: Schema.Types.Mixed, default: undefined },

    expiresAt: { type: Date },
  },
  { versionKey: false, minimize: false }
);

// One counter per bucket and what was counted; this is also the upsert key.
apiMetricSchema.index({ bucket: 1, start: 1, method: 1, route: 1, status: 1, kind: 1 }, { unique: true });
// Delete expired minute and hour buckets.
apiMetricSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ApiMetric", apiMetricSchema);
