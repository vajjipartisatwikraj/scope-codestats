/**
 * The combined activity heatmap, as the dashboard and the public profile both show it: cohort solves
 * and every linked platform on one calendar (GET /dashboard/heatmap/:userId, and the `activity` of the
 * public profile). Each day is { date, count, level, sources: { cohort, leetcode, ... } }.
 *
 * What one number means depends on the source, so the hover card says it in words next to the number:
 * Codeforces counts problems solved (first accepted solution), LeetCode, CodeChef and HackerRank count
 * submissions, GitHub counts contributions (commits, pull requests, issues, reviews).
 *
 * No React in this file.
 */
// `icon` is the platform mark of custom-components/PlatformIcon; `color` is the source's own colour
// (a design token, so it follows the theme), used for its icon and for the shades of its own heatmap
export const ACTIVITY_SOURCES = [
  { key: 'cohort', icon: 'scopecodestats', color: 'var(--ds-accent)', label: 'CodeStats cohorts', one: 'problem solved', many: 'problems solved' },
  { key: 'leetcode', icon: 'leetcode', color: 'var(--ds-series-amber)', label: 'LeetCode', one: 'submission', many: 'submissions' },
  { key: 'codeforces', icon: 'codeforces', color: 'var(--ds-series-violet)', label: 'Codeforces', one: 'problem solved', many: 'problems solved' },
  { key: 'codechef', icon: 'codechef', color: 'var(--ds-series-coral)', label: 'CodeChef', one: 'submission', many: 'submissions' },
  { key: 'hackerrank', icon: 'hackerrank', color: 'var(--ds-series-green)', label: 'HackerRank', one: 'submission', many: 'submissions' },
  { key: 'github', icon: 'github', color: 'var(--ds-text)', label: 'GitHub', one: 'contribution', many: 'contributions' },
];

/** The five shades of a heatmap in one colour, from an empty day to the fullest (the Heatmap's `colors`) */
export const shadesOf = (color) => [
  'var(--ds-high)',
  `color-mix(in srgb, ${color} 30%, var(--ds-high))`,
  `color-mix(in srgb, ${color} 55%, var(--ds-high))`,
  `color-mix(in srgb, ${color} 78%, var(--ds-high))`,
  color,
];

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short', timeZone: 'UTC' });

/** "Mon, 3 Nov 2026" from "2026-11-03" (a calendar date, so no time zone shifts it) */
export function formatActivityDay(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return DATE.format(new Date(Date.UTC(year, month - 1, day)));
}

const number = (value) => Number(value).toLocaleString('en-IN');

/** "1 activity" / "12 activities" */
export const activityCount = (count) => `${number(count)} ${count === 1 ? 'activity' : 'activities'}`;

/**
 * The sources that had activity on a day, in a fixed order:
 * [{ key, icon, color, label, count, text: '3', unit: 'submissions' }]
 */
export function sourceRows(entry) {
  const sources = (entry && entry.sources) || {};
  return ACTIVITY_SOURCES.filter(({ key }) => sources[key] > 0).map(({ key, icon, color, label, one, many }) => ({
    key,
    icon,
    color,
    label,
    count: sources[key],
    text: number(sources[key]),
    unit: sources[key] === 1 ? one : many,
  }));
}

/**
 * One source's own calendar, cut from the combined days: only the days it had activity, each with just
 * that source in `sources`, so the same hover card and the same Heatmap work on it.
 */
export function daysOfSource(dailyActivity, key) {
  return (Array.isArray(dailyActivity) ? dailyActivity : [])
    .filter((day) => day && day.sources && day.sources[key] > 0)
    .map((day) => ({ date: day.date, count: day.sources[key], sources: { [key]: day.sources[key] } }));
}
