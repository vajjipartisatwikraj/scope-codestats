/**
 * Calendar day helpers. A "day key" is a "YYYY-MM-DD" string. Keys sort correctly as plain
 * strings, so they can be used directly in range queries.
 *
 * The day a moment belongs to depends on the timezone; the key itself has none, so all
 * arithmetic below works on the calendar date only (done in UTC to avoid DST surprises).
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The day key of a moment in a timezone (IANA name), e.g. "Asia/Kolkata" or "UTC". */
function dayKeyOf(when = new Date(), timeZone = "UTC") {
  // en-CA formats as YYYY-MM-DD.
  return new Date(when).toLocaleDateString("en-CA", { timeZone });
}

const toUtcMs = (key) => Date.parse(`${key}T00:00:00.000Z`);

/** The day key `count` days after `key` (negative counts go back). */
function addDays(key, count) {
  return new Date(toUtcMs(key) + count * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `fromKey` to `toKey` (negative when `toKey` is earlier). */
function daysBetween(fromKey, toKey) {
  return Math.round((toUtcMs(toKey) - toUtcMs(fromKey)) / DAY_MS);
}

/** Every day key from `startKey` to `endKey`, inclusive. Empty when start is after end. */
function listDayKeys(startKey, endKey) {
  const keys = [];
  for (let key = startKey; key <= endKey; key = addDays(key, 1)) keys.push(key);
  return keys;
}

/** 0 = Sunday ... 6 = Saturday */
const weekdayOf = (key) => new Date(toUtcMs(key)).getUTCDay();

/** The Monday of the week a day belongs to. */
function weekStartOf(key) {
  const sinceMonday = (weekdayOf(key) + 6) % 7;
  return addDays(key, -sinceMonday);
}

const monthStartOf = (key) => `${key.slice(0, 7)}-01`;

/** The last day of the month a day belongs to. */
function monthEndOf(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

module.exports = {
  KEY_PATTERN,
  dayKeyOf,
  addDays,
  daysBetween,
  listDayKeys,
  weekStartOf,
  monthStartOf,
  monthEndOf,
};
