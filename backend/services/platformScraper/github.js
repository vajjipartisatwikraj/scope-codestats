/**
 * GitHub scraper
 *
 * Fetches a public profile and returns a flat object that maps onto the Profile
 * model (score, problemsSolved, rating, ...). Throws on failure; callers classify
 * the error with ./errors.
 */
const http = require("./http");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const log = require("../../utils/logger").scope("GITHUB");
const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

/**
 * Calculate normalized score for GitHub profiles
 * @param {Object} data - GitHub profile data
 * @returns {number} - Calculated score
 */
function calculateGitHubScore(data) {
  // Points for repositories (10 points each)
  const repoScore = (data.publicRepos || data.public_repos || 0) * 10;

  // Points for stars received (5 points each)
  const starsScore = (data.starsReceived || 0) * 5;

  return Math.round(Math.min(repoScore, 1000) + starsScore);
}


/**
 * Fetch GitHub user profile
 * @param {string} username - GitHub username
 * @returns {Object} - User profile data
 */
async function getGitHubProfile(username) {
  try {
    log.debug(`Fetching GitHub profile for user: ${username}`);

    // Check if we have a GitHub token configured
    if (
      !GITHUB_ACCESS_TOKEN ||
      GITHUB_ACCESS_TOKEN === "your_github_token_here"
    ) {
      log.warn(
        "GitHub API token not configured. API calls will be limited to 60 requests/hour.",
      );
    } else {
      log.debug("Using authenticated GitHub API request");
    }

    // Validate GitHub username format before making API call
    if (!isValidGitHubUsername(username)) {
      throw new Error(`Invalid GitHub username format: ${username}`);
    }

    // Use authenticated API call for user data
    const authHeader =
      GITHUB_ACCESS_TOKEN && GITHUB_ACCESS_TOKEN !== "your_github_token_here"
        ? { Authorization: `token ${GITHUB_ACCESS_TOKEN}` }
        : {};

    const userResponse = await http.get(
      `https://api.github.com/users/${username}`,
      {
        headers: {
          ...authHeader,
          Accept: "application/vnd.github.v3+json",
        },
        // Don't throw on 404, we'll handle it explicitly
        validateStatus: (status) => status === 200 || status === 404,
      },
    );

    // Check if user exists
    if (userResponse.status === 404) {
      log.debug(
        `GitHub API confirms user ${username} does not exist (404 status)`,
      );
      throw new Error(
        `User "${username}" not found on GitHub. Please verify the username is correct and the profile is public.`,
      );
    }

    // Track rate limits from response headers
    const rateLimit = {
      limit: parseInt(userResponse.headers["x-ratelimit-limit"] || "60"),
      remaining: parseInt(
        userResponse.headers["x-ratelimit-remaining"] || "0",
      ),
      reset: parseInt(userResponse.headers["x-ratelimit-reset"] || "0"),
    };

    log.debug(
      `GitHub API rate limit: ${rateLimit.remaining}/${rateLimit.limit} remaining`,
    );

    // Extract base user data
    const userData = userResponse.data;

    // Default values in case GraphQL fails
    let contributions = 0;
    let totalStars = 0;
    let followersCount = userData.followers || 0;
    let followingCount = userData.following || 0;

    // Get contributions and star count using GraphQL API
    if (
      GITHUB_ACCESS_TOKEN &&
      GITHUB_ACCESS_TOKEN !== "your_github_token_here"
    ) {
      log.debug(
        `Using GitHub GraphQL API to get contributions data for ${username}`,
      );

      const graphqlQuery = {
        query: `{
          user(login: "${username}") {
            contributionsCollection {
              contributionCalendar {
                totalContributions
              }
            }
            repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
              totalCount
              nodes {
                stargazerCount
              }
            }
            followers {
              totalCount
            }
            following {
              totalCount
            }
          }
        }`,
      };

      try {
        // Make the GraphQL request
        const graphqlResponse = await http.post(
          "https://api.github.com/graphql",
          graphqlQuery,
          {
            headers: {
              Authorization: `bearer ${GITHUB_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (
          graphqlResponse.data &&
          graphqlResponse.data.data &&
          graphqlResponse.data.data.user
        ) {
          const graphqlData = graphqlResponse.data.data.user;

          // Extract contributions
          if (
            graphqlData.contributionsCollection &&
            graphqlData.contributionsCollection.contributionCalendar
          ) {
            contributions =
              graphqlData.contributionsCollection.contributionCalendar
                .totalContributions || 0;
            log.debug(
              `GraphQL API: Found ${contributions} contributions for ${username}`,
            );
          }

          // Calculate total stars
          if (graphqlData.repositories && graphqlData.repositories.nodes) {
            totalStars = graphqlData.repositories.nodes.reduce(
              (sum, repo) => sum + (repo.stargazerCount || 0),
              0,
            );
            log.debug(
              `GraphQL API: Found ${totalStars} total stars for ${username}`,
            );
          }

          // Get followers and following counts
          if (graphqlData.followers) {
            followersCount = graphqlData.followers.totalCount;
          }

          if (graphqlData.following) {
            followingCount = graphqlData.following.totalCount;
          }
        }
      } catch (graphqlError) {
        log.error(
          `Error using GitHub GraphQL API: ${graphqlError.message}`,
        );
        log.warn("Using basic profile data from REST API as fallback");
        // We'll use the basic data from the REST API that we already have
      }
    } else {
      log.warn(
        "GitHub token not available - contribution data will be limited",
      );
    }

    // Calculate score using our scoring algorithm with the correct data structure
    const score = calculateGitHubScore({
      publicRepos: userData.public_repos || 0,
      starsReceived: totalStars || 0,
    });

    return {
      username,
      publicRepos: userData.public_repos || 0,
      totalCommits: contributions,
      followers: followersCount,
      following: followingCount,
      starsReceived: totalStars || 0,
      problemsSolved: 0, // GitHub doesn't solve coding problems, always 0
      score,
      lastUpdated: new Date(),
    };
  } catch (error) {
    log.error(`Error fetching GitHub profile for ${username}:`, error);

    // Check if error is due to rate limiting
    if (error.response && error.response.status === 403) {
      log.warn(`GitHub API rate limit exceeded. Try again later.`);
      throw new Error(
        `GitHub API rate limit exceeded. Please try again later.`,
      );
    }

    // Special handling for validation errors we introduced
    if (error.message.includes("Invalid GitHub username format")) {
      throw new Error(
        `Invalid GitHub username format: "${username}". GitHub usernames can only contain alphanumeric characters, hyphens and underscores.`,
      );
    }

    // Special formatting for not found errors
    if (error.message.includes("not found")) {
      throw new Error(
        `User "${username}" not found on GitHub. Please verify the username is correct and the profile is public.`,
      );
    }

    // Re-throw other errors
    throw new Error(`Failed to fetch GitHub profile: ${error.message}`);
  }
}


/**
 * Validate GitHub username format
 * @param {string} username - GitHub username to validate
 * @returns {boolean} - Whether the username is valid
 */
function isValidGitHubUsername(username) {
  // GitHub usernames must:
  // - Only contain alphanumeric characters, hyphens or underscores
  // - Not start with a hyphen or underscore
  // - Not have consecutive hyphens
  // - Be at most 39 characters long
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|_|-(?=[a-zA-Z0-9])){0,38}$/.test(
    username,
  );
}


module.exports = { fetchProfile: getGitHubProfile, calculateGitHubScore, isValidGitHubUsername };
