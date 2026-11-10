/**
 * Database size for the admin monitoring page.
 *
 *   getLive()      every collection right now: records, data size, size on disk, indexes, plus the
 *                  whole database and the disk it lives on. Read from MongoDB's own statistics,
 *                  which are metadata (a few milliseconds each), not a scan of the data. Reused for
 *                  config.liveCacheMs so reloading the page does not ask again.
 *   takeSnapshot() keeps today's reading in DbSnapshot (the cron job runs it every hour, and the
 *                  last reading of a day stays). The history of every collection comes from there.
 *   getHistory()   the snapshots of a range, and an estimate of when the disk fills.
 *
 * Collections are listed from the database itself, not from the Mongoose models, so old or
 * unused collections show up too. A collection that no model owns is marked with an empty model.
 */
const mongoose = require("mongoose");
const DbSnapshot = require("../../models/DbSnapshot");
const config = require("../../config/monitoring");
const { ServiceError } = require("../../utils/ServiceError");
const { dayKeyOf, addDays } = require("../../utils/dayKeys");
const log = require("../../utils/logger").scope("MONITORING");

const { TOTAL_KEY } = DbSnapshot;
const READ_AT_ONCE = 8; // collections measured in parallel

const HISTORY_DAYS = { "30d": 30, "90d": 90, "1y": 365, all: null };

/** The history range from a query string; anything else is a 400. */
function parseHistoryRange(value = "90d") {
  if (!Object.prototype.hasOwnProperty.call(HISTORY_DAYS, value)) {
    throw new ServiceError(400, `range must be one of ${Object.keys(HISTORY_DAYS).join(", ")}`);
  }
  return value;
}

let cache = null; // { at, value }

/** Runs `work` over `items`, at most `limit` at a time, keeping the order of the results. */
async function mapLimit(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

/** The Mongoose model that owns each collection name. */
function modelNames() {
  return new Map(Object.values(mongoose.models).map((model) => [model.collection.name, model.modelName]));
}

/** Sizes of one collection, or null when MongoDB cannot report them (a view, a permission). */
async function measureCollection(db, name, owners) {
  try {
    const [row] = await db.collection(name).aggregate([{ $collStats: { storageStats: {} } }]).toArray();
    const stats = row?.storageStats;
    if (!stats) return null;
    return {
      name,
      model: owners.get(name) || "",
      count: stats.count || 0,
      dataSize: stats.size || 0,
      storageSize: stats.storageSize || 0,
      indexSize: stats.totalIndexSize || 0,
      freeSize: stats.freeStorageSize || 0,
      avgObjSize: stats.avgObjSize || 0,
      indexes: stats.nindexes || 0,
    };
  } catch (err) {
    log.warn(`could not measure collection ${name} | ${err.message}`);
    return null;
  }
}

async function readLive() {
  const db = mongoose.connection.db;
  if (!db || mongoose.connection.readyState !== 1) {
    throw new ServiceError(503, "The database is not connected");
  }

  const [stats, listed] = await Promise.all([db.command({ dbStats: 1, scale: 1 }), db.listCollections({}).toArray()]);
  const owners = modelNames();
  const names = listed
    .filter((entry) => entry.type !== "view" && !entry.name.startsWith("system."))
    .map((entry) => entry.name);

  const measured = (await mapLimit(names, READ_AT_ONCE, (name) => measureCollection(db, name, owners))).filter(Boolean);
  const collections = measured.sort((a, b) => b.storageSize + b.indexSize - (a.storageSize + a.indexSize));

  return {
    takenAt: new Date(),
    database: {
      name: db.databaseName,
      collections: collections.length,
      records: stats.objects || 0,
      dataSize: stats.dataSize || 0,
      storageSize: stats.storageSize || 0,
      indexSize: stats.indexSize || 0,
      freeSize: collections.reduce((sum, c) => sum + c.freeSize, 0),
      fsUsedSize: stats.fsUsedSize ?? null,
      fsTotalSize: stats.fsTotalSize ?? null,
    },
    collections,
  };
}

/**
 * The database right now.
 * @param {{force?: boolean}} options `force` skips the short cache
 */
async function getLive({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < config.liveCacheMs) return cache.value;
  const value = await readLive();
  cache = { at: Date.now(), value };
  return value;
}

// ---- Snapshots ----------------------------------------------------------------------------------

/** Writes today's reading of every collection and of the whole database. */
async function takeSnapshot() {
  const live = await getLive({ force: true });
  const day = dayKeyOf(live.takenAt, config.timeZone);
  const takenAt = live.takenAt;

  const rows = live.collections.map((c) => ({
    collectionName: c.name,
    model: c.model,
    count: c.count,
    dataSize: c.dataSize,
    storageSize: c.storageSize,
    indexSize: c.indexSize,
    freeSize: c.freeSize,
    fsUsedSize: null,
    fsTotalSize: null,
  }));
  const { database } = live;
  rows.push({
    collectionName: TOTAL_KEY,
    model: "",
    count: database.records,
    dataSize: database.dataSize,
    storageSize: database.storageSize,
    indexSize: database.indexSize,
    freeSize: database.freeSize,
    fsUsedSize: database.fsUsedSize,
    fsTotalSize: database.fsTotalSize,
  });

  await DbSnapshot.collection.bulkWrite(
    rows.map((row) => ({
      updateOne: { filter: { day, collectionName: row.collectionName }, update: { $set: { ...row, takenAt } }, upsert: true },
    })),
    { ordered: false }
  );
  return { day, collections: live.collections.length };
}

/** Takes the first snapshot of a day if no cron run has yet (used right after the server starts). */
async function takeSnapshotIfMissing() {
  const day = dayKeyOf(new Date(), config.timeZone);
  if (await DbSnapshot.exists({ day, collectionName: TOTAL_KEY })) return null;
  return takeSnapshot();
}

// ---- History ------------------------------------------------------------------------------------

/** Bytes the database grows by each day, from the first and last point of the recent readings. */
function growthPerDay(points) {
  const recent = points.slice(-30);
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const days = Math.max(1, Math.round((Date.parse(last.day) - Date.parse(first.day)) / 86400000));
  return (last.storageSize + last.indexSize - (first.storageSize + first.indexSize)) / days;
}

/**
 * Days until the disk is full at the recent growth, or null when it cannot be told (the disk is
 * unknown, the database is not growing, or there are fewer than a week of readings).
 */
function daysUntilFull(points, live) {
  const { fsUsedSize, fsTotalSize } = live.database;
  if (fsUsedSize == null || fsTotalSize == null || points.length < 7) return null;
  const growth = growthPerDay(points);
  if (!growth || growth <= 0) return null;
  return Math.max(0, Math.floor((fsTotalSize - fsUsedSize) / growth));
}

const pointOf = (row) => ({
  day: row.day,
  records: row.count,
  dataSize: row.dataSize,
  storageSize: row.storageSize,
  indexSize: row.indexSize,
  freeSize: row.freeSize,
  fsUsedSize: row.fsUsedSize,
  fsTotalSize: row.fsTotalSize,
});

/**
 * The size of the database over time, and of its biggest collections.
 * @param {{range: string, top?: number}} params
 */
async function getHistory({ range, top = 5 }) {
  const days = HISTORY_DAYS[parseHistoryRange(range)];
  const today = dayKeyOf(new Date(), config.timeZone);
  const from = days ? addDays(today, -(days - 1)) : null;
  const dayFilter = from ? { day: { $gte: from } } : {};

  const live = await getLive();
  const biggest = live.collections.slice(0, top).map((c) => c.name);

  const [totalRows, collectionRows] = await Promise.all([
    DbSnapshot.find({ ...dayFilter, collectionName: TOTAL_KEY }).sort({ day: 1 }).lean(),
    DbSnapshot.find({ ...dayFilter, collectionName: { $in: biggest } })
      .sort({ day: 1 })
      .select("day collectionName storageSize indexSize count")
      .lean(),
  ]);

  const total = totalRows.map(pointOf);
  const collections = Object.fromEntries(biggest.map((name) => [name, []]));
  for (const row of collectionRows) {
    collections[row.collectionName].push({
      day: row.day,
      records: row.count,
      size: row.storageSize + row.indexSize,
    });
  }

  return {
    range,
    from,
    total,
    collections,
    growthPerDay: growthPerDay(total),
    daysUntilFull: daysUntilFull(total, live),
  };
}

module.exports = { getLive, takeSnapshot, takeSnapshotIfMissing, getHistory, parseHistoryRange };
