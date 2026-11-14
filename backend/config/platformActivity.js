/**
 * Settings for the per-day activity of external platforms (the combined activity heatmap).
 *
 * What one number means depends on the platform, and the heatmap says so in its hover text:
 *   problems       distinct problems whose first accepted solution was on that day (Codeforces)
 *   submissions    submissions made that day (LeetCode, CodeChef, HackerRank)
 *   contributions  what GitHub counts on its own contribution graph (commits, pull requests, issues, reviews)
 */
const ACTIVITY_PLATFORMS = {
  leetcode: { kind: "submissions", label: "LeetCode" },
  codeforces: { kind: "problems", label: "Codeforces" },
  codechef: { kind: "submissions", label: "CodeChef" },
  hackerrank: { kind: "submissions", label: "HackerRank" },
  github: { kind: "contributions", label: "GitHub" },
};

// Days kept for each platform (the heatmap shows one year). Every refresh replaces this whole window.
const STORE_DAYS = 366;

// Calendar the stored days are in. LeetCode and GitHub give UTC days, CodeChef and HackerRank give the
// dates they show on their own pages, and Codeforces solve times are converted to this one.
const ACTIVITY_TIMEZONE = "Asia/Kolkata";

// Minimum gap between two requests to the same site, measured in tests (scraper/results):
// CodeChef blocks about 12 requests a minute for a few seconds to half a minute; HackerRank never blocked.
const REQUEST_GAP_MS = { codechef: 6000, hackerrank: 1000 };

// How long to stop asking a site after it said "slow down" (HTTP 429)
const BACKOFF_MS = { codechef: 30000, default: 2000 };

// A student may ask for a manual refresh of their activity this often
const MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

module.exports = { ACTIVITY_PLATFORMS, STORE_DAYS, ACTIVITY_TIMEZONE, REQUEST_GAP_MS, BACKOFF_MS, MANUAL_REFRESH_COOLDOWN_MS };
