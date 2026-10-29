/**
 * Turning sparse score-history documents into the series the "Scores & ranks" charts need.
 *
 * Pure functions, no database access. Same idea as platformProgress/seriesBuilder.js:
 * documents exist only on days when a score or rank changed, so every day of the range takes
 * the latest document on or before it (carry forward), and days before the first document
 * have no data (null, never zero).
 *
 * Rank changes are "positions gained": previous rank minus current rank, so a positive
 * number means the student moved up.
 */
const { SCORE_PLATFORMS } = require("../../config/rankings");
const { listDayKeys } = require("../../utils/dayKeys");
const { percentileOf } = require("./rankCalculator");

const round2 = (value) => Math.round(value * 100) / 100;

const rankOf = (entry) => (entry ? entry.rank : null);
const ofOf = (entry) => (entry ? entry.of : null);

/** The values of one stored document, under the names used in the API. */
function valuesOf(doc) {
  const scores = {};
  const platformRanks = {};
  const platformOf = {};
  for (const platform of SCORE_PLATFORMS) {
    scores[platform] = doc.scores && doc.scores[platform] !== undefined ? doc.scores[platform] : null;
    platformRanks[platform] = rankOf(doc.ranks?.platforms?.[platform]);
    platformOf[platform] = ofOf(doc.ranks?.platforms?.[platform]);
  }
  return {
    totalScore: doc.totalScore,
    department: doc.department || "",
    scores,
    overallRank: rankOf(doc.ranks?.overall),
    overallOf: ofOf(doc.ranks?.overall),
    departmentRank: rankOf(doc.ranks?.department),
    departmentOf: ofOf(doc.ranks?.department),
    platformRanks,
    platformOf,
  };
}

const gained = (previous, current) =>
  previous !== null && previous !== undefined && current !== null && current !== undefined ? previous - current : null;

/**
 * One point per day from startKey to endKey.
 *
 * @param {object} args
 * @param {Array} args.records documents inside the range, oldest first
 * @param {object|null} args.carryIn the latest document before the range, if any
 * @returns {Array<object>} points: { date, hasData, observed, baseline, totalScore, totalChange,
 *   scores, overallRank, overallOf, overallRankChange, departmentRank, departmentOf,
 *   department, platformRanks, platformOf }
 *   `baseline`: the first reading ever, so its changes are 0/null.
 */
function buildScoreSeries({ records, carryIn, startKey, endKey }) {
  const points = [];
  let cursor = 0;
  let current = carryIn || null;
  let previous = carryIn ? valuesOf(carryIn) : null;
  const empty = { scores: {}, platformRanks: {}, platformOf: {} };
  for (const platform of SCORE_PLATFORMS) {
    empty.scores[platform] = null;
    empty.platformRanks[platform] = null;
    empty.platformOf[platform] = null;
  }

  for (const date of listDayKeys(startKey, endKey)) {
    let observed = false;
    while (cursor < records.length && records[cursor].dateKey <= date) {
      if (records[cursor].dateKey === date) observed = true;
      current = records[cursor];
      cursor += 1;
    }

    const values = current ? valuesOf(current) : null;
    const point = values
      ? { date, hasData: true, observed, baseline: false, ...values, totalChange: 0, overallRankChange: null, departmentRankChange: null }
      : {
          date,
          hasData: false,
          observed: false,
          baseline: false,
          totalScore: null,
          department: "",
          overallRank: null,
          overallOf: null,
          departmentRank: null,
          departmentOf: null,
          ...empty,
          totalChange: 0,
          overallRankChange: null,
          departmentRankChange: null,
        };

    if (values && previous) {
      point.totalChange = round2(values.totalScore - previous.totalScore);
      point.overallRankChange = gained(previous.overallRank, values.overallRank);
      point.departmentRankChange = gained(previous.departmentRank, values.departmentRank);
    } else if (values) {
      point.baseline = true;
    }

    if (values) previous = values;
    points.push(point);
  }
  return points;
}

/** The first non-null value of a field in the points (or in the carried-in values). */
function firstKnown(points, carried, pick) {
  const fromCarry = carried ? pick(carried) : null;
  if (fromCarry !== null && fromCarry !== undefined) return fromCarry;
  for (const point of points) {
    const value = pick(point);
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

/** The lowest (best) rank in the points and the first day it was reached. */
function bestRank(points, pick) {
  let best = null;
  for (const point of points) {
    const value = pick(point);
    if (value !== null && value !== undefined && (best === null || value < best.rank)) {
      best = { rank: value, date: point.date };
    }
  }
  return best;
}

/**
 * Headline numbers for a range.
 * @returns {object|null} null when the range has no data at all
 */
function summarizeScores(points, carryIn) {
  const withData = points.filter((point) => point.hasData);
  if (withData.length === 0) return null;

  const now = withData[withData.length - 1];
  const carried = carryIn ? valuesOf(carryIn) : null;

  const startTotal = firstKnown(points, carried, (p) => p.totalScore);
  const startOverall = firstKnown(points, carried, (p) => p.overallRank);
  const startDepartment = firstKnown(points, carried, (p) => p.departmentRank);

  const platforms = {};
  for (const platform of SCORE_PLATFORMS) {
    if (!points.some((p) => p.scores[platform] !== null) && !(carried && carried.scores[platform] !== null)) continue;
    const startScore = firstKnown(points, carried, (p) => p.scores[platform]);
    const startRank = firstKnown(points, carried, (p) => p.platformRanks[platform]);
    const score = now.scores[platform];
    platforms[platform] = {
      score,
      scoreChange: score !== null && startScore !== null ? round2(score - startScore) : null,
      rank: now.platformRanks[platform],
      of: now.platformOf[platform],
      rankChange: gained(startRank, now.platformRanks[platform]),
      bestRank: bestRank(points, (p) => p.platformRanks[platform]),
    };
  }

  return {
    totalScore: now.totalScore,
    scoreChange: startTotal !== null ? round2(now.totalScore - startTotal) : null,
    department: now.department,
    overall: {
      rank: now.overallRank,
      of: now.overallOf,
      percentile: now.overallRank ? percentileOf({ rank: now.overallRank, of: now.overallOf }) : null,
      rankChange: gained(startOverall, now.overallRank),
      best: bestRank(points, (p) => p.overallRank),
    },
    departmentRank: {
      rank: now.departmentRank,
      of: now.departmentOf,
      rankChange: gained(startDepartment, now.departmentRank),
      best: bestRank(points, (p) => p.departmentRank),
    },
    platforms,
  };
}

module.exports = { valuesOf, buildScoreSeries, summarizeScores };
