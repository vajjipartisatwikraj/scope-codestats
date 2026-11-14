/**
 * HackerRank scraper
 *
 * Fetches a public profile and returns a flat object that maps onto the Profile
 * model (score, problemsSolved, rating, ...). Throws on failure; callers classify
 * the error with ./errors.
 */
const http = require("./http");
const log = require("../../utils/logger").scope("HACKERRANK");
const { createThrottle } = require("./throttle");
const { fromHackerRankHistories } = require("./activityParsers");
const { REQUEST_GAP_MS } = require("../../config/platformActivity");

// HackerRank never blocked in tests (scraper/results), so this gap is only courtesy.
const throttle = createThrottle(REQUEST_GAP_MS.hackerrank);

/**
 * The per-day submissions of a profile: `submission_histories` answers { "YYYY-MM-DD": count } for the
 * whole history of the account. Returns null when the answer is not in that shape.
 */
async function fetchActivity(username) {
  await throttle.wait();
  const response = await http.get(
    `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/submission_histories`,
    { headers: { Accept: "application/json" }, validateStatus: (status) => status === 200 },
  );
  const daily = fromHackerRankHistories(response.data);
  return daily ? { daily } : null;
}

/**
 * Calculate normalized score for HackerRank profiles
 * @param {Object} data - HackerRank profile data
 * @returns {number} - Calculated score
 */
function calculateHackerRankScore(data) {
  // 7 points for each problem solved
  const problemsSolved = data.totalSolved || data.problemsSolved || 0;
  return problemsSolved * 5;
}


/**
 * Fetch HackerRank user profile using direct REST API
 * @param {string} username - HackerRank username
 * @returns {Object} - User profile data
 */
async function getHackerRankProfile(username) {
  try {
    log.debug(`Fetching HackerRank profile for user: ${username}`);

    // Make a direct request to the badges API endpoint
    await throttle.wait();
    const response = await http.get(
      `https://www.hackerrank.com/rest/hackers/${username}/badges`,
      {
        headers: {
          Accept: "application/json",
        },
        // Don't throw on 404, we'll handle it explicitly
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 404,
      },
    );

    // Check if the request was successful
    if (
      response.status === 404 ||
      !response.data ||
      response.data.status !== true
    ) {
      throw new Error(`User ${username} not found on HackerRank`);
    }

    const badgesData = response.data.models || [];

    // Calculate total problems solved by summing up all badges
    let totalProblemsSolved = 0;
    let totalStars = 0;
    let languageBadges = {};
    let skillBadges = {};

    // Process each badge/category
    badgesData.forEach((badge) => {
      // Sum up problems solved
      totalProblemsSolved += badge.solved || 0;

      // Sum up stars earned
      totalStars += badge.stars || 0;

      // Categorize badges
      if (badge.category_name === "Language Proficiency") {
        languageBadges[badge.badge_name] = {
          solved: badge.solved || 0,
          stars: badge.stars || 0,
          total_challenges: badge.total_challenges || 0,
        };
      } else if (badge.category_name === "Specialized Skills") {
        skillBadges[badge.badge_name] = {
          solved: badge.solved || 0,
          stars: badge.stars || 0,
          total_challenges: badge.total_challenges || 0,
        };
      }
    });

    // Calculate score based on problems solved
    const score = calculateHackerRankScore({
      totalSolved: totalProblemsSolved,
    });

    // The activity is a bonus: when it cannot be read, the profile still counts
    const activity = await fetchActivity(username).catch((error) => {
      log.warn(`Could not read the HackerRank activity of ${username}: ${error.message}`);
      return null;
    });

    return {
      username,
      totalSolved: totalProblemsSolved,
      problemsSolved: totalProblemsSolved,
      badges: languageBadges,
      certificates: skillBadges,
      contestsParticipated: 0,
      score,
      lastUpdated: new Date(),
      activity,
    };
  } catch (error) {
    log.error(
      `Error fetching HackerRank profile for ${username}:`,
      error,
    );

    if (error.message.includes("not found")) {
      throw new Error(`User ${username} not found on HackerRank`);
    }

    throw new Error(`Failed to fetch HackerRank profile: ${error.message}`);
  }
}


module.exports = { fetchProfile: getHackerRankProfile, fetchActivity, calculateHackerRankScore };
