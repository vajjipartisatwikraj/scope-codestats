/**
 * Number, date and time formats of the student dashboard (design/screens.md section 21):
 * Indian digit grouping, ranks as #18, signed changes with a real minus sign, dates as
 * "26 Oct 2026".
 */

const NUMBER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const WEEKDAY = new Intl.DateTimeFormat('en-IN', { weekday: 'long' });
const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric' });
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long' });
const YEAR = new Intl.DateTimeFormat('en-IN', { year: 'numeric' });
const FULL_DAY_UTC = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const isMissing = (value) => value === null || value === undefined || Number.isNaN(Number(value));

/** 2480 -> "2,480"; a missing value -> "-" */
export const formatNumber = (value) => (isMissing(value) ? '-' : NUMBER.format(value));

/** +86, -65 (a real minus sign) and 0 */
export function signed(value) {
  if (isMissing(value)) return '-';
  if (value > 0) return `+${NUMBER.format(value)}`;
  if (value < 0) return `\u2212${NUMBER.format(Math.abs(value))}`;
  return '0';
}

/** 128 -> "#128" */
export const formatRank = (rank) => (isMissing(rank) ? '-' : `#${NUMBER.format(rank)}`);

/** pluralize(1, "place") -> "1 place", pluralize(9, "place") -> "9 places" */
export const pluralize = (count, word) => `${NUMBER.format(count)} ${word}${count === 1 ? '' : 's'}`;

/** Percentile 88.6 (better than 88.6% of students) -> "Top 11%". Never "Top 0%". */
export const topPercent = (percentile) =>
  isMissing(percentile) ? null : `Top ${Math.max(1, Math.round(100 - percentile))}%`;

/** "Thursday, 22 October 2026" */
export function longDate(date = new Date()) {
  return `${WEEKDAY.format(date)}, ${DAY.format(date)} ${MONTH.format(date)} ${YEAR.format(date)}`;
}

/** "2026-10-22" (a calendar day, no time zone) -> "22 Oct 2026" */
export function formatDay(key) {
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? key : FULL_DAY_UTC.format(date);
}

/** Today's calendar day in India, as the server counts it: "2026-10-22" */
export const todayInIndia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const MONTH_DAY_UTC = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MONTH_SHORT_UTC = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });
const MONTH_YEAR_UTC = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const utcDate = (key) => new Date(`${key}T00:00:00Z`);
const validDate = (date) => !Number.isNaN(date.getTime());

/** "2026-10-22" -> "22 Oct" */
export const shortDay = (key) => (validDate(utcDate(key)) ? MONTH_DAY_UTC.format(utcDate(key)) : key);

/** "2026-10-22" -> "Oct" */
export const monthName = (key) => (validDate(utcDate(key)) ? MONTH_SHORT_UTC.format(utcDate(key)) : key);

/** "2026-10-22" -> "Oct 2026" */
export const monthYear = (key) => (validDate(utcDate(key)) ? MONTH_YEAR_UTC.format(utcDate(key)) : key);

/** "22 Oct to 28 Oct" for a week, "Oct 2026" for a month, "22 Oct 2026" for a day */
export function bucketTitle(start, end, granularity) {
  if (granularity === 'month') return monthYear(start);
  if (granularity === 'week' && start !== end) return `${shortDay(start)} to ${shortDay(end)}`;
  return formatDay(start);
}
