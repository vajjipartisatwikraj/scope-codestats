/**
 * Turning sparse stored snapshots into the series the dashboard charts need.
 *
 * Pure functions, no database access (services/platformProgress/progressService.js loads
 * the documents and calls these).
 *
 * Why this is needed: snapshots exist only on days when something changed, and hold running
 * totals. To chart a range, every day of the range needs a value, so each day takes the
 * latest snapshot on or before it ("carry forward"). Days before the first snapshot have no
 * data (null), never zero. The day's gain is the difference from the day before, which for
 * the first day of the range is the snapshot carried in from before the range.
 */
const { BUCKET_THRESHOLDS } = require("../../config/platformProgress");
const {
  addDays,
  listDayKeys,
  weekStartOf,
  monthStartOf,
  monthEndOf,
} = require("../../utils/dayKeys");

const round2 = (value) => Math.round(value * 100) / 100;

/** The values of one stored snapshot, under the names used in the API. */
function valuesOf(snapshot) {
  return {
    problemsSolved: snapshot.problemsSolved || 0,
    easy: snapshot.easyProblemsSolved || 0,
    medium: snapshot.mediumProblemsSolved || 0,
    hard: snapshot.hardProblemsSolved || 0,
    // 0 means unrated: charts must not show it as a rating of zero
    rating: snapshot.rating > 0 ? snapshot.rating : null,
    contests: snapshot.contestsParticipated || 0,
  };
}

/**
 * One point per day from startKey to endKey.
 *
 * @param {object} args
 * @param {Array} args.records snapshots inside the range, oldest first
 * @param {object|null} args.carryIn the latest snapshot before the range, if any
 * @param {string} args.startKey
 * @param {string} args.endKey
 * @returns {Array<object>} points:
 *   { date, hasData, observed, problemsSolved, easy, medium, hard, rating, contests,
 *     problemsGain, contestsGain, ratingChange, baseline }
 *   `observed`: a snapshot was stored on this day. `baseline`: the first reading ever, so
 *   its gains are 0 (the whole total is not "progress made that day").
 */
function buildDailySeries({ records, carryIn, startKey, endKey }) {
  const points = [];
  let cursor = 0;
  let current = carryIn || null;
  let previous = carryIn ? valuesOf(carryIn) : null;

  for (const date of listDayKeys(startKey, endKey)) {
    let observed = false;
    while (cursor < records.length && records[cursor].dateKey <= date) {
      if (records[cursor].dateKey === date) observed = true;
      current = records[cursor];
      cursor += 1;
    }

    const values = current ? valuesOf(current) : null;
    const point = {
      date,
      hasData: Boolean(values),
      observed,
      problemsSolved: values ? values.problemsSolved : null,
      easy: values ? values.easy : null,
      medium: values ? values.medium : null,
      hard: values ? values.hard : null,
      rating: values ? values.rating : null,
      contests: values ? values.contests : null,
      problemsGain: 0,
      contestsGain: 0,
      ratingChange: null,
      baseline: false,
    };

    if (values && previous) {
      point.problemsGain = Math.max(0, values.problemsSolved - previous.problemsSolved);
      point.contestsGain = Math.max(0, values.contests - previous.contests);
      // The first rating is not a "change"; only compare two real ratings.
      if (values.rating !== null && previous.rating !== null) {
        point.ratingChange = round2(values.rating - previous.rating);
      }
    } else if (values) {
      point.baseline = true;
    }

    if (values) previous = values;
    points.push(point);
  }

  return points;
}

/**
 * Headline numbers for a range.
 * @param {Array} points from buildDailySeries
 * @param {object|null} carryIn the snapshot carried into the range
 * @returns {object|null} null when the range has no data at all
 */
function summarize(points, carryIn) {
  const withData = points.filter((point) => point.hasData);
  if (withData.length === 0) return null;

  const latest = withData[withData.length - 1];
  const rated = withData.filter((point) => point.rating !== null);
  const ratingStart = carryIn && carryIn.rating > 0 ? carryIn.rating : rated[0]?.rating ?? null;
  const ratingNow = rated.length > 0 ? rated[rated.length - 1].rating : null;

  const problemsGained = points.reduce((sum, point) => sum + point.problemsGain, 0);
  const contestsGained = points.reduce((sum, point) => sum + point.contestsGain, 0);

  let bestDay = null;
  for (const point of points) {
    if (point.problemsGain > 0 && (!bestDay || point.problemsGain > bestDay.count)) {
      bestDay = { date: point.date, count: point.problemsGain };
    }
  }

  const ratings = rated.map((point) => point.rating);

  return {
    problemsSolved: latest.problemsSolved,
    contests: latest.contests,
    rating: ratingNow,
    problemsGained,
    contestsGained,
    ratingChange:
      ratingStart !== null && ratingNow !== null ? round2(ratingNow - ratingStart) : null,
    peakRating: ratings.length > 0 ? Math.max(...ratings) : null,
    lowestRating: ratings.length > 0 ? Math.min(...ratings) : null,
    activeDays: points.filter((point) => point.problemsGain > 0).length,
    bestDay,
    averagePerDay: round2(problemsGained / points.length),
  };
}

/** How a range of `days` days is grouped in bar charts. */
function granularityFor(days) {
  if (days <= BUCKET_THRESHOLDS.dayMaxDays) return "day";
  if (days <= BUCKET_THRESHOLDS.weekMaxDays) return "week";
  return "month";
}

function bucketBounds(date, granularity) {
  if (granularity === "week") {
    const start = weekStartOf(date);
    return { start, end: addDays(start, 6) };
  }
  if (granularity === "month") return { start: monthStartOf(date), end: monthEndOf(date) };
  return { start: date, end: date };
}

/**
 * Groups daily points into day / week (Monday start) / month buckets.
 *
 * @param {Array} points one per day, oldest first, each with a `date`
 * @param {number} days length of the range
 * @param {{sum: Object<string,string>, last: Object<string,string>}} fields
 *   `sum`: output name -> point field, added up over the bucket (null values are skipped;
 *   the result is null if every value was null).
 *   `last`: output name -> point field, the latest non-null value in the bucket.
 * @returns {{granularity: string, items: Array<object>}}
 *   Each item: { start, end, partial, ...fields }. `start`/`end` are clipped to the range;
 *   `partial` is true for a first or last bucket that the range cuts short.
 */
function bucketize(points, days, { sum = {}, last = {} } = {}) {
  const granularity = granularityFor(days);
  const rangeStart = points[0]?.date;
  const rangeEnd = points[points.length - 1]?.date;
  const items = [];
  let open = null;

  for (const point of points) {
    const bounds = bucketBounds(point.date, granularity);
    if (!open || open.fullStart !== bounds.start) {
      open = {
        fullStart: bounds.start,
        start: bounds.start < rangeStart ? rangeStart : bounds.start,
        end: bounds.end > rangeEnd ? rangeEnd : bounds.end,
        partial: bounds.start < rangeStart || bounds.end > rangeEnd,
      };
      for (const name of Object.keys(sum)) open[name] = null;
      for (const name of Object.keys(last)) open[name] = null;
      items.push(open);
    }
    for (const [name, field] of Object.entries(sum)) {
      const value = point[field];
      if (value !== null && value !== undefined) open[name] = (open[name] || 0) + value;
    }
    for (const [name, field] of Object.entries(last)) {
      const value = point[field];
      if (value !== null && value !== undefined) open[name] = value;
    }
  }

  return {
    granularity,
    items: items.map(({ fullStart, ...item }) => {
      for (const name of Object.keys(sum)) {
        if (typeof item[name] === "number") item[name] = round2(item[name]);
      }
      return item;
    }),
  };
}

module.exports = {
  valuesOf,
  buildDailySeries,
  summarize,
  granularityFor,
  bucketize,
};
