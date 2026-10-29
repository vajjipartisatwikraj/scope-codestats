/**
 * CodeChef scraper
 *
 * Fetches a public profile and returns a flat object that maps onto the Profile
 * model (score, problemsSolved, rating, ...). Throws on failure; callers classify
 * the error with ./errors.
 */
const http = require("./http");
const cheerio = require("cheerio");
const log = require("../../utils/logger").scope("CODECHEF");

// Minimum spacing between CodeChef requests, shared across calls.
const rateState = { lastRequest: 0 };

/**
 * Calculate normalized score for CodeChef profiles
 * @param {number} rating - User's rating
 * @param {number} problemsSolved - Number of problems solved
 * @param {number} globalRank - User's global ranking
 * @param {number} contestsParticipated - Number of contests participated
 * @returns {number} - Calculated score
 */
function calculateCodeChefScore(
  rating,
  problemsSolved,
  globalRank,
  contestsParticipated = 0,
) {
  // Formula: (CCPS*2 + (CCR-1200)²/10 + CCNC*50)
  // Where CCPS = Problems solved, CCR = Rating, CCNC = Number of contests participated

  // Problems solved component
  const problemsScore = problemsSolved * 0.5;

  // Rating component - only considered if participated in at least 3 contests and rating > 1200
  let ratingScore = 0;
  if (contestsParticipated >= 3 && rating > 1100) {
    ratingScore = Math.pow(rating - 1100, 2) / 30;
  }

  // Contests participated component
  const contestsScore = contestsParticipated * 50;

  // Calculate total score
  const score = problemsScore + ratingScore + contestsScore;

  return Math.round(score);
}


/**
 * Fetch CodeChef user profile
 * @param {string} username - CodeChef username
 * @returns {Object} - User profile data
 */
async function getCodeChefProfile(username) {
  try {
    log.debug(`Fetching CodeChef profile for user: ${username}`);

    // Add rate limiting to reduce IP blocking risk
    const now = Date.now();
    if (rateState.lastRequest && now - rateState.lastRequest < 2000) {
      const delay = 2000 - (now - rateState.lastRequest);
      log.debug(
        `Rate limiting: Waiting ${delay}ms before CodeChef request`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    rateState.lastRequest = Date.now();

    // Use axios with enhanced headers to appear more like a browser
    const profileUrl = `https://www.codechef.com/users/${username}`;
    const response = await http.get(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "max-age=0",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        Referer: "https://www.codechef.com/",
      },
      // Handle redirects and 404s
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Load HTML content into cheerio for parsing
    const $ = cheerio.load(response.data);

    // More flexible way to check if we're on a valid profile page
    // Look for typical profile elements that should be present on ANY user page
    const profileContent =
      $(".user-details-container").length ||
      $(".rating-header").length ||
      $(".rating-number").length ||
      $("section.user-details").length;

    if (!profileContent) {
      log.debug(
        `No profile content found for user ${username} on CodeChef`,
      );

      // Check if we're seeing a login page or error page
      const isLoginPage =
        $("body").text().includes("Login") &&
        $("body").text().includes("Forgot Password");
      const isErrorPage =
        $("body").text().includes("Oops") &&
        $("body").text().includes("Error");

      if (isLoginPage) {
        throw new Error(
          `Unable to access CodeChef profile for ${username}. The site may be requiring login.`,
        );
      } else if (isErrorPage) {
        throw new Error(
          `CodeChef returned an error for the profile ${username}. The user may not exist.`,
        );
      } else {
        throw new Error(
          `User ${username} not found on CodeChef or the profile format has changed`,
        );
      }
    }

    // Check if we see actual username on the page
    const usernameOnPage = $(
      "h1.h2-style, .user-details-container h1, .m-username, section.user-details h2",
    )
      .text()
      .trim();
    log.debug(`Username found on page: ${usernameOnPage}`);

    // 1. Extract rating - try multiple selectors
    let rating = 0;
    const ratingText = $(".rating-number").text().trim();
    if (ratingText) {
      const ratingMatch = ratingText.match(/(\d+)/);
      if (ratingMatch && ratingMatch[1]) {
        rating = parseInt(ratingMatch[1]);
      }
    }
    log.debug(`CodeChef ${username} rating: ${rating}`);

    // 2. Extract global rank with fallbacks
    let globalRank = 0;
    $(".inline-list li, .user-details-container li").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text.includes("global rank")) {
        const rankMatch = text.match(/(\d+)/);
        if (rankMatch && rankMatch[1]) {
          globalRank = parseInt(rankMatch[1]);
        }
      }
    });
    log.debug(`CodeChef ${username} global rank: ${globalRank}`);

    // 3. Extract problems solved with multiple approaches
    let problemsSolved = 0;

    // Approach 1: Check multiple selectors for problems solved information
    const problemSelectors = [
      ".problems-solved h5, .problems-solved .h5-style",
      ".rating-data-section h5, .rating-data-section .h5-style",
      ".problems-solved-container h5, .problems-solved-container .h5-style",
      ".rating-data-section strong",
      ".user-details-container strong",
      ".problems-solved-count",
    ];

    for (const selector of problemSelectors) {
      $(selector).each((_, el) => {
        const elementText = $(el).text().trim();
        const parentText = $(el).parent().text().trim();

        if (
          elementText.includes("Fully Solved") ||
          elementText.includes("Problems Solved")
        ) {
          // Try to find the number in the element or its parent
          const fullText = parentText || elementText;
          const problemsMatch = fullText.match(/(\d+)\s*(problem|fully)/i);

          if (problemsMatch && problemsMatch[1]) {
            problemsSolved = parseInt(problemsMatch[1]);
            log.debug(
              `Found problems solved (${problemsSolved}) in selector: ${selector}`,
            );
            return false; // Break the each loop
          }
        }
      });

      if (problemsSolved > 0) break; // Stop if we found a value
    }

    // Approach 2: Full text search as fallback
    if (problemsSolved === 0) {
      const fullText = $("body").text();
      const problemPatterns = [
        /Fully Solved\s*:?\s*(\d+)/i,
        /Problems Solved\s*:?\s*(\d+)/i,
        /(\d+)\s+problems?\s+solved/i,
        /solved\s+(\d+)\s+problems?/i,
      ];

      for (const pattern of problemPatterns) {
        const matches = fullText.match(pattern);
        if (matches && matches[1]) {
          problemsSolved = parseInt(matches[1]);
          log.debug(
            `Found problems solved (${problemsSolved}) using text pattern`,
          );
          break;
        }
      }
    }
    log.debug(`CodeChef ${username} problems solved: ${problemsSolved}`);

    // 4. Extract contests participated by counting rating history entries
    let contestsParticipated = 0;

    // Approach 1: Direct h5 heading + next element for contests participated
    $("h5, .h5-style").each((_, el) => {
      const text = $(el).text().trim();
      if (
        text.includes("Contest Participated") ||
        text.includes("Contests Participated")
      ) {
        const next = $(el).next();
        if (next.length) {
          const contestsMatch = next.text().trim().match(/(\d+)/);
          if (contestsMatch && contestsMatch[1]) {
            contestsParticipated = parseInt(contestsMatch[1]);
          }
        }
      }
    });

    // Approach 2: Check specific selectors for contest participation count (from Important.txt)
    if (contestsParticipated === 0) {
      $(
        ".contest-participated-count, .rating-data-section strong, .user-details-container strong",
      ).each((_, el) => {
        const text = $(el).text().trim();
        const parentText = $(el).parent().text().trim().toLowerCase();

        // Check if this is the contests element
        if (
          (parentText.includes("contest") &&
            parentText.includes("participated")) ||
          (text.match(/^\d+$/) && parentText.includes("contest"))
        ) {
          const matches = text.match(/\d+/);
          if (matches) {
            contestsParticipated = parseInt(matches[0]);
            log.debug(
              `Found contest count in profile details: ${contestsParticipated}`,
            );
          }
        }
      });
    }

    // Approach 3: Count rows in rating table as fallback
    if (contestsParticipated === 0) {
      $(".rating-table tbody tr").each(() => {
        contestsParticipated++;
      });
    }

    log.debug(
      `Final CodeChef ${username} contests participated: ${contestsParticipated}`,
    );

    // 5. Extract stars if available
    let stars = 0;
    $(".rating-star, span.star").each((_, el) => {
      stars++;
    });

    // Alternative method to find stars from text if no star elements found
    if (stars === 0) {
      const starText =
        $(".rating-header").text() || $(".user-details-container").text();
      const starMatch = starText.match(/(\d+)\s*(?:★|star)/i);
      if (starMatch && starMatch[1]) {
        stars = parseInt(starMatch[1]);
      }
    }

    // If we haven't found any profile data, something is wrong
    if (
      rating === 0 &&
      globalRank === 0 &&
      problemsSolved === 0 &&
      contestsParticipated === 0
    ) {
      log.debug(`No meaningful profile data found for ${username}`);
      // Just return minimal data rather than throwing an error, as the profile does exist
      return {
        username,
        rating: 0,
        global_rank: 0,
        problemsSolved: 0,
        contestsParticipated: 0,
        stars: 0,
        score: 0,
        lastUpdated: new Date(),
      };
    }

    // 6. Calculate score
    const score = calculateCodeChefScore(
      rating,
      problemsSolved,
      globalRank,
      contestsParticipated,
    );

    return {
      username,
      rating,
      global_rank: globalRank,
      problemsSolved,
      contestsParticipated,
      stars,
      score,
      lastUpdated: new Date(),
    };
  } catch (error) {
    log.error(`Error fetching CodeChef profile for ${username}:`, error);

    // Standardize error message
    if (
      error.message.includes("not found") ||
      error.message.includes("does not exist")
    ) {
      throw new Error(`User ${username} not found on CodeChef`);
    }

    // Network error handling
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.message.includes("timeout")
    ) {
      throw new Error(
        `CodeChef request timed out. The service may be temporarily unavailable.`,
      );
    }

    throw new Error(`Failed to fetch CodeChef profile: ${error.message}`);
  }
}


module.exports = { fetchProfile: getCodeChefProfile, calculateCodeChefScore };
