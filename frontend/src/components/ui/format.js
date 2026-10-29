/**
 * Number, date and time formats of the interface (design/screens.md section 21): Indian digit
 * grouping, "26 Oct 2026", "26 Oct, 12:10 am", relative times, real minus signs.
 */

const NUMBER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const DATE_TIME_YEAR = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const lowerMeridiem = (text) => text.replace(/\bAM\b/, 'am').replace(/\bPM\b/, 'pm');

/** 20356 -> "20,356"; a missing value -> an en dash */
export const formatNumber = (value) => (value === null || value === undefined || Number.isNaN(Number(value)) ? '\u2013' : NUMBER.format(value));

/** "26 Oct 2026", or an en dash for a missing date */
export const formatDate = (value) => {
  const date = toDate(value);
  return date ? DATE.format(date) : '\u2013';
};

/** "26 Oct, 12:10 am" (with the year when it is not this year) */
export const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return '\u2013';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return lowerMeridiem((sameYear ? DATE_TIME : DATE_TIME_YEAR).format(date));
};

/** "just now", "5 minutes ago", "2 days ago", then the date; pair it with formatDateTime in a tooltip */
export function relativeTime(value) {
  const date = toDate(value);
  if (!date) return '\u2013';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return formatDate(date);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(date);
}

/** Whole days from today to a date (negative when it has passed), or null without a date */
export function daysUntil(value) {
  const date = toDate(value);
  if (!date) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

/** pluralize(1, "course") -> "1 course", pluralize(12, "course") -> "12 courses" */
export const pluralize = (count, word, plural) => `${NUMBER.format(count)} ${count === 1 ? word : plural || `${word}s`}`;

/** "Satwik Raj V" -> "SR" */
export function initialsOf(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0][0] + (words.length > 1 ? words[1][0] : '')).toUpperCase();
}
