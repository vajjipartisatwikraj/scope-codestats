/**
 * Settings for the platform progress feature (dashboard "Progress" tab).
 *
 * History is stored for the platforms below (services/platformProgress/snapshotService.js).
 * GitHub is not stored: its timeline is fetched from GitHub on demand
 * (services/platformProgress/githubTimelineService.js).
 */

// Platforms whose daily history is stored, and which charts each one supports.
// `rating` and `contests` are false where the platform has no contests to report.
const HISTORY_PLATFORMS = {
  leetcode: { problems: true, difficulty: true, rating: true, contests: true },
  codeforces: { problems: true, difficulty: true, rating: true, contests: true },
  codechef: { problems: true, difficulty: false, rating: true, contests: true },
  hackerrank: { problems: true, difficulty: false, rating: false, contests: false },
};

const GITHUB = "github";

// Every platform the progress endpoints accept, in the order they are shown.
const PROGRESS_PLATFORMS = [...Object.keys(HISTORY_PLATFORMS), GITHUB];

// Date ranges the dashboard may ask for, in days.
const RANGE_OPTIONS = [7, 30, 90, 180, 365];
const DEFAULT_RANGE_DAYS = 90;

// How the bar charts group the days of a range.
const BUCKET_THRESHOLDS = { dayMaxDays: 31, weekMaxDays: 120 };

// Storage timezone for history days (same calendar as the activity heatmap).
const HISTORY_TIMEZONE = "Asia/Kolkata";

// GitHub timeline
const GITHUB_SETTINGS = {
  graphqlUrl: "https://api.github.com/graphql",
  // contributionsCollection answers at most one year per call; per-repo commit days are
  // capped at 100 per call, so a window never exceeds 90 days.
  windowDays: 90,
  maxConcurrentWindows: 3,
  maxPagesPerList: 5,
  maxSearchPages: 10,
  cacheTtlMs: 15 * 60 * 1000,
  cacheMaxEntries: 300,
};

module.exports = {
  HISTORY_PLATFORMS,
  GITHUB,
  PROGRESS_PLATFORMS,
  RANGE_OPTIONS,
  DEFAULT_RANGE_DAYS,
  BUCKET_THRESHOLDS,
  HISTORY_TIMEZONE,
  GITHUB_SETTINGS,
};
