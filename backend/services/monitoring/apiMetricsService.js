/**
 * Reads the API traffic that requestRecorder.js wrote, for the admin monitoring page.
 *
 * Every question is answered from the counters (ApiMetric) of the coarsest bucket that is still
 * fine enough for the range, so a year of traffic is a few thousand small documents, never the
 * individual requests:
 *
 *   1h -> minute buckets, 24h and 7d -> hour buckets, 30d and all time -> day buckets
 *
 * The newest minute is up to one flush interval behind, because requests are written in batches.
 */
const ApiMetric = require("../../models/ApiMetric");
const ApiRequestEvent = require("../../models/ApiRequestEvent");
const config = require("../../config/monitoring");
const { ServiceError } = require("../../utils/ServiceError");
const { LATENCY_BUCKETS, bucketStart, latencyLabel, statusClass } = require("./buckets");
const { addBuckets, emptyBuckets, percentile } = require("./latency");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MAX_POINTS = 240; // longer timelines are merged into wider steps
const MAX_EVENTS = 100;

const RANGES = {
  "1h": { bucket: "minute", windowMs: HOUR },
  "24h": { bucket: "hour", windowMs: DAY },
  "7d": { bucket: "hour", windowMs: 7 * DAY },
  "30d": { bucket: "day", windowMs: 30 * DAY },
  all: { bucket: "day", windowMs: null },
};

/** The range from a query string; anything else is a 400. */
function parseRange(value = "24h") {
  if (!Object.prototype.hasOwnProperty.call(RANGES, value)) {
    throw new ServiceError(400, `range must be one of ${Object.keys(RANGES).join(", ")}`);
  }
  return value;
}

// ---- Totals ----------------------------------------------------------------------------------

/** A running total of counters. */
const emptyTotals = () => ({
  count: 0,
  sumMs: 0,
  maxMs: 0,
  bytes: 0,
  c2: 0,
  c3: 0,
  c4: 0,
  c5: 0,
  lat: emptyBuckets(),
});

function addInto(total, row) {
  total.count += row.count || 0;
  total.sumMs += row.sumMs || 0;
  total.maxMs = Math.max(total.maxMs, row.maxMs || 0);
  total.bytes += row.bytes || 0;
  for (const cls of [2, 3, 4, 5]) total[`c${cls}`] += row[`c${cls}`] || 0;
  addBuckets(total.lat, row.lat);
  return total;
}

/** The figures a page shows for a total: shares, average and percentiles. */
function describe(total) {
  const { count } = total;
  return {
    count,
    success: count - total.c4 - total.c5, // 1xx, 2xx and 3xx
    clientErrors: total.c4,
    serverErrors: total.c5,
    avgMs: count ? Math.round(total.sumMs / count) : null,
    p50: percentile(total.lat, 0.5, total.maxMs),
    p95: percentile(total.lat, 0.95, total.maxMs),
    p99: percentile(total.lat, 0.99, total.maxMs),
    maxMs: total.maxMs,
    bytes: total.bytes,
  };
}

// ---- Queries -----------------------------------------------------------------------------------

const latSums = () =>
  Object.fromEntries(Array.from({ length: LATENCY_BUCKETS }, (_, i) => [`l${i}`, { $sum: `$lat.${i}` }]));

/** Rebuilds the list of bucket counts from the l0, l1, ... fields of a grouped row. */
const latOf = (row) => Array.from({ length: LATENCY_BUCKETS }, (_, i) => row[`l${i}`] || 0);

const classSum = (cls) => ({
  $sum: { $cond: [{ $eq: [{ $floor: { $divide: ["$status", 100] } }, cls] }, "$count", 0] },
});

function matchFor(bucket, from) {
  const match = { bucket };
  if (from) match.start = { $gte: new Date(from) };
  return match;
}

/** Counters grouped by route, method and status code. */
function byRouteAndStatus(match) {
  return ApiMetric.aggregate([
    { $match: match },
    {
      $group: {
        _id: { method: "$method", route: "$route", status: "$status" },
        count: { $sum: "$count" },
        sumMs: { $sum: "$sumMs" },
        maxMs: { $max: "$maxMs" },
        bytes: { $sum: "$bytes" },
        ...latSums(),
      },
    },
  ]);
}

/** Counters grouped by the start of their bucket. */
function byTime(match) {
  return ApiMetric.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$start",
        count: { $sum: "$count" },
        sumMs: { $sum: "$sumMs" },
        maxMs: { $max: "$maxMs" },
        bytes: { $sum: "$bytes" },
        c2: classSum(2),
        c3: classSum(3),
        c4: classSum(4),
        c5: classSum(5),
        ...latSums(),
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

function byKind(match) {
  return ApiMetric.aggregate([
    { $match: match },
    { $group: { _id: "$kind", count: { $sum: "$count" }, bytes: { $sum: "$bytes" } } },
    { $sort: { count: -1 } },
  ]);
}

// ---- Shaping ------------------------------------------------------------------------------------

function buildRoutes(rows) {
  const routes = new Map();
  for (const row of rows) {
    const { method, route, status } = row._id;
    const key = `${method} ${route}`;
    let entry = routes.get(key);
    if (!entry) {
      entry = { method, route, total: emptyTotals(), statuses: new Map() };
      routes.set(key, entry);
    }
    addInto(entry.total, { ...row, lat: latOf(row), [`c${statusClass(status)}`]: row.count });
    entry.statuses.set(status, (entry.statuses.get(status) || 0) + row.count);
  }

  return [...routes.values()]
    .map(({ method, route, total, statuses }) => ({
      method,
      route,
      ...describe(total),
      statuses: [...statuses.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}

function buildStatuses(rows, grandTotal) {
  const byStatus = new Map();
  for (const row of rows) byStatus.set(row._id.status, (byStatus.get(row._id.status) || 0) + row.count);
  return [...byStatus.entries()]
    .map(([status, count]) => ({ status, count, share: grandTotal ? count / grandTotal : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** One point of the timeline from a total. */
const pointOf = (t, total) => ({ t, ...describe(total), c2: total.c2, c3: total.c3 });

/**
 * A point for every bucket of the range, empty ones included, so a quiet hour is a visible gap
 * and not a line drawn across it. Long ranges are merged into wider steps (stepMs says how wide).
 */
function buildTimeline(rows, { bucket, from, to }) {
  const size = config.buckets[bucket].sizeMs;
  const byStart = new Map(rows.map((row) => [new Date(row._id).getTime(), row]));
  const first = from ?? (rows.length ? new Date(rows[0]._id).getTime() : null);
  if (first === null) return { points: [], stepMs: size };

  const starts = [];
  for (let t = first; t <= to; t += size) starts.push(t);
  const factor = Math.max(1, Math.ceil(starts.length / MAX_POINTS));

  const points = [];
  for (let i = 0; i < starts.length; i += factor) {
    const total = emptyTotals();
    for (const t of starts.slice(i, i + factor)) {
      const row = byStart.get(t);
      if (row) addInto(total, { ...row, lat: latOf(row) });
    }
    points.push(pointOf(starts[i], total));
  }
  return { points, stepMs: size * factor };
}

// ---- Public -------------------------------------------------------------------------------------

/**
 * Everything the API tab shows for a range.
 * @param {{range: string}} params
 */
async function getOverview({ range }) {
  const spec = RANGES[parseRange(range)];
  const now = Date.now();
  const from = spec.windowMs ? bucketStart(now - spec.windowMs, spec.bucket) : null;
  const match = matchFor(spec.bucket, from);

  const [routeRows, timeRows, kindRows, oldest] = await Promise.all([
    byRouteAndStatus(match),
    byTime(match),
    byKind(match),
    ApiMetric.findOne({ bucket: "day" }).sort({ start: 1 }).select("start").lean(),
  ]);

  const grand = emptyTotals();
  for (const row of timeRows) addInto(grand, { ...row, lat: latOf(row) });
  const totals = describe(grand);

  const timeline = buildTimeline(timeRows, { bucket: spec.bucket, from, to: now });

  return {
    range,
    bucket: spec.bucket,
    from: from ? new Date(from) : oldest?.start || null,
    to: new Date(now),
    generatedAt: new Date(now),
    dataSince: oldest?.start || null,
    flushSeconds: Math.round(config.flushIntervalMs / 1000),
    enabled: config.enabled,
    totals,
    timeline: timeline.points,
    stepMs: timeline.stepMs,
    statuses: buildStatuses(routeRows, totals.count),
    kinds: kindRows.map((row) => ({ kind: row._id, count: row.count, bytes: row.bytes })),
    routes: buildRoutes(routeRows),
    latencyBuckets: grand.lat.map((count, index) => ({ label: latencyLabel(index), count })),
  };
}

/**
 * The individual requests worth a look (errors and slow ones), newest first.
 * @param {{limit?: number, before?: string, minStatus?: number}} params
 */
async function listEvents({ limit = 25, before, minStatus } = {}) {
  const size = Math.min(Math.max(Number(limit) || 25, 1), MAX_EVENTS);
  const filter = {};
  if (before) {
    const date = new Date(before);
    if (Number.isNaN(date.getTime())) throw new ServiceError(400, "before must be a date");
    filter.at = { $lt: date };
  }
  const min = Number(minStatus);
  if (Number.isFinite(min) && min >= 100) filter.status = { $gte: min };

  const rows = await ApiRequestEvent.find(filter, null, { sort: { at: -1 }, limit: size + 1 }).lean();
  const events = rows.slice(0, size).map((row) => ({
    id: String(row._id),
    at: row.at,
    method: row.method,
    route: row.route,
    status: row.status,
    ms: row.ms,
    bytes: row.bytes,
    kind: row.kind,
    user: row.user,
    userType: row.userType,
    message: row.message,
    requestId: row.requestId,
  }));
  return { events, nextBefore: rows.length > size ? events[events.length - 1].at : null };
}

module.exports = { getOverview, listEvents, parseRange, RANGES };
