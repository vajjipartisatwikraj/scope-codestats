/**
 * Turns the answers of the dashboard's endpoints into what the expanded views (scores, ranks,
 * problems solved) draw.
 *
 * Pure functions with no React in them. Like dashboardModel.js, nothing here invents a number:
 * every figure is read or summed from the server's answer, and a figure the answer does not
 * contain stays null.
 */
import { bucketTitle, monthName, shortDay } from './formatters';
import { platformName } from './dashboardModel';

const DAY_MS = 86400000;

/** The periods the expanded views can show, in days (the server accepts these values). */
export const RANGES = [
  { key: 7, label: '7D', words: 'last 7 days' },
  { key: 30, label: '30D', words: 'last 30 days' },
  { key: 365, label: '1Y', words: 'last year' },
];

export const rangeWords = (days) => (RANGES.find((range) => range.key === days) || RANGES[1]).words;

/** The period an expanded view opens with */
export const DEFAULT_RANGE = 30;

/** One hue per platform, everywhere (DESIGN.md: Data series) */
export const PLATFORM_COLORS = {
  leetcode: 'var(--ds-series-amber)',
  codeforces: 'var(--ds-series-blue)',
  codechef: 'var(--ds-series-coral)',
  hackerrank: 'var(--ds-series-green)',
  github: 'var(--ds-series-slate)',
  scopecodestats: 'var(--ds-series-violet)',
};

export const platformColor = (key) => PLATFORM_COLORS[key] || 'var(--ds-series-slate)';

// ---- Grouping days -------------------------------------------------------------------------

/** How a range of `days` days is grouped in bar charts (the same limits as the server) */
export const granularityFor = (days) => (days <= 31 ? 'day' : days <= 120 ? 'week' : 'month');

const dayNumber = (key) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
const dayKey = (number) => new Date(number * DAY_MS).toISOString().slice(0, 10);

/** The Monday of the week of a day, as a day key */
const weekStartOf = (key) => {
  const number = dayNumber(key);
  const weekday = new Date(number * DAY_MS).getUTCDay(); // 0 = Sunday
  return dayKey(number - ((weekday + 6) % 7));
};

const monthStartOf = (key) => `${key.slice(0, 7)}-01`;

/** The x label of a bucket on an axis: "26 Oct" for a day or a week, "Oct" for a month */
export const bucketAxisLabel = (start, granularity) => (granularity === 'month' ? monthName(start) : shortDay(start));

/**
 * Sums daily numbers into day, week or month buckets.
 * @param {Array<{date: string, value: number}>} points oldest first, one per day
 * @returns {Array<{start: string, end: string, value: number, title: string, label: string}>}
 */
export function bucketDaily(points, days) {
  const granularity = granularityFor(days);
  const buckets = new Map();
  points.forEach((point) => {
    const start =
      granularity === 'week' ? weekStartOf(point.date) : granularity === 'month' ? monthStartOf(point.date) : point.date;
    const open = buckets.get(start) || { start, end: point.date, value: 0 };
    open.end = point.date;
    open.value += point.value;
    buckets.set(start, open);
  });
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    title: bucketTitle(bucket.start, bucket.end, granularity),
    label: bucketAxisLabel(bucket.start, granularity),
  }));
}

/** The last `days` days ending on `endKey`, each with the count from `dailyActivity` (0 when none) */
export function cohortDaily(dailyActivity, days, endKey) {
  const counts = new Map();
  (Array.isArray(dailyActivity) ? dailyActivity : []).forEach((entry) => {
    if (entry && typeof entry.date === 'string') counts.set(entry.date.slice(0, 10), Number(entry.count) || 0);
  });
  const end = dayNumber(endKey);
  return Array.from({ length: days }, (_, offset) => {
    const date = dayKey(end - (days - 1 - offset));
    return { date, value: counts.get(date) || 0 };
  });
}

// ---- Scores and ranks (GET /platform-progress/me/scores) -----------------------------------

/** The buckets of a scores answer with their titles: [{ start, end, title, label, ... }] */
export function scoreBuckets(answer) {
  const granularity = answer?.buckets?.granularity || 'day';
  return (answer?.buckets?.items || []).map((item) => ({
    ...item,
    title: bucketTitle(item.start, item.end, granularity),
    label: bucketAxisLabel(item.start, granularity),
  }));
}

/**
 * How many places the rank moved in each bucket (positive: up). Summed from the daily changes of
 * the series, so it matches the rank line exactly.
 */
export function rankMovement(answer) {
  const buckets = scoreBuckets(answer);
  const changes = new Map((answer?.series || []).map((point) => [point.date, point.overallRankChange]));
  return buckets.map((bucket) => {
    let moved = null;
    for (let number = dayNumber(bucket.start); number <= dayNumber(bucket.end); number += 1) {
      const change = changes.get(dayKey(number));
      if (typeof change === 'number') moved = (moved || 0) + change;
    }
    return { ...bucket, moved };
  });
}

/** One row per platform that has a rank: { key, name, rank, of, rankChange, percentile } */
export function platformRankRows(answer) {
  const platforms = answer?.summary?.platforms || {};
  const order = Array.isArray(answer?.platforms) && answer.platforms.length ? answer.platforms : Object.keys(platforms);
  return order
    .filter((key) => platforms[key] && typeof platforms[key].rank === 'number' && platforms[key].of > 0)
    .map((key) => {
      const { rank, of, rankChange } = platforms[key];
      return {
        key,
        name: platformName(key),
        rank,
        of,
        rankChange: typeof rankChange === 'number' ? rankChange : null,
        percentile: Math.round(((of - rank) / of) * 1000) / 10,
      };
    });
}

/** The platforms that have a score, with the score now and its change: { key, name, score, change } */
export function platformScoreShares(answer) {
  const platforms = answer?.summary?.platforms || {};
  const order = Array.isArray(answer?.platforms) && answer.platforms.length ? answer.platforms : Object.keys(platforms);
  return order
    .filter((key) => platforms[key] && typeof platforms[key].score === 'number')
    .map((key) => ({
      key,
      name: platformName(key),
      score: platforms[key].score,
      change: typeof platforms[key].scoreChange === 'number' ? platforms[key].scoreChange : null,
    }));
}

// ---- One platform (GET /platform-progress/me/:platform) ------------------------------------

/** Easy, medium and hard as pie slices, or [] when the platform does not split by difficulty */
export function difficultySlices(difficulty) {
  if (!difficulty) return [];
  return [
    { key: 'easy', label: 'Easy', value: Number(difficulty.easy) || 0, color: 'var(--ds-series-green)' },
    { key: 'medium', label: 'Medium', value: Number(difficulty.medium) || 0, color: 'var(--ds-series-amber)' },
    { key: 'hard', label: 'Hard', value: Number(difficulty.hard) || 0, color: 'var(--ds-series-coral)' },
  ];
}

/** The buckets of a platform answer with their titles */
export function historyBuckets(answer) {
  const granularity = answer?.buckets?.granularity || 'day';
  return (answer?.buckets?.items || []).map((item) => ({
    ...item,
    title: bucketTitle(item.start, item.end, granularity),
    label: bucketAxisLabel(item.start, granularity),
  }));
}

/** Platform states that mean "no history to draw", with the sentence to show */
export const NO_HISTORY_COPY = {
  not_linked: 'This platform is not linked yet. Link your username and your history starts with the next update.',
  pending: 'Your first update of this platform is still running. Your history starts when it finishes.',
  invalid_username: 'We could not find this account on the platform. Check the username you linked.',
  sync_failed: 'The last update of this platform failed, so there is no history to show yet.',
  no_history: 'Your history for this platform starts after your next update.',
};
