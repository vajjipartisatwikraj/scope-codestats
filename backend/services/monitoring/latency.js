/**
 * Latency figures from counted buckets.
 *
 * The database keeps, for every counter, how many requests fell in each latency bucket
 * (config/monitoring.js latencyBoundsMs). Buckets of different counters can be added together, and
 * a percentile is then worked out from the sum. An average of percentiles would be wrong.
 */
const config = require("../../config/monitoring");
const { LATENCY_BUCKETS } = require("./buckets");

/** An all-zero list of bucket counts. */
const emptyBuckets = () => new Array(LATENCY_BUCKETS).fill(0);

/** Adds `from` (a list, or the { "0": n } object stored in the database) into `into`. */
function addBuckets(into, from) {
  if (!from) return into;
  for (let i = 0; i < LATENCY_BUCKETS; i += 1) {
    const value = Array.isArray(from) ? from[i] : from[i] ?? from[String(i)];
    if (value) into[i] += value;
  }
  return into;
}

/**
 * The time (ms) under which `quantile` (0 to 1) of the requests finished. The answer is placed
 * inside its bucket in proportion to how far the rank reaches into it. The open-ended last bucket
 * ends at `maxMs`, the slowest request seen. No percentile is ever above `maxMs`: with a handful of
 * requests the bucket alone would otherwise give a figure higher than any real request.
 */
function percentile(buckets, quantile, maxMs = 0) {
  const total = buckets.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;

  const bounds = config.latencyBoundsMs;
  const rank = quantile * total;
  let seen = 0;
  for (let i = 0; i < buckets.length; i += 1) {
    const inBucket = buckets[i];
    if (inBucket === 0) continue;
    if (seen + inBucket >= rank) {
      const low = i === 0 ? 0 : bounds[i - 1];
      const high = i < bounds.length ? bounds[i] : Math.max(maxMs, low);
      const share = (rank - seen) / inBucket;
      const value = Math.round(low + (high - low) * share);
      return maxMs > 0 ? Math.min(value, Math.round(maxMs)) : value;
    }
    seen += inBucket;
  }
  return Math.round(maxMs);
}

module.exports = { emptyBuckets, addBuckets, percentile };
