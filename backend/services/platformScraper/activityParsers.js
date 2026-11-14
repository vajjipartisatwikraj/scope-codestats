/**
 * Turning what each platform says about a student's days into one shape: { "YYYY-MM-DD": count }.
 *
 * Pure functions, no network. Each platform's scraper downloads the data and calls its parser here.
 * A parser returns `null` when the answer is not what it expects (a changed page, a block page): the
 * caller must then keep what is stored instead of replacing it with "nothing".
 */
const { dayKeyOf } = require("../../utils/dayKeys");
const { ACTIVITY_TIMEZONE } = require("../../config/platformActivity");

const pad = (n) => String(n).padStart(2, "0");

/** "2025-1-8" or "2025-01-08" -> "2025-01-08"; anything else -> null */
function toDayKey(value) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value));
  return match ? `${match[1]}-${pad(match[2])}-${pad(match[3])}` : null;
}

/** Adds `amount` to a day of the tally. Ignores days that are not dates and amounts that are not positive. */
function addTo(daily, key, amount) {
  const day = toDayKey(key);
  const value = Math.floor(Number(amount));
  if (day && Number.isFinite(value) && value > 0) daily[day] = (daily[day] || 0) + value;
}

/** The JSON array or object that follows `marker` in a page, found by matching brackets. */
function extractJsonAfter(text, marker) {
  const at = text.indexOf(marker);
  if (at < 0) return null;
  const open = text.slice(at).search(/[[{]/);
  if (open < 0) return null;
  const start = at + open;
  const closers = { "[": "]", "{": "}" };
  const stack = [];
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (closers[char]) stack.push(closers[char]);
    else if (char === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * LeetCode: `userCalendar.submissionCalendar` is a JSON string { "<unix seconds of a UTC day>": submissions }.
 * It covers about the last year.
 */
function fromLeetCodeCalendar(submissionCalendar) {
  let calendar;
  try {
    calendar = typeof submissionCalendar === "string" ? JSON.parse(submissionCalendar || "{}") : submissionCalendar;
  } catch {
    return null;
  }
  if (!calendar || typeof calendar !== "object") return null;
  const daily = {};
  for (const [seconds, count] of Object.entries(calendar)) {
    const time = Number(seconds) * 1000;
    if (Number.isFinite(time)) addTo(daily, new Date(time).toISOString().slice(0, 10), count);
  }
  return daily;
}

/**
 * Codeforces: the submissions of `user.status`. A problem counts on the day of its first accepted
 * solution (in the platform's calendar), once however many times it was submitted again.
 */
function fromCodeforcesSubmissions(submissions) {
  if (!Array.isArray(submissions)) return null;
  const firstSolve = new Map();
  for (const submission of submissions) {
    if (submission.verdict !== "OK" || !submission.problem) continue;
    const id = `${submission.problem.contestId}_${submission.problem.index}`;
    const time = submission.creationTimeSeconds;
    if (!firstSolve.has(id) || time < firstSolve.get(id)) firstSolve.set(id, time);
  }
  const daily = {};
  for (const seconds of firstSolve.values()) addTo(daily, dayKeyOf(new Date(seconds * 1000), ACTIVITY_TIMEZONE), 1);
  return daily;
}

/**
 * CodeChef: the profile page holds `userDailySubmissionsStats = [{ date, value }, ...]` (submissions per
 * day, about two years). An account that never submitted has no such list, which is a valid page. A page
 * that is not a profile at all (a block page, a changed layout) returns null.
 */
function fromCodeChefPage(html) {
  if (typeof html !== "string") return null;
  const stats = extractJsonAfter(html, "userDailySubmissionsStats");
  const isProfilePage = /Total Problems Solved|rating-number|user-details-container/i.test(html);
  if (!stats) return isProfilePage ? {} : null;
  if (!Array.isArray(stats)) return null;
  const daily = {};
  for (const entry of stats) addTo(daily, entry?.date, entry?.value);
  return daily;
}

/** HackerRank: `submission_histories` is { "YYYY-MM-DD": submissions } for the whole history. */
function fromHackerRankHistories(json) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const daily = {};
  for (const [date, count] of Object.entries(json)) addTo(daily, date, count);
  return daily;
}

/**
 * GitHub: the public contribution graph (`/users/<name>/contributions`). Every day is a cell with a
 * `data-date` and a tooltip such as "5 contributions on November 16th.". Days are GitHub's own (UTC).
 */
function fromGitHubContributionsPage(html) {
  if (typeof html !== "string") return null;
  const dateById = new Map();
  for (const tag of html.match(/<td\b[^>]*data-date="[^"]+"[^>]*>/g) || []) {
    const date = /data-date="([^"]+)"/.exec(tag)?.[1];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (date && id) dateById.set(id, date);
  }
  if (dateById.size === 0) return null;

  const daily = {};
  for (const match of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const count = /^(\d+)\s+contribution/i.exec(match[2].trim());
    if (count && dateById.has(match[1])) addTo(daily, dateById.get(match[1]), count[1]);
  }
  return daily;
}

module.exports = {
  toDayKey,
  extractJsonAfter,
  fromLeetCodeCalendar,
  fromCodeforcesSubmissions,
  fromCodeChefPage,
  fromHackerRankHistories,
  fromGitHubContributionsPage,
};
