/**
 * Platform scraper: one module per platform, one entry point.
 *
 *   const { fetchProfile } = require("./services/platformScraper");
 *   const stats = await fetchProfile("leetcode", "someuser");
 *
 * `fetchProfile` returns only Profile-model field names (see models/Profile.js),
 * ready to be `$set` on the Profile document, and throws a ScraperError whose
 * `type` says why it failed.
 */
const { ScraperError, classifyError, ERROR_TYPES } = require("./errors");

const scrapers = {
  leetcode: require("./leetcode"),
  codeforces: require("./codeforces"),
  codechef: require("./codechef"),
  hackerrank: require("./hackerrank"),
  github: require("./github"),
  scopecodestats: require("./scopecodestats"),
};

// CodeChef is slow; give it longer than the others.
const TIMEOUT_MS = { codechef: 30000, default: 20000 };
const MAX_ATTEMPTS = 3;
const RETRYABLE = new Set(["timeout", "rate_limited", "network", "service_unavailable"]);

// Scalar Profile fields a scraper may fill. A field is only written when the
// scraper actually returned it.
const SCALAR_FIELDS = [
  "score",
  "problemsSolved",
  "easyProblemsSolved",
  "mediumProblemsSolved",
  "hardProblemsSolved",
  "rating",
  "maxRating",
  "globalRank",
  "countryRank",
  "instituteRank",
  "contestsParticipated",
  "contestRanking",
  "badges",
  "certificates",
  "totalCohortsCompleted",
  "totalCohortProblemsSolved",
  "totalCohortScore",
  "lifetimeScore",
  "lifetimeProblems",
  "totalPracticeArenaContests",
];

const GITHUB_DETAIL_FIELDS = [
  "publicRepos",
  "totalCommits",
  "followers",
  "following",
  "starsReceived",
  "contributionsLastYear",
];

/** Maps a scraper's raw result onto Profile field names. */
function toProfileFields(platform, raw) {
  const out = {};
  const source = {
    ...raw,
    // Some scrapers use their platform's own names for these.
    globalRank: raw.globalRank ?? raw.global_rank ?? raw.ranking,
    countryRank: raw.countryRank ?? raw.country_rank,
  };

  for (const field of SCALAR_FIELDS) {
    if (source[field] !== undefined && source[field] !== null) {
      out[field] = Number(source[field]) || 0;
    }
  }
  if (raw.rank !== undefined && raw.rank !== null) out.rank = String(raw.rank);
  if (raw.contestBadge) out.contestBadge = String(raw.contestBadge);

  if (platform === "github") {
    // Commits are not solved problems; they live in `details`.
    out.problemsSolved = 0;
    out.details = {};
    for (const field of GITHUB_DETAIL_FIELDS) out.details[field] = Number(raw[field]) || 0;
  }
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce(platform, identifier) {
  const timeoutMs = TIMEOUT_MS[platform] || TIMEOUT_MS.default;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new ScraperError("timeout", `${platform} request timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });
  try {
    return await Promise.race([scrapers[platform].fetchProfile(identifier), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} platform
 * @param {string} identifier username (user id for scopecodestats)
 * @returns {Promise<{ fields: object, partial: boolean }>}
 */
async function fetchProfile(platform, identifier) {
  if (!scrapers[platform]) {
    throw new ScraperError("unknown", `Unsupported platform: ${platform}`);
  }
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    throw new ScraperError("invalid_username", `Username is required for ${platform}`);
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await fetchOnce(platform, identifier.trim());
      if (!raw || typeof raw !== "object") {
        throw new ScraperError("unknown", `No data returned for ${identifier} on ${platform}`);
      }
      return { fields: toProfileFields(platform, raw), partial: Boolean(raw.isPartialData) };
    } catch (error) {
      lastError = classifyError(error);
      if (!RETRYABLE.has(lastError.type) || attempt === MAX_ATTEMPTS) break;
      await sleep(1000 + Math.floor(Math.random() * 1000)); // jitter between retries
    }
  }
  throw lastError;
}

module.exports = {
  fetchProfile,
  ScraperError,
  ERROR_TYPES,
  PLATFORMS: Object.keys(scrapers),
};
