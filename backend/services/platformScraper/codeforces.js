/**
 * Codeforces scraper
 *
 * Fetches a public profile and returns a flat object that maps onto the Profile
 * model (score, problemsSolved, rating, ...). Throws on failure; callers classify
 * the error with ./errors.
 */
const http = require("./http");
const log = require("../../utils/logger").scope("CODEFORCES");

// Codeforces allows a limited number of calls per window; shared across requests.
const rateState = {
  lastRequest: 0,
  requestCount: 0,
  resetTime: Date.now() + 60000, // counter resets after 1 minute
};

/**
 * Calculate normalized score for Codeforces profiles
 * @param {number} rating - User's rating
 * @param {number} problemsSolved - Number of problems solved
 * @param {number} contestsParticipated - Number of contests participated
 * @returns {number} - Calculated score
 */
function calculateCodeforcesScore(rating, problemsSolved, contestsParticipated = 0) {
  // Formula: (CFPS*2 + (CFR-800)²/10 + CFNC*50)
  // Where CFPS = Problems solved, CFR = Rating, CFNC = Number of contests participated

  // Problems solved component
  const problemsScore = problemsSolved * 5;

  // Rating component - only considered if participated in at least 3 contests and rating > 700
  let ratingScore = 0;
  if (contestsParticipated >= 3 && rating > 1000) {
    ratingScore = Math.pow(rating - 1000, 2) / 30;
  }

  // Contests participated component
  const contestsScore = contestsParticipated * 50;

  // Calculate total score
  const score = problemsScore + ratingScore + contestsScore;

  return Math.round(score);
}


/**
 * Fetch Codeforces user profile using official API
 * @param {string} username - Codeforces username
 * @returns {Object} - User profile data
 */
async function getCodeforcesProfile(username) {
  try {
    log.debug(`Fetching Codeforces profile for user: ${username}`);

    // Implement rate limiting for Codeforces
    // Reset counter if the reset time has passed
    const now = Date.now();
    if (now > rateState.resetTime) {
      rateState.requestCount = 0;
      rateState.resetTime = now + 60000; // Reset after 1 minute
    }

    // If we've made more than 5 requests in the last minute, add delay
    if (rateState.requestCount >= 5) {
      const remainingTime = rateState.resetTime - now;
      if (remainingTime > 0) {
        log.debug(
          `Rate limiting: Waiting ${remainingTime}ms before Codeforces request`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(remainingTime, 5000)),
        );
      }
    }

    // Add a small delay between requests to be extra safe
    if (
      rateState.lastRequest &&
      now - rateState.lastRequest < 1000
    ) {
      const delay = 1000 - (now - rateState.lastRequest);
      log.debug(`Adding ${delay}ms delay between Codeforces requests`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    rateState.lastRequest = Date.now();
    rateState.requestCount++;

    // 1. Get basic user information from user.info API
    const userResponse = await http.get(
      `https://codeforces.com/api/user.info?handles=${username}`,
      {
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 400 || status === 429,
      },
    );

    // Handle rate limiting response
    if (userResponse.status === 429) {
      log.debug("Codeforces API rate limit hit (429 response)");
      // Wait and retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // Reset our counters and retry after waiting
      rateState.requestCount = 0;
      rateState.lastRequest = 0;
      throw new Error(
        `Codeforces API rate limit exceeded. Please try again in a few minutes.`,
      );
    }

    // Check if user exists
    if (
      userResponse.status === 400 ||
      userResponse.data.status !== "OK" ||
      !userResponse.data.result ||
      userResponse.data.result.length === 0
    ) {
      log.debug(`User ${username} not found on Codeforces (API response)`);
      throw new Error(`User ${username} not found on Codeforces`);
    }

    // Extract basic user data
    const userData = userResponse.data.result[0];
    log.debug(
      `Retrieved basic Codeforces data for ${username}: rating=${userData.rating}, rank=${userData.rank}`,
    );

    // 2. Get rating history to count contest participation
    const ratingResponse = await http.get(
      `https://codeforces.com/api/user.rating?handle=${username}`,
      {
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 429,
      },
    );

    // Handle rate limiting for rating request
    if (ratingResponse.status === 429) {
      log.debug(
        "Codeforces API rate limit hit for rating history (429 response)",
      );
      // Use default values and continue rather than failing completely
      log.debug("Using default values for contest participation");
      return processCodeforcesData(userData, username, 0, 0, 0, 0, 0);
    }

    // Extract contests participated
    let contestsParticipated = 0;
    if (ratingResponse.data.status === "OK") {
      contestsParticipated = ratingResponse.data.result.length;
      log.debug(
        `${username} has participated in ${contestsParticipated} contests`,
      );
    }

    // 3. Get submissions to count problems solved
    // Using count=10000 to handle users with many submissions
    try {
      const submissionsResponse = await http.get(
        `https://codeforces.com/api/user.status?handle=${username}&from=1&count=10000`,
        {
          validateStatus: (status) =>
            (status >= 200 && status < 300) || status === 429,
        },
      );

      // Handle rate limiting for submissions request
      if (submissionsResponse.status === 429) {
        log.debug(
          "Codeforces API rate limit hit for submissions (429 response)",
        );
        // Use basic data without submissions
        return processCodeforcesData(
          userData,
          username,
          contestsParticipated,
          0,
          0,
          0,
          0,
        );
      }

      // Process submissions to get unique solved problems
      if (submissionsResponse.data.status === "OK") {
        return processCodeforcesSubmissions(
          submissionsResponse.data,
          userData,
          username,
          contestsParticipated,
        );
      } else {
        // No valid submissions data, use basic profile info
        return processCodeforcesData(
          userData,
          username,
          contestsParticipated,
          0,
          0,
          0,
          0,
        );
      }
    } catch (submissionsError) {
      log.error(
        `Error fetching Codeforces submissions for ${username}:`,
        submissionsError.message,
      );
      // Just use what we have so far
      return processCodeforcesData(
        userData,
        username,
        contestsParticipated,
        0,
        0,
        0,
        0,
      );
    }
  } catch (error) {
    log.error(
      `Error fetching Codeforces profile for ${username}:`,
      error.message,
    );

    // Provide specific error for not found users
    if (
      error.response?.status === 400 ||
      error.message.includes("not found")
    ) {
      throw new Error(
        `User ${username} not found on Codeforces. Please check the spelling and try again.`,
      );
    }

    // Handle rate limiting
    if (
      error.response?.status === 429 ||
      error.message.includes("rate limit")
    ) {
      throw new Error(
        `Codeforces API rate limit exceeded. Please try again in a few minutes.`,
      );
    }

    // Specific handling for 503
    if (error.response?.status === 503) {
      throw new Error(
        `Codeforces API service is temporarily unavailable. Please try again later.`,
      );
    }

    // Re-throw other errors
    throw new Error(`Failed to fetch Codeforces profile: ${error.message}`);
  }
}


/**
 * Process Codeforces submissions data
 * @private
 */
function processCodeforcesSubmissions(
  submissionsData,
  userData,
  username,
  contestsParticipated,
) {
  const submissions = submissionsData.result;

  // Create a set of unique problem IDs that were solved
  const solvedProblems = new Set();

  // Track problems by difficulty level (A, B, C, etc.)
  const problemsByIndex = {};
  let totalAcceptedSubmissions = 0;

  submissions.forEach((sub) => {
    // Only count if verdict is OK (accepted)
    if (sub.verdict === "OK") {
      totalAcceptedSubmissions++;

      // Create unique problem identifier
      const problemId = `${sub.problem.contestId}_${sub.problem.index}`;

      // Only add to set if not already solved (for unique problems count)
      if (!solvedProblems.has(problemId)) {
        solvedProblems.add(problemId);

        // Group by problem index (difficulty)
        const index = sub.problem.index.charAt(0); // A, B, C, etc.
        problemsByIndex[index] = (problemsByIndex[index] || 0) + 1;
      }
    }
  });

  // Categorize problems by difficulty based on index
  const easyIndices = ["A", "B"];
  const mediumIndices = ["C", "D"];
  const hardIndices = ["E", "F", "G", "H", "I", "J", "K"];

  const easyProblemsSolved = Object.entries(problemsByIndex)
    .filter(([key]) => easyIndices.includes(key))
    .reduce((sum, [_, value]) => sum + value, 0);

  const mediumProblemsSolved = Object.entries(problemsByIndex)
    .filter(([key]) => mediumIndices.includes(key))
    .reduce((sum, [_, value]) => sum + value, 0);

  const hardProblemsSolved = Object.entries(problemsByIndex)
    .filter(([key]) => hardIndices.includes(key))
    .reduce((sum, [_, value]) => sum + value, 0);

  const problemsSolved = solvedProblems.size;

  log.debug(
    `${username} has solved ${problemsSolved} unique problems on Codeforces`,
  );
  log.debug(
    `Problem difficulty breakdown - Easy: ${easyProblemsSolved}, Medium: ${mediumProblemsSolved}, Hard: ${hardProblemsSolved}`,
  );

  return processCodeforcesData(
    userData,
    username,
    contestsParticipated,
    problemsSolved,
    easyProblemsSolved,
    mediumProblemsSolved,
    hardProblemsSolved,
    totalAcceptedSubmissions,
  );
}


/**
 * Process and return Codeforces profile data
 * @private
 */
function processCodeforcesData(
  userData,
  username,
  contestsParticipated,
  problemsSolved,
  easyProblemsSolved,
  mediumProblemsSolved,
  hardProblemsSolved,
  totalAcceptedSubmissions = 0,
) {
  // For users with no activity, we'll still return a valid profile with zeros
  // (This is not an error condition anymore)
  if (
    problemsSolved === 0 &&
    contestsParticipated === 0 &&
    (userData.rating === undefined || userData.rating === 0)
  ) {
    log.debug(
      `Codeforces user ${username} exists but has no activity data - returning zeros`,
    );
    // This is not an error - just return a profile with zeros
  }

  // Calculate score using our scoring algorithm
  const score = calculateCodeforcesScore(
    userData.rating || 0,
    problemsSolved,
    contestsParticipated,
  );

  return {
    username,
    rating: userData.rating || 0,
    maxRating: userData.maxRating || 0,
    rank: userData.rank || "unrated",
    problemsSolved: problemsSolved || 0,
    totalAcceptedSubmissions: totalAcceptedSubmissions || 0,
    easyProblemsSolved: easyProblemsSolved || 0,
    mediumProblemsSolved: mediumProblemsSolved || 0,
    hardProblemsSolved: hardProblemsSolved || 0,
    contestsParticipated: contestsParticipated || 0,
    score: score || 0,
    contribution: userData.contribution || 0,
    lastUpdated: new Date(),
  };
}


module.exports = { fetchProfile: getCodeforcesProfile, calculateCodeforcesScore };
