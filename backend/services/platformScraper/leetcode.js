/**
 * LeetCode scraper
 *
 * Fetches a public profile and returns a flat object that maps onto the Profile
 * model (score, problemsSolved, rating, ...). Throws on failure; callers classify
 * the error with ./errors.
 */
const http = require("./http");
const log = require("../../utils/logger").scope("LEETCODE");

/**
 * Calculate normalized score for LeetCode profiles
 * @param {number} totalSolved - Total problems solved
 * @param {number} ranking - User's global ranking
 * @param {number} rating - User's contest rating
 * @param {Object} difficulty - Problems solved by difficulty
 * @param {number} contestsParticipated - Number of contests participated
 * @returns {number} - Calculated score
 */
function calculateLeetCodeScore(
  totalSolved,
  ranking,
  rating,
  difficulty = {},
  contestsParticipated = 0,
) {
  // Formula: (LCPS*10 + (LCR-1300)²/10 + LCNC*50)
  // Where LCPS = Problems solved (PS), LCR = Rating (R), LCNC = Number of contests participated (NC)

  // Problems solved component
  const problemsScore = totalSolved * 5;

  // Rating component - only considered if participated in at least 3 contests and rating > 1300
  let ratingScore = 0;
  if (contestsParticipated >= 3 && rating > 1400) {
    ratingScore = Math.pow(rating - 1400, 2) / 30;
  }

  // Contests participated component
  const contestsScore = contestsParticipated * 50;

  // Calculate total score
  const score = problemsScore + ratingScore + contestsScore;

  return Math.round(score);
}


/**
 * Fetch LeetCode user profile using the LeetCode Stats API
 * @param {string} username - LeetCode username
 * @returns {Object} - User profile data
 */
async function getLeetCodeProfile(username) {
  try {
    log.debug(`Fetching LeetCode profile for user: ${username}`);

    // LeetCode GraphQL endpoint
    const graphqlEndpoint = "https://leetcode.com/graphql";

    // GraphQL query to fetch user profile data - more conservative query that should be less likely to fail
    const graphqlQuery = {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submitStats: submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
            }
            profile {
              reputation
              ranking
              starRating
            }
            contestBadge {
              name
            }
          }
        }
      `,
      variables: {
        username: username,
      },
    };

    // Separate query just for contest data
    const contestQuery = {
      query: `
        query getUserContestInfo($username: String!) {
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            totalParticipants
            topPercentage
            badge {
              name
            }
          }
        }
      `,
      variables: {
        username: username,
      },
    };

    log.debug(
      `Making GraphQL request to LeetCode API for user: ${username}`,
    );

    // Prepare headers with cookies and more browser-like appearance
    const headers = {
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/${username}/`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Origin: "https://leetcode.com",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    };

    // Make the GraphQL request with better error handling
    const response = await http
      .post(graphqlEndpoint, graphqlQuery, {
        headers,
        validateStatus: (status) => status === 200, // Only accept 200 responses
      })
      .catch((err) => {
        log.error(
          `LeetCode GraphQL main query failed with: ${err.message}`,
        );
        log.error(
          `Status code: ${err.response?.status}, Status text: ${err.response?.statusText}`,
        );

        if (err.response?.data) {
          try {
            log.error(
              "Error response data:",
              JSON.stringify(err.response.data, null, 2),
            );
          } catch (e) {
            log.error("Error data present but could not stringify");
          }
        }

        return { status: err.response?.status || 500, data: null };
      });

    // Check if the response contains valid data
    if (
      !response.data ||
      !response.data.data ||
      !response.data.data.matchedUser
    ) {
      log.warn(
        `Main profile query failed or returned invalid data for ${username}, will continue with partial data`,
      );
      // Continue with partial data rather than failing completely
    }

    // Extract user data from main query
    const userData = response.data?.data?.matchedUser || {};
    log.debug(`LeetCode GraphQL API main data received for ${username}`);

    // Initialize contest data with defaults
    let contestsParticipated = 0;
    let rating = 0;
    let contestRanking = 0;
    let contestBadge = "";

    // Try to extract contest data from the main query first
    if (userData.contestRating) {
      log.debug(
        `Found contest data in main profile response for ${username}`,
      );
      contestsParticipated =
        userData.contestRating.attendedContestsCount || 0;
      rating = userData.contestRating.rating || 0;
      contestRanking = userData.contestRating.globalRanking || 0;

      log.debug(`Contest data found for ${username}:`);
      log.debug(`- Contests Participated: ${contestsParticipated}`);
      log.debug(`- Rating: ${rating}`);
      log.debug(`- Contest Ranking: ${contestRanking}`);

      // Get badge information
      if (userData.contestBadge?.name) {
        contestBadge = userData.contestBadge.name;
      }
    } else {
      log.warn(
        `No contest data found in main profile response for ${username}, trying contest query`,
      );

      // Try to get contest data separately
      try {
        log.debug(
          `Attempting to fetch contest data for ${username} using dedicated query`,
        );
        const contestResponse = await http
          .post(graphqlEndpoint, contestQuery, {
            headers: {
              "Content-Type": "application/json",
              Referer: `https://leetcode.com/${username}/`,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Origin: "https://leetcode.com",
              Accept: "*/*",
            },
          })
          .catch((err) => {
            log.warn(`Contest query failed: ${err.message}`);
            if (err.response?.status) {
              log.warn(
                `Status code: ${err.response.status}, Status text: ${err.response.statusText}`,
              );
            }
            return { data: null };
          });

        // Log the response data for debugging
        if (contestResponse.data) {
          try {
            log.debug(
              `Contest API response:`,
              JSON.stringify(contestResponse.data, null, 2),
            );
          } catch (e) {
            log.debug("Contest response available but could not stringify");
          }
        }

        // Extract contest data if available
        if (contestResponse.data?.data?.userContestRanking) {
          const contestData = contestResponse.data.data.userContestRanking;
          contestsParticipated = contestData.attendedContestsCount || 0;
          rating = contestData.rating || 0;
          contestRanking = contestData.globalRanking || 0;

          log.debug(`Contest data found:`);
          log.debug(`- Contests Participated: ${contestsParticipated}`);
          log.debug(`- Rating: ${rating}`);
          log.debug(`- Contest Ranking: ${contestRanking}`);

          // Get badge information
          if (contestData.badge?.name) {
            contestBadge = contestData.badge.name;
          }
        } else {
          log.warn(
            `No contest data found in dedicated contest query response`,
          );
        }
      } catch (contestError) {
        log.warn(`Failed to fetch contest data: ${contestError.message}`);
      }

      // New approach for contest data: use public REST API
      if (contestsParticipated === 0 && rating === 0) {
        try {
          log.debug(
            `Trying alternative method for ${username} contest data using public API`,
          );

          // Use the public API endpoint that doesn't require authentication
          const publicApiUrl = `https://leetcode.com/graphql/?query=query%20userContestRankingInfo(%24username%3A%20String!)%20%7B%0A%20%20userContestRanking(username%3A%20%24username)%20%7B%0A%20%20%20%20attendedContestsCount%0A%20%20%20%20rating%0A%20%20%20%20globalRanking%0A%20%20%20%20totalParticipants%0A%20%20%20%20topPercentage%0A%20%20%20%20badge%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D&variables=%7B%22username%22%3A%22${encodeURIComponent(
            username,
          )}%22%7D`;

          const contestResponse = await http
            .get(publicApiUrl, {
              headers: {
                Referer: `https://leetcode.com/${username}/`,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "application/json",
              },
              timeout: 15000, // 15 second timeout
            })
            .catch((err) => {
              log.warn(
                `Alternative contest data fetch failed: ${err.message}`,
              );
              if (err.response?.status) {
                log.warn(
                  `Status code: ${err.response.status}, Status text: ${err.response.statusText}`,
                );
              }
              return { data: null };
            });

          // Log the response data for debugging
          if (contestResponse.data) {
            try {
              log.debug(
                `Alternative contest API response:`,
                JSON.stringify(contestResponse.data, null, 2),
              );
            } catch (e) {
              log.debug(
                "Contest response available but could not stringify",
              );
            }
          }

          // Extract contest data if available
          if (contestResponse.data?.data?.userContestRanking) {
            const contestData = contestResponse.data.data.userContestRanking;
            contestsParticipated = contestData.attendedContestsCount || 0;
            rating = contestData.rating || 0;
            contestRanking = contestData.globalRanking || 0;

            log.debug(`Alternative contest data found:`);
            log.debug(`- Contests Participated: ${contestsParticipated}`);
            log.debug(`- Rating: ${rating}`);
            log.debug(`- Contest Ranking: ${contestRanking}`);

            // Get badge information
            if (contestData.badge?.name) {
              contestBadge = contestData.badge.name;
            }
          } else {
            log.warn(`No contest data found in alternative API response`);
          }
        } catch (alternativeError) {
          log.warn(
            `Alternative contest data fetch failed with error: ${alternativeError.message}`,
          );
        }

        // If still no contest data, try scraping directly from user profile page
        if (contestsParticipated === 0 && rating === 0) {
          try {
            log.debug(
              `Trying to scrape contest data from ${username}'s profile page as last resort`,
            );

            const profilePageResponse = await http
              .get(`https://leetcode.com/${username}/`, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Accept: "text/html,application/xhtml+xml,application/xml",
                },
                timeout: 15000, // 15 second timeout
              })
              .catch((err) => {
                log.warn(`Profile page request failed: ${err.message}`);
                return null;
              });

            if (profilePageResponse && profilePageResponse.status === 200) {
              log.debug(
                `Successfully fetched ${username}'s profile page, looking for contest data`,
              );
              const html = profilePageResponse.data;

              // Try to extract contest data from the HTML using regex patterns
              // This is a fallback approach and might break if LeetCode changes their HTML structure
              const contestsPattern = /attendedContestsCount\\":\s*(\d+)/;
              const ratingPattern = /rating\\":\s*(\d+)/;
              const contestsMatch = html.match(contestsPattern);
              const ratingMatch = html.match(ratingPattern);

              if (contestsMatch && contestsMatch[1]) {
                contestsParticipated = parseInt(contestsMatch[1], 10) || 0;
                log.debug(
                  `Found contests participated from HTML: ${contestsParticipated}`,
                );
              }

              if (ratingMatch && ratingMatch[1]) {
                rating = parseInt(ratingMatch[1], 10) || 0;
                log.debug(`Found rating from HTML: ${rating}`);
              }

              // Try to find contest badge
              const badgePattern =
                /contestBadge\\":{[^}]*\\"name\\":\\"([^"\\]+)/;
              const badgeMatch = html.match(badgePattern);
              if (badgeMatch && badgeMatch[1]) {
                contestBadge = badgeMatch[1];
                log.debug(`Found contest badge from HTML: ${contestBadge}`);
              }
            }
          } catch (scrapingError) {
            log.warn(
              `Profile page scraping failed: ${scrapingError.message}`,
            );
          }
        }
      }
    }

    // Extract problem solving statistics
    const submitStats = userData.submitStats?.acSubmissionNum || [];

    // Initialize difficulty counts
    let allSolved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    // Process submission stats by difficulty
    submitStats.forEach((stat) => {
      const count = stat.count || 0;

      switch (stat.difficulty) {
        case "All":
          allSolved = count;
          break;
        case "Easy":
          easySolved = count;
          break;
        case "Medium":
          mediumSolved = count;
          break;
        case "Hard":
          hardSolved = count;
          break;
      }
    });

    // Extract profile data
    const profile = userData.profile || {};

    // Map the difficulty data to our existing format
    const difficultyMap = {
      all: allSolved,
      easy: easySolved,
      medium: mediumSolved,
      hard: hardSolved,
    };

    // Calculate a score using our scoring algorithm
    const score = calculateLeetCodeScore(
      allSolved,
      profile.ranking || 0,
      rating,
      difficultyMap,
      contestsParticipated,
    );

    // If we don't have any problem data, but we know the user exists,
    // return a minimal profile rather than an error
    if (allSolved === 0 && !userData.profile) {
      // Check if we actually verified that this user exists
      if (!userData.username && Object.keys(userData).length === 0) {
        // No user data at all - we should throw an error
        log.error(
          `No user data found for "${username}" - likely a non-existent user`,
        );
        throw new Error(
          `User ${username} not found on LeetCode. Please check the spelling and try again.`,
        );
      }

      log.debug(
        `Minimal data available for ${username}, creating basic profile`,
      );
      return {
        username,
        problemsSolved: 0,
        ranking: 0,
        score: 0,
        reputation: 0,
        easyProblemsSolved: 0,
        mediumProblemsSolved: 0,
        hardProblemsSolved: 0,
        contestsParticipated: contestsParticipated,
        rating: rating,
        contestRanking: contestRanking,
        contestBadge: contestBadge,
        lastUpdated: new Date(),
        isPartialData: true, // Flag to indicate this is partial data
      };
    }

    return {
      username,
      problemsSolved: allSolved,
      ranking: profile.ranking || 0,
      score,
      reputation: profile.reputation || 0,
      starRating: profile.starRating || 0,
      easyProblemsSolved: easySolved,
      mediumProblemsSolved: mediumSolved,
      hardProblemsSolved: hardSolved,
      contestsParticipated: contestsParticipated,
      rating: rating,
      contestRanking: contestRanking,
      contestBadge: contestBadge,
      lastUpdated: new Date(),
    };
  } catch (error) {
    log.error(
      `Error fetching LeetCode profile for ${username}:`,
      error.message,
    );

    // Log more details if available
    if (error.response) {
      log.error("LeetCode API Response Status:", error.response.status);
      log.error("LeetCode API Response Headers:", error.response.headers);

      // Safely log response data without causing additional errors
      try {
        log.error(
          "LeetCode API Response Data:",
          typeof error.response.data === "object"
            ? JSON.stringify(error.response.data)
            : error.response.data,
        );
      } catch (logError) {
        log.error("Could not stringify response data");
      }
    }

    // Create a minimal profile object that can be returned in case other approaches fail
    const minimalProfile = {
      username,
      problemsSolved: 0,
      ranking: 0,
      score: 0,
      easyProblemsSolved: 0,
      mediumProblemsSolved: 0,
      hardProblemsSolved: 0,
      contestsParticipated: 0,
      rating: 0,
      contestRanking: 0,
      lastUpdated: new Date(),
      isPartialData: true,
    };

    // Handle authentication errors (401, 403) or bad requests (400)
    if (
      error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.response?.status === 400
    ) {
      log.debug(
        `LeetCode API authentication error (${error.response.status}) for ${username}, trying direct profile page request`,
      );

      try {
        // Try getting basic data from the user's public profile page
        const profilePageResponse = await http
          .get(`https://leetcode.com/${username}/`, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml",
            },
            timeout: 15000, // 15 second timeout
          })
          .catch((err) => {
            log.warn(`Profile page request failed: ${err.message}`);
            if (err.response?.status) {
              log.warn(
                `Status: ${err.response.status} ${err.response.statusText}`,
              );

              // If we get a 404 Not Found status, the user definitely doesn't exist
              if (err.response.status === 404) {
                log.error(
                  `LeetCode profile page returned 404 Not Found for ${username}`,
                );
                throw new Error(
                  `User ${username} not found on LeetCode. Please check the username and try again.`,
                );
              }
            }
            return null;
          });

        // If the profile page doesn't exist, the user doesn't exist
        if (!profilePageResponse) {
          log.error(
            `Could not verify existence of LeetCode user ${username}`,
          );
          throw new Error(
            `User ${username} not found on LeetCode. Please check the username and try again.`,
          );
        }

        // Check the response content for indicators of a non-existent user
        const pageContent = profilePageResponse.data || "";

        // Look for common text patterns that indicate the user doesn't exist
        const nonExistentIndicators = [
          "Page not found",
          "The page you are looking for doesn't exist",
          "user not found",
          "User not found",
          "does not exist",
        ];

        if (
          typeof pageContent === "string" &&
          nonExistentIndicators.some((indicator) =>
            pageContent.includes(indicator),
          )
        ) {
          log.error(
            `LeetCode profile page indicates user ${username} doesn't exist`,
          );
          throw new Error(
            `User ${username} not found on LeetCode. Please check the username and try again.`,
          );
        }

        // Verify a profile section exists to confirm user is real
        const hasProfileSection =
          typeof pageContent === "string" &&
          (pageContent.includes("user-profile") ||
            pageContent.includes("profile-content") ||
            pageContent.includes("profile-header"));

        // If we can at least confirm the user exists, try to extract some data from HTML
        if (
          profilePageResponse &&
          profilePageResponse.status === 200 &&
          hasProfileSection
        ) {
          log.debug(
            `Successfully confirmed ${username} exists on LeetCode via profile page`,
          );

          // Try to extract some basic stats using regex patterns
          const html = profilePageResponse.data;

          // Match problem solving stats
          const totalSolvedPattern = /"problemsSolved":\s*(\d+)/;
          const easySolvedPattern = /"easySolved":\s*(\d+)/;
          const mediumSolvedPattern = /"mediumSolved":\s*(\d+)/;
          const hardSolvedPattern = /"hardSolved":\s*(\d+)/;

          const totalMatch = html.match(totalSolvedPattern);
          const easyMatch = html.match(easySolvedPattern);
          const mediumMatch = html.match(mediumSolvedPattern);
          const hardMatch = html.match(hardSolvedPattern);

          // Contest data patterns
          const contestsPattern = /attendedContestsCount\\":\s*(\d+)/;
          const ratingPattern = /rating\\":\s*(\d+)/;
          const contestsMatch = html.match(contestsPattern);
          const ratingMatch = html.match(ratingPattern);

          // Update minimal profile with any data we found
          if (totalMatch && totalMatch[1]) {
            minimalProfile.problemsSolved = parseInt(totalMatch[1], 10);
            log.debug(
              `Found total problems solved: ${minimalProfile.problemsSolved}`,
            );
          }

          if (easyMatch && easyMatch[1]) {
            minimalProfile.easyProblemsSolved = parseInt(easyMatch[1], 10);
          }

          if (mediumMatch && mediumMatch[1]) {
            minimalProfile.mediumProblemsSolved = parseInt(
              mediumMatch[1],
              10,
            );
          }

          if (hardMatch && hardMatch[1]) {
            minimalProfile.hardProblemsSolved = parseInt(hardMatch[1], 10);
          }

          if (contestsMatch && contestsMatch[1]) {
            minimalProfile.contestsParticipated = parseInt(
              contestsMatch[1],
              10,
            );
            log.debug(
              `Found contests participated: ${minimalProfile.contestsParticipated}`,
            );
          }

          if (ratingMatch && ratingMatch[1]) {
            minimalProfile.rating = parseInt(ratingMatch[1], 10);
            log.debug(`Found rating: ${minimalProfile.rating}`);
          }

          // Calculate score with the data we have
          if (minimalProfile.problemsSolved > 0) {
            const difficultyMap = {
              all: minimalProfile.problemsSolved,
              easy: minimalProfile.easyProblemsSolved,
              medium: minimalProfile.mediumProblemsSolved,
              hard: minimalProfile.hardProblemsSolved,
            };

            minimalProfile.score = calculateLeetCodeScore(
              minimalProfile.problemsSolved,
              minimalProfile.ranking,
              minimalProfile.rating,
              difficultyMap,
              minimalProfile.contestsParticipated,
            );

            log.debug(
              `Calculated score for ${username} from HTML data: ${minimalProfile.score}`,
            );
          }

          minimalProfile.existsConfirmed = true;
          minimalProfile.scrapedFromHTML = true;

          return minimalProfile;
        }
      } catch (fallbackError) {
        // If the error explicitly mentions "not found", propagate it
        if (fallbackError.message.includes("not found")) {
          throw fallbackError;
        }

        log.error(
          `Final fallback HTML scraping failed: ${fallbackError.message}`,
        );

        // At this point, we couldn't verify the user exists, so we should not return a profile
        throw new Error(
          `Could not verify if user ${username} exists on LeetCode. Please check the username and try again.`,
        );
      }

      // If profile page check also fails, try a very simple HEAD request
      try {
        const headCheck = await http.head(
          `https://leetcode.com/${username}/`,
        );
        if (headCheck.status === 200) {
          log.debug(
            `Confirmed ${username} exists (HEAD request) but couldn't get profile data`,
          );
          minimalProfile.existsConfirmed = true;
          return minimalProfile;
        } else if (headCheck.status === 404) {
          // A 404 on HEAD request confirms the user doesn't exist
          throw new Error(
            `User ${username} not found on LeetCode. Please check the username and try again.`,
          );
        }
      } catch (headCheckError) {
        log.warn(`HEAD check failed: ${headCheckError.message}`);

        // If it's a 404, the user definitely doesn't exist
        if (headCheckError.response?.status === 404) {
          throw new Error(
            `User ${username} not found on LeetCode. Please check the username and try again.`,
          );
        }
      }

      // If we've reached this point, we couldn't definitively verify if the user exists or not
      // We should err on the side of caution and NOT create a profile
      log.error(
        `Could not verify existence of LeetCode user ${username} after multiple attempts`,
      );
      throw new Error(
        `Could not verify if user ${username} exists on LeetCode. Please check the username and try again.`,
      );
    }

    // Rate limiting (429)
    if (error.response?.status === 429) {
      log.error(`LeetCode API rate limit (429) exceeded for ${username}`);
      throw new Error(
        `LeetCode API rate limit exceeded. Please try again in a few minutes.`,
      );
    }

    // Provide more specific error message
    if (
      error.message.includes("not found") ||
      error.response?.status === 404
    ) {
      throw new Error(
        `User ${username} not found on LeetCode. Please check the username and try again.`,
      );
    } else if (
      error.code === "ECONNABORTED" ||
      error.message.includes("timeout")
    ) {
      throw new Error(
        `LeetCode API request timed out. Please try again later.`,
      );
    }

    // Generic error message as a last resort
    throw new Error(`Failed to fetch LeetCode profile: ${error.message}`);
  }
}


module.exports = { fetchProfile: getLeetCodeProfile, calculateLeetCodeScore };
