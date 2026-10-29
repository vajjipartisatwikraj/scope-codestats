/**
 * Number, name and image formats of the leaderboard (design/screens.md section 21): Indian digit
 * grouping, ranks as #18, signed changes with a real minus sign.
 */
import { apiUrl } from '../../config/apiConfig';

const NUMBER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const TIME = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

const isMissing = (value) => value === null || value === undefined || Number.isNaN(Number(value));

/** 20356 -> "20,356"; a missing value -> an en dash */
export const formatNumber = (value) => (isMissing(value) ? '\u2013' : NUMBER.format(value));

/** 21 -> "#21" */
export const formatRank = (rank) => (isMissing(rank) ? '\u2013' : `#${NUMBER.format(rank)}`);

/** 1 -> { number: "1", suffix: "st" }, 12 -> "12th", 23 -> "23rd" */
export function ordinalParts(rank) {
  const n = Math.abs(Math.round(Number(rank) || 0));
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return { number: NUMBER.format(n), suffix };
}

/** +504, a real minus for -65, and 0 */
export function signed(value) {
  if (isMissing(value)) return '\u2013';
  if (value > 0) return `+${NUMBER.format(value)}`;
  if (value < 0) return `\u2212${NUMBER.format(Math.abs(value))}`;
  return '0';
}

/** pluralize(1, "student") -> "1 student", pluralize(481, "student") -> "481 students" */
export const pluralize = (count, word) => `${NUMBER.format(count)} ${word}${count === 1 ? '' : 's'}`;

/** "26 Oct, 4:12 pm" */
export const formatMoment = (date) => TIME.format(date).replace(/\bAM\b/, 'am').replace(/\bPM\b/, 'pm');

/** "Satwik Raj V" -> "SR" (the first letters of the first two words) */
export function initialsOf(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0][0] + (words.length > 1 ? words[1][0] : '')).toUpperCase();
}

/** The address of a profile picture, or null: a full URL stays as it is, a path is served by the API */
export function profileImageUrl(picture) {
  if (!picture || typeof picture !== 'string') return null;
  if (picture.startsWith('http') || picture.startsWith('data:')) return picture;
  return `${apiUrl}/${picture}`;
}

/** The part of an email before the "@", which is the address of the student's profile page */
export const usernameOf = (email) => (typeof email === 'string' && email.includes('@') ? email.split('@')[0] : '');

/** The address of a student's profile page, or null without an email */
export const profilePath = (email) => {
  const username = usernameOf(email);
  return username ? `/public-profile/${encodeURIComponent(username)}` : null;
};
