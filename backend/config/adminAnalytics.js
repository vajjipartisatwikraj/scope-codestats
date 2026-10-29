/**
 * Settings for the admin "Performance" analytics (all students over the coding platforms).
 *
 * What is shown for each platform, which numbers can be sorted on, and the periods the
 * admin may pick. Used by services/adminAnalytics, middleware/adminAnalyticsParams and (as
 * the API contract) by the admin dashboard.
 */
const { HISTORY_PLATFORMS } = require("./platformProgress");
const { SCORE_PLATFORMS } = require("./rankings");

// Periods the admin may pick, in days. Gains are measured over the last N days (IST, ending
// today). "All time" is the current totals, which every table and chart also shows.
const PERIOD_OPTIONS = [7, 30, 90, 180, 365];
const DEFAULT_PERIOD_DAYS = 30;

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const MAX_SEARCH_LENGTH = 64;

// The comparison table can group students by these.
const GROUP_BY_OPTIONS = ["department", "graduatingYear", "section"];
const DEFAULT_GROUP_BY = "department";

// The loaded data (every active student, one period) is kept this long. Filters are applied
// to it in memory, so switching a filter does not read the database again. The numbers only
// change when profiles sync (nightly, or an admin run), so a few minutes old is fine; the
// screen shows when the data was loaded.
const CACHE = { ttlMs: 5 * 60 * 1000, maxEntries: 8 };

/**
 * The numbers shown per platform: API name -> field of the Profile document (a dotted path
 * reaches into a sub-document). The API and the sort keys use the API names.
 */
const PLATFORM_STATS = {
  leetcode: {
    score: "score",
    problems: "problemsSolved",
    easy: "easyProblemsSolved",
    medium: "mediumProblemsSolved",
    hard: "hardProblemsSolved",
    rating: "rating",
    maxRating: "maxRating",
    contests: "contestsParticipated",
  },
  codeforces: {
    score: "score",
    problems: "problemsSolved",
    rating: "rating",
    maxRating: "maxRating",
    contests: "contestsParticipated",
  },
  codechef: {
    score: "score",
    problems: "problemsSolved",
    rating: "rating",
    maxRating: "maxRating",
    contests: "contestsParticipated",
  },
  hackerrank: {
    score: "score",
    problems: "problemsSolved",
    badges: "badges",
    certificates: "certificates",
  },
  github: {
    score: "score",
    commits: "details.totalCommits",
    contributions: "details.contributionsLastYear",
    repos: "details.publicRepos",
    stars: "details.starsReceived",
    followers: "details.followers",
  },
  scopecodestats: {
    score: "score",
    problems: "problemsSolved",
    lifetimeScore: "lifetimeScore",
    cohortScore: "totalCohortScore",
    cohortProblems: "totalCohortProblemsSolved",
    cohortsCompleted: "totalCohortsCompleted",
    practiceContests: "totalPracticeArenaContests",
  },
};

// Which stat counts as "contests attended" on each platform (summed for a student's total).
const CONTEST_STAT = {
  leetcode: "contests",
  codeforces: "contests",
  codechef: "contests",
  scopecodestats: "practiceContests",
};

// Changes over the period, taken from the stored history (platform snapshots for problems,
// contests and rating; score history for scores). GitHub commits are not stored over time,
// so they only exist as current totals; GitHub's score does have a change.
const GAIN_STATS = {
  score: SCORE_PLATFORMS,
  problems: Object.keys(HISTORY_PLATFORMS).filter((p) => HISTORY_PLATFORMS[p].problems),
  contests: Object.keys(HISTORY_PLATFORMS).filter((p) => HISTORY_PLATFORMS[p].contests),
  rating: Object.keys(HISTORY_PLATFORMS).filter((p) => HISTORY_PLATFORMS[p].rating),
};

// Names of the change fields in a platform entry of a student row.
const GAIN_FIELD = { score: "scoreGain", problems: "problemsGain", contests: "contestsGain", rating: "ratingChange" };

// Rating bands for the distribution chart (lower bounds; the first band is "below the first").
const RATING_BANDS = {
  leetcode: [1400, 1600, 1800, 2000],
  codeforces: [1200, 1400, 1600, 1900, 2100, 2400],
  codechef: [1400, 1600, 1800, 2000, 2200],
};

const TOP_LIST_SIZE = 10;
const PLATFORM_TOP_SIZE = 5;

// What a request may sort the student table by, built from the definitions above.
function buildSortKeys() {
  const keys = new Set([
    "name",
    "rollNumber",
    "department",
    "section",
    "graduatingYear",
    "platformsLinked",
    "consistencyIndex",
    "activeDays",
    "totalScore",
    "totalProblems",
    "totalContests",
    "scoreGain",
    "problemsGain",
    "contestsGain",
  ]);
  for (const [platform, stats] of Object.entries(PLATFORM_STATS)) {
    for (const stat of Object.keys(stats)) keys.add(`${platform}.${stat}`);
    for (const [kind, platforms] of Object.entries(GAIN_STATS)) {
      if (platforms.includes(platform)) keys.add(`${platform}.${GAIN_FIELD[kind]}`);
    }
  }
  return keys;
}
const SORT_KEYS = [...buildSortKeys()];

module.exports = {
  PERIOD_OPTIONS,
  DEFAULT_PERIOD_DAYS,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  GROUP_BY_OPTIONS,
  DEFAULT_GROUP_BY,
  CACHE,
  PLATFORM_STATS,
  CONTEST_STAT,
  GAIN_STATS,
  GAIN_FIELD,
  RATING_BANDS,
  TOP_LIST_SIZE,
  PLATFORM_TOP_SIZE,
  SORT_KEYS,
};
