/**
 * Turns the loaded dataset (analyticsDataset.js) into what the admin screens show: filtered
 * students, headline numbers, per-platform statistics, comparisons between departments /
 * years / sections, distributions, leaders and the trend over the period.
 *
 * Pure functions over plain data, no database access.
 */
const {
  PLATFORM_STATS,
  CONTEST_STAT,
  GAIN_STATS,
  GAIN_FIELD,
  RATING_BANDS,
  TOP_LIST_SIZE,
  PLATFORM_TOP_SIZE,
} = require("../../config/adminAnalytics");
const { SCORE_PLATFORMS } = require("../../config/rankings");
const { addDays, daysBetween } = require("../../utils/dayKeys");
const { sortValue } = require("./rowBuilder");

const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const known = (values) => values.filter((v) => v !== null && v !== undefined);
const average = (values) => (values.length ? round2(sum(values) / values.length) : 0);
const rate = (part, whole) => (whole ? round1((part / whole) * 100) : 0);

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : round2((sorted[middle - 1] + sorted[middle]) / 2);
}

// ─── Filtering ──────────────────────────────────────────────────────────────

/**
 * Keeps the entries that match every filter given. `search` matches the name or roll number.
 * @param {Array<{row: object}>} entries
 * @param {{department?: string, graduatingYear?: number, section?: string, search?: string}} filters
 */
function filterEntries(entries, { department, graduatingYear, section, search } = {}) {
  const needle = search ? search.trim().toLowerCase() : "";
  return entries.filter(({ row }) => {
    if (department && row.department !== department) return false;
    if (graduatingYear && row.graduatingYear !== graduatingYear) return false;
    if (section && row.section !== section) return false;
    if (needle && !row.name.toLowerCase().includes(needle) && !row.rollNumber.toLowerCase().includes(needle)) return false;
    return true;
  });
}

// ─── Headline numbers ───────────────────────────────────────────────────────

function summarize(entries) {
  const rows = entries.map((e) => e.row);
  const students = rows.length;
  const totalScore = sum(rows.map((r) => r.totalScore));
  const totalProblems = sum(rows.map((r) => r.totalProblems));
  const totalContests = sum(rows.map((r) => r.totalContests));
  const moved = rows.filter((r) => (r.scoreGain || 0) > 0 || (r.problemsGain || 0) > 0 || (r.contestsGain || 0) > 0).length;
  return {
    students,
    withLinkedPlatform: rows.filter((r) => r.platformsLinked > 0).length,
    avgPlatformsLinked: average(rows.map((r) => r.platformsLinked)),
    totalScore: round2(totalScore),
    avgScore: students ? round2(totalScore / students) : 0,
    medianScore: median(rows.map((r) => r.totalScore)),
    totalProblems,
    avgProblems: students ? round2(totalProblems / students) : 0,
    totalContests,
    avgContests: students ? round2(totalContests / students) : 0,
    scoreGain: round2(sum(known(rows.map((r) => r.scoreGain)))),
    problemsGain: round2(sum(known(rows.map((r) => r.problemsGain)))),
    contestsGain: round2(sum(known(rows.map((r) => r.contestsGain)))),
    // Students with any recorded progress in the period, of those measured.
    activeStudents: moved,
    activeRate: rate(moved, students),
  };
}

// ─── Platforms ──────────────────────────────────────────────────────────────

const personOf = (row, value) => ({ id: row.id, name: row.name, rollNumber: row.rollNumber, department: row.department, value });

function topBy(rows, pick, size) {
  return rows
    .map((row) => ({ row, value: pick(row) }))
    .filter((x) => typeof x.value === "number" && x.value > 0)
    .sort((a, b) => b.value - a.value || a.row.name.localeCompare(b.row.name))
    .slice(0, size)
    .map((x) => personOf(x.row, x.value));
}

function ratingBands(platform, ratings) {
  const bounds = RATING_BANDS[platform];
  if (!bounds) return null;
  const bands = [
    { label: `Below ${bounds[0]}`, count: 0 },
    ...bounds.map((from, i) => ({
      label: i === bounds.length - 1 ? `${from}+` : `${from}-${bounds[i + 1] - 1}`,
      count: 0,
    })),
  ];
  for (const rating of ratings) {
    let band = 0;
    while (band < bounds.length && rating >= bounds[band]) band += 1;
    bands[band].count += 1;
  }
  return bands;
}

/** Statistics of one platform over the linked students. */
function platformStats(platform, entries) {
  const rows = entries.map((e) => e.row);
  const linked = rows.filter((r) => r.platforms[platform]);
  const of = (r) => r.platforms[platform];

  const stats = {};
  for (const stat of Object.keys(PLATFORM_STATS[platform])) {
    const values = linked.map((r) => of(r)[stat]);
    stats[stat] = { total: round2(sum(values)), avg: average(values), max: values.length ? Math.max(...values) : 0 };
  }

  const gainOf = (kind) => known(linked.map((r) => of(r)[GAIN_FIELD[kind]]));
  const scoreGains = gainOf("score");
  const problemGains = GAIN_STATS.problems.includes(platform) ? gainOf("problems") : null;
  const contestGains = GAIN_STATS.contests.includes(platform) ? gainOf("contests") : null;

  const out = {
    platform,
    linked: linked.length,
    linkedRate: rate(linked.length, rows.length),
    scoring: linked.filter((r) => of(r).score > 0).length,
    syncFailing: linked.filter((r) => of(r).status === "error").length,
    stats,
    gains: {
      score: round2(sum(scoreGains)),
      problems: problemGains ? round2(sum(problemGains)) : null,
      contests: contestGains ? round2(sum(contestGains)) : null,
    },
    // Students who made progress in the period on this platform.
    active: linked.filter((r) => (of(r).problemsGain || 0) > 0 || (of(r).contestsGain || 0) > 0 || (of(r).scoreGain || 0) > 0).length,
    contestParticipants: CONTEST_STAT[platform] ? linked.filter((r) => of(r)[CONTEST_STAT[platform]] > 0).length : null,
    rating: null,
    top: topBy(linked, (r) => of(r).score, PLATFORM_TOP_SIZE),
  };

  if (GAIN_STATS.rating.includes(platform)) {
    const rated = linked.filter((r) => of(r).rating > 0);
    const changes = gainOf("rating");
    out.rating = {
      rated: rated.length,
      ratedRate: rate(rated.length, linked.length),
      avg: average(rated.map((r) => of(r).rating)),
      median: median(rated.map((r) => of(r).rating)),
      max: rated.length ? Math.max(...rated.map((r) => of(r).rating)) : 0,
      peakMax: rated.length ? Math.max(...rated.map((r) => of(r).maxRating || 0)) : 0,
      avgChange: average(changes),
      improved: changes.filter((c) => c > 0).length,
      declined: changes.filter((c) => c < 0).length,
      bands: ratingBands(platform, rated.map((r) => of(r).rating)),
      top: topBy(rated, (r) => of(r).rating, PLATFORM_TOP_SIZE),
    };
  }
  return out;
}

// ─── Comparison between groups ──────────────────────────────────────────────

/**
 * One line per department / graduating year / section.
 * @param {"department"|"graduatingYear"|"section"} groupBy
 * @param {Map<number,string>} yearLabels
 */
function compareGroups(entries, groupBy, yearLabels = new Map()) {
  const groups = new Map();
  for (const entry of entries) {
    const value = entry.row[groupBy];
    const key = value === null || value === undefined || value === "" ? "" : String(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const items = [...groups.entries()].map(([key, members]) => {
    const rows = members.map((m) => m.row);
    const count = rows.length;
    const commits = rows.map((r) => r.platforms.github?.commits || 0);
    const moved = rows.filter((r) => (r.scoreGain || 0) > 0 || (r.problemsGain || 0) > 0 || (r.contestsGain || 0) > 0).length;
    const label =
      key === "" ? "Not set" : groupBy === "graduatingYear" ? yearLabels.get(Number(key)) || key : key;
    return {
      key,
      label,
      students: count,
      linkedRate: rate(rows.filter((r) => r.platformsLinked > 0).length, count),
      totalScore: round2(sum(rows.map((r) => r.totalScore))),
      avgScore: average(rows.map((r) => r.totalScore)),
      totalProblems: sum(rows.map((r) => r.totalProblems)),
      avgProblems: average(rows.map((r) => r.totalProblems)),
      totalContests: sum(rows.map((r) => r.totalContests)),
      avgContests: average(rows.map((r) => r.totalContests)),
      avgCommits: average(commits),
      avgScoreGain: average(known(rows.map((r) => r.scoreGain))),
      avgProblemsGain: average(known(rows.map((r) => r.problemsGain))),
      activeRate: rate(moved, count),
    };
  });

  return items.sort((a, b) => b.avgScore - a.avgScore || a.label.localeCompare(b.label));
}

// ─── Distributions and leaders ──────────────────────────────────────────────

/** A 1-2-5 step so the bins have round edges. */
function niceStep(rough) {
  if (rough <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const unit = rough / power;
  const factor = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return factor * power;
}

/** About ten equal bins from 0 to the largest value. */
function histogram(values) {
  const max = values.length ? Math.max(...values) : 0;
  if (max <= 0) return [{ from: 0, to: 0, label: "0", count: values.length }];
  const step = niceStep(max / 10);
  const bins = Math.floor(max / step) + 1;
  const out = Array.from({ length: bins }, (_, i) => ({
    from: i * step,
    to: (i + 1) * step,
    label: `${i * step}-${(i + 1) * step - 1}`,
    count: 0,
  }));
  for (const value of values) out[Math.min(Math.floor(Math.max(value, 0) / step), bins - 1)].count += 1;
  return out;
}

function leaders(entries) {
  const rows = entries.map((e) => e.row);
  return {
    score: topBy(rows, (r) => r.totalScore, TOP_LIST_SIZE),
    scoreGain: topBy(rows, (r) => r.scoreGain, TOP_LIST_SIZE),
    problems: topBy(rows, (r) => r.totalProblems, TOP_LIST_SIZE),
    problemsGain: topBy(rows, (r) => r.problemsGain, TOP_LIST_SIZE),
    contests: topBy(rows, (r) => r.totalContests, TOP_LIST_SIZE),
  };
}

// ─── Trend ──────────────────────────────────────────────────────────────────

/** Days between points: every day up to a month, weekly up to four months, then monthly. */
const stepFor = (days) => (days <= 31 ? 1 : days <= 120 ? 7 : 30);

/**
 * Cumulative change since the start of the period, added up over the students. Each point is
 * "how much was gained between the start of the period and that day".
 * @returns {Array<{date, score, problems, contests, scoreByPlatform, problemsByPlatform, contestsByPlatform}>}
 */
function buildTrend(entries, range) {
  const days = range.days;
  const series = ["score", ...SCORE_PLATFORMS.map((p) => `score.${p}`)];
  for (const p of GAIN_STATS.problems) series.push(`problems.${p}`);
  for (const p of GAIN_STATS.contests) series.push(`contests.${p}`);

  const diffs = Object.fromEntries(series.map((key) => [key, new Float64Array(days + 1)]));
  for (const { changes } of entries) {
    for (const key of series) {
      const change = changes[key];
      if (!change) continue;
      for (const { dateKey, delta } of change.deltas) {
        const index = Math.min(Math.max(daysBetween(range.start, dateKey), 0), days - 1);
        diffs[key][index] += delta;
      }
    }
  }

  // running totals per day
  const cumulative = {};
  for (const key of series) {
    let running = 0;
    cumulative[key] = Array.from({ length: days }, (_, i) => (running += diffs[key][i]));
  }

  const step = stepFor(days);
  const indexes = [];
  for (let i = 0; i < days; i += step) indexes.push(i);
  if (indexes[indexes.length - 1] !== days - 1) indexes.push(days - 1);

  return indexes.map((i) => {
    const pick = (kind, platforms) => Object.fromEntries(platforms.map((p) => [p, round2(cumulative[`${kind}.${p}`][i])]));
    const problemsByPlatform = pick("problems", GAIN_STATS.problems);
    const contestsByPlatform = pick("contests", GAIN_STATS.contests);
    return {
      date: addDays(range.start, i),
      score: round2(cumulative.score[i]),
      scoreByPlatform: pick("score", SCORE_PLATFORMS),
      problems: round2(sum(Object.values(problemsByPlatform))),
      problemsByPlatform,
      contests: round2(sum(Object.values(contestsByPlatform))),
      contestsByPlatform,
    };
  });
}

// ─── The two answers ────────────────────────────────────────────────────────

/**
 * Everything on the overview page for the chosen filters.
 * @param {object} dataset from analyticsDataset.loadDataset
 * @param {{department?, graduatingYear?, section?}} filters
 * @param {"department"|"graduatingYear"|"section"} groupBy
 */
function buildOverview(dataset, filters, groupBy) {
  const entries = filterEntries(dataset.entries, filters);
  // The comparison shows every value of the dimension it groups by, so that dimension's own
  // filter is left out (the others still apply).
  const comparable = filterEntries(dataset.entries, { ...filters, [groupBy]: undefined });

  const rows = entries.map((e) => e.row);
  return {
    generatedAt: dataset.generatedAt,
    range: dataset.range,
    tracking: dataset.tracking,
    filters: {
      department: filters.department || null,
      graduatingYear: filters.graduatingYear || null,
      section: filters.section || null,
    },
    summary: summarize(entries),
    platforms: Object.keys(PLATFORM_STATS).map((platform) => platformStats(platform, entries)),
    comparison: { groupBy, items: compareGroups(comparable, groupBy, dataset.yearLabels) },
    distributions: {
      score: histogram(rows.map((r) => r.totalScore)),
      problems: histogram(rows.map((r) => r.totalProblems)),
    },
    leaders: leaders(entries),
    trend: buildTrend(entries, dataset.range),
  };
}

const isMissing = (value) => value === null || value === undefined;

/**
 * One page of the student table.
 * @param {{sort: string, order: "asc"|"desc", page: number, limit: number, search?: string}} query
 *   `sort` must be one of config SORT_KEYS (the parameter middleware checks it)
 */
function pageStudents(dataset, filters, { sort, order, page, limit, search }) {
  const entries = filterEntries(dataset.entries, { ...filters, search });
  const direction = order === "asc" ? 1 : -1;
  const rows = entries.map((e) => e.row);

  rows.sort((a, b) => {
    const x = sortValue(a, sort);
    const y = sortValue(b, sort);
    // Students without the number (platform not linked, nothing measured) always go last.
    if (isMissing(x) !== isMissing(y)) return isMissing(x) ? 1 : -1;
    if (!isMissing(x) && x !== y) {
      const compared = typeof x === "string" ? x.localeCompare(y) : x - y;
      if (compared !== 0) return compared * direction;
    }
    return a.name.localeCompare(b.name);
  });

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return {
    generatedAt: dataset.generatedAt,
    range: dataset.range,
    students: rows.slice((current - 1) * limit, current * limit),
    pagination: { page: current, limit, total, pages },
  };
}

module.exports = {
  filterEntries,
  summarize,
  platformStats,
  compareGroups,
  histogram,
  leaders,
  buildTrend,
  buildOverview,
  pageStudents,
  median,
};
