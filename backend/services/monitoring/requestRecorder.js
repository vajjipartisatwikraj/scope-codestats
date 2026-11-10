/**
 * Counts API requests in memory and writes them to MongoDB in batches.
 *
 * record(event) is called for every finished request (middleware/requestMetrics.js). It only adds
 * to a few counters in a Map, so a request pays microseconds and never waits for the database.
 * Every config.flushIntervalMs (60 s) flush() turns the counters into one bulk write:
 *
 *   - ApiMetric   one upsert for each distinct route + status + kind in each of the minute, hour
 *                 and day buckets ($inc), however many requests there were
 *   - ApiRequestEvent   the few individual requests worth a look (errors and slow ones)
 *
 * If the database cannot be reached the counters stay in memory and are retried at the next
 * flush; their number is capped, so memory cannot grow without limit. A normal restart flushes
 * first (stop()). A crash loses at most one interval.
 */
const mongoose = require("mongoose");
const ApiMetric = require("../../models/ApiMetric");
const ApiRequestEvent = require("../../models/ApiRequestEvent");
const config = require("../../config/monitoring");
const { BUCKETS, LATENCY_BUCKETS, OTHER_ROUTES, UNMATCHED, bucketStart, latencyIndex } = require("./buckets");
const log = require("../../utils/logger").scope("MONITORING");

let pending = new Map(); // counter key -> counter
let rawEvents = [];
let routesSeen = new Set();
let timer = null;
let flushing = null;

const keyOf = (bucket, start, e) => `${bucket}|${start}|${e.method}|${e.route}|${e.status}|${e.kind}`;

function newCounter(bucket, start, e) {
  return {
    bucket,
    start,
    method: e.method,
    route: e.route,
    status: e.status,
    kind: e.kind,
    count: 0,
    sumMs: 0,
    maxMs: 0,
    bytes: 0,
    lat: new Array(LATENCY_BUCKETS).fill(0),
  };
}

/** Add `from` to `into` (used to put a failed batch back). */
function mergeCounter(into, from) {
  into.count += from.count;
  into.sumMs += from.sumMs;
  into.maxMs = Math.max(into.maxMs, from.maxMs);
  into.bytes += from.bytes;
  for (let i = 0; i < LATENCY_BUCKETS; i += 1) into.lat[i] += from.lat[i];
}

/** A request that deserves its own record, not only a count. */
function worthKeeping(e) {
  if (e.status >= 500) return true;
  if (e.ms >= config.slowRequestMs) return true;
  // Client errors, but not expired sign-ins (401) and not scanners hitting routes that do not exist
  if (e.status >= 400) return e.status !== 401 && e.route !== UNMATCHED;
  return false;
}

/**
 * @param {{at: Date, method: string, route: string, status: number, ms: number, bytes: number,
 *   kind: string, user: string|null, userType: string|null, message: string, requestId: string}} event
 */
function record(event) {
  if (!config.enabled) return;

  // A route seen for the first time after the limit is counted under "(other)"
  const e = { ...event };
  if (!routesSeen.has(e.route)) {
    if (routesSeen.size >= config.maxRoutes) e.route = OTHER_ROUTES;
    else routesSeen.add(e.route);
  }

  const index = latencyIndex(e.ms);
  for (const bucket of BUCKETS) {
    const start = bucketStart(e.at, bucket);
    const key = keyOf(bucket, start, e);
    let counter = pending.get(key);
    if (!counter) {
      if (pending.size >= config.maxPendingKeys) continue;
      counter = newCounter(bucket, start, e);
      pending.set(key, counter);
    }
    counter.count += 1;
    counter.sumMs += e.ms;
    counter.maxMs = Math.max(counter.maxMs, e.ms);
    counter.bytes += e.bytes || 0;
    counter.lat[index] += 1;
  }

  if (worthKeeping(e) && rawEvents.length < config.maxRawPerFlush) {
    rawEvents.push({
      at: e.at,
      method: e.method,
      route: e.route,
      status: e.status,
      ms: Math.round(e.ms),
      bytes: e.bytes || 0,
      kind: e.kind,
      user: e.user || null,
      userType: e.userType || null,
      message: e.message || "",
      requestId: e.requestId || "",
    });
  }
}

/** The bulk operation that adds a counter to its document. */
function upsertOf(counter) {
  const increments = { count: counter.count, sumMs: Math.round(counter.sumMs), bytes: counter.bytes };
  counter.lat.forEach((value, i) => {
    if (value) increments[`lat.${i}`] = value;
  });

  const update = { $inc: increments, $max: { maxMs: Math.round(counter.maxMs) } };
  const keep = config.buckets[counter.bucket].keepMs;
  if (keep) update.$setOnInsert = { expiresAt: new Date(counter.start + keep) };

  return {
    updateOne: {
      filter: {
        bucket: counter.bucket,
        start: new Date(counter.start),
        method: counter.method,
        route: counter.route,
        status: counter.status,
        kind: counter.kind,
      },
      update,
      upsert: true,
    },
  };
}

/** Writes what has been counted. Safe to call at any time; one flush runs at once. */
function flush() {
  if (flushing) return flushing;
  if (pending.size === 0 && rawEvents.length === 0) return Promise.resolve();
  // Not connected: keep counting, write at the next flush
  if (mongoose.connection.readyState !== 1) return Promise.resolve();

  const counters = pending;
  const events = rawEvents;
  pending = new Map();
  rawEvents = [];
  routesSeen = new Set();

  flushing = (async () => {
    try {
      if (counters.size > 0) {
        await ApiMetric.collection.bulkWrite([...counters.values()].map(upsertOf), { ordered: false });
      }
      if (events.length > 0) await ApiRequestEvent.collection.insertMany(events, { ordered: false });
    } catch (err) {
      // Put the batch back so the next flush retries it (within the memory cap). If part of it was
      // already written, those counts are added twice: a rare, small error that monitoring accepts.
      for (const [key, counter] of counters) {
        const current = pending.get(key);
        if (current) mergeCounter(current, counter);
        else if (pending.size < config.maxPendingKeys) pending.set(key, counter);
      }
      rawEvents = events.concat(rawEvents).slice(0, config.maxRawPerFlush);
      log.warn(`could not write the API counters, will retry | ${err.message}`);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Starts the periodic flush. */
function start() {
  if (timer || !config.enabled) return;
  timer = setInterval(() => {
    flush();
  }, config.flushIntervalMs);
  timer.unref();
}

/** Stops the periodic flush and writes what is left (call before closing the database). */
async function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  await flush();
}

module.exports = { record, flush, start, stop, worthKeeping };
