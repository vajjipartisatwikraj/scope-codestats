/**
 * Settings for score and rank history (dashboard "Scores & ranks").
 *
 * After every profile sync each active student's scores are ranked and recorded
 * (services/rankings/scoreHistoryService.js).
 */

// Platforms that have a score. `total score` is the sum over all of them.
const SCORE_PLATFORMS = ["leetcode", "codeforces", "codechef", "hackerrank", "github", "scopecodestats"];

// A student gets a rank on a platform only with a score above this. Ranking the many
// students who never used a platform (all at 0) would make "rank 1,400 of 2,000" meaningless.
const MIN_PLATFORM_SCORE_TO_RANK = 0;

// How many ranking runs are kept for the admin page.
const RUN_RETENTION_DAYS = 120;

// Documents per bulk write.
const WRITE_BATCH_SIZE = 1000;

module.exports = {
  SCORE_PLATFORMS,
  MIN_PLATFORM_SCORE_TO_RANK,
  RUN_RETENTION_DAYS,
  WRITE_BATCH_SIZE,
};
