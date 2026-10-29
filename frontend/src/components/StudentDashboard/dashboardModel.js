/**
 * Turns the answers of the dashboard's endpoints into what the cards draw.
 *
 * Pure functions with no React in them. Nothing here invents a number: every figure is read or
 * summed from the server's answer, and a figure the answer does not contain stays null.
 */

const round2 = (value) => Math.round(value * 100) / 100;
const DAY_MS = 86400000;

export const PLATFORM_NAMES = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  github: 'GitHub',
  scopecodestats: 'CodeStats',
};

export const platformName = (key) => PLATFORM_NAMES[key] || key;

// ---- Scores (GET /platform-progress/me/scores) --------------------------------------------

/** The answer is usable when the server had a reading for the student. */
export const hasScores = (answer) => Boolean(answer && answer.state === 'ok' && answer.summary);

// ---- Problems solved per platform (GET /users/me, codingProfiles) ---------------------------

// The platforms the student solves problems on, in the order they are shown. GitHub has no
// problems, so it is not here.
const SOLVING_PLATFORMS = ['leetcode', 'codeforces', 'codechef', 'hackerrank', 'scopecodestats'];

/** One row per linked platform that counts problems: { key, name, solved } */
export function platformSolvedRows(codingProfiles) {
  if (!codingProfiles || typeof codingProfiles !== 'object') return [];
  return SOLVING_PLATFORMS.filter((key) => codingProfiles[key]).map((key) => ({
    key,
    name: platformName(key),
    solved: Number(codingProfiles[key].problemsSolved) || 0,
  }));
}

/** The problems solved on all the platforms together */
export const totalSolved = (rows) => rows.reduce((sum, row) => sum + row.solved, 0);

/** The mean number of problems solved per platform, or null without any */
export function averageSolved(rows) {
  if (!rows.length) return null;
  return rows.reduce((sum, row) => sum + row.solved, 0) / rows.length;
}

/** The row with the most problems solved (the first one on a tie), or null */
export function topSolvedRow(rows) {
  return rows.reduce((best, row) => (best === null || row.solved > best.solved ? row : best), null);
}

/** Points gained on each of the last `count` days: [{ date, value }]. A day without a reading is 0. */
export function dailyGains(answer, count = 14) {
  if (!hasScores(answer) || !Array.isArray(answer.series)) return [];
  return answer.series.slice(-count).map((point) => ({
    date: point.date,
    value: point.hasData ? Number(point.totalChange) || 0 : 0,
  }));
}

/** Points gained over the last `days` days of the series, or null when none of them has a reading */
export function gainOver(answer, days = 7) {
  if (!hasScores(answer) || !Array.isArray(answer.series)) return null;
  const recent = answer.series.slice(-days);
  if (!recent.some((point) => point.hasData)) return null;
  return round2(recent.reduce((sum, point) => sum + (point.hasData ? Number(point.totalChange) || 0 : 0), 0));
}

/** The overall rank on every day that has one: [{ date, rank }] */
export function rankHistory(answer) {
  if (!hasScores(answer) || !Array.isArray(answer.series)) return [];
  return answer.series
    .filter((point) => typeof point.overallRank === 'number')
    .map((point) => ({ date: point.date, rank: point.overallRank }));
}

/**
 * The rank history cut into `count` consecutive stretches of days, each with the best (lowest)
 * and the worst (highest) rank the student had in it: [{ from, to, best, worst }]. It is the
 * same data as rankHistory, only coarser, so a stretch shows how far the rank moved in it.
 */
export function rankRanges(history, count = 8) {
  if (!Array.isArray(history) || !history.length) return [];
  const groups = Math.min(Math.max(1, count), history.length);
  return Array.from({ length: groups }, (_, k) => {
    const start = Math.floor((k * history.length) / groups);
    const end = Math.floor(((k + 1) * history.length) / groups);
    const days = history.slice(start, end);
    const ranks = days.map((day) => day.rank);
    return {
      from: days[0].date,
      to: days[days.length - 1].date,
      best: Math.min(...ranks),
      worst: Math.max(...ranks),
    };
  });
}

// ---- Activity heatmap (GET /dashboard/heatmap/:userId) ------------------------------------

const dayNumber = (key) => {
  const [year, month, day] = String(key).split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
};

/** The most days in a row that have at least one problem solved */
export function longestStreak(dailyActivity) {
  if (!Array.isArray(dailyActivity)) return 0;
  const days = dailyActivity
    .filter((entry) => entry && entry.count > 0)
    .map((entry) => dayNumber(entry.date))
    .filter((day) => Number.isFinite(day))
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let previous = null;
  days.forEach((day) => {
    run = previous !== null && day === previous + 1 ? run + 1 : previous === day ? run : 1;
    best = Math.max(best, run);
    previous = day;
  });
  return best;
}
