/**
 * Platform API Service
 * 
 * This service handles integration with various competitive programming platforms
 * to fetch user profiles, statistics, and calculate standardized scores.
 */
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config();
const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

// Platform-specific rate limiting settings
const platformRateLimits = {
  github: 1000,        // 1 request per second
  leetcode: 2000,      // 1 request per 2 seconds
  codeforces: 5000,    // 1 request per 5 seconds
  codechef: 6000,      // 1 request per 6 seconds
  geeksforgeeks: 2000, // 1 request per 2 seconds
  hackerrank: 1500     // 1 request per 1.5 seconds
};

// Track last request time per platform
const lastRequestByPlatform = {
  github: 0,
  leetcode: 0,
  codeforces: 0,
  codechef: 0,
  geeksforgeeks: 0,
  hackerrank: 0
};

// Track active requests per platform
const activeRequestsByPlatform = {
  github: 0,
  leetcode: 0,
  codeforces: 0,
  codechef: 0,
  geeksforgeeks: 0,
  hackerrank: 0
};

/**
 * Simple rate limiting function for platform API calls
 * @param {string} platform - Platform name
 * @param {boolean} wasRateLimited - Whether previous request was rate limited
 * @returns {Function} - Function to call when request is complete
 */
async function applyRateLimit(platform, wasRateLimited = false) {
  const now = Date.now();
  let requiredDelay = platformRateLimits[platform] || 1000;
  
  // Increase delay if rate limited
  if (wasRateLimited) {
    if (platform === 'codechef' || platform === 'codeforces') {
      requiredDelay = requiredDelay * 5;
      console.log(`⚠️ Using 5x backoff delay for ${platform}: ${requiredDelay}ms`);
    } else if (platform === 'leetcode') {
      requiredDelay = requiredDelay * 3;
      console.log(`⚠️ Using 3x backoff delay for ${platform}: ${requiredDelay}ms`);
    } else {
      requiredDelay = requiredDelay * 2;
    }
  }
  
  const timeSinceLastRequest = now - (lastRequestByPlatform[platform] || 0);
  
  // Wait if needed
  if (timeSinceLastRequest < requiredDelay) {
    const delayMs = requiredDelay - timeSinceLastRequest;
    console.log(`⏱ Waiting ${delayMs}ms before next ${platform} request`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  // Update last request time
  lastRequestByPlatform[platform] = Date.now();
  activeRequestsByPlatform[platform] = (activeRequestsByPlatform[platform] || 0) + 1;
  
  // Return function to call when request is complete
  return () => {
    activeRequestsByPlatform[platform] = Math.max(0, activeRequestsByPlatform[platform] - 1);
  };
}

class PlatformAPI {
  /**
   * Initialize the API client
   */
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Initialize rate limiting tracker for CodeChef
    this.lastCodeChefRequest = 0;
  }

  /**
   * Calculate normalized score for LeetCode profiles
   * @param {number} totalSolved - Total problems solved
   * @param {number} ranking - User's global ranking
   * @param {Object} difficulty - Problems solved by difficulty
   * @returns {number} - Calculated score
   */
  calculateLeetCodeScore(totalSolved, ranking, difficulty = {}) {
    // Points by difficulty:
    // Easy: 20 points
    // Medium: 40 points
    // Hard: 80 points
    const difficultyPoints = {
      easy: (difficulty.easy || 0) * 20,
      medium: (difficulty.medium || 0) * 40,
      hard: (difficulty.hard || 0) * 80
    };
    
    // Base score from all problems
    const baseScore = Object.values(difficultyPoints).reduce((a, b) => a + b, 0);
    
    // Ranking bonus (max 2000 points for top ranks)
    // Better ranks get exponentially more points
    const rankingBonus = ranking > 0 ? Math.max(0, 2000 * Math.exp(-ranking / 10000)) : 0;
    
    return Math.round(baseScore + rankingBonus);
  }

  /**
   * Calculate normalized score for Codeforces profiles
   * @param {number} rating - User's rating
   * @param {number} problemsSolved - Number of problems solved
   * @param {number} contestsParticipated - Number of contests participated
   * @returns {number} - Calculated score
   */
  calculateCodeforcesScore(rating, problemsSolved, contestsParticipated = 0) {
    // Rating has a significant impact, especially at higher levels
    // Rating above 1900 is considered expert level and above
    let ratingScore = 0;
    if (rating > 0) {
      if (rating < 1200) {
        ratingScore = rating * 0.2;
      } else if (rating < 1900) {
        ratingScore = 240 + (rating - 1200) * 0.5;
      } else if (rating < 2400) {
        ratingScore = 590 + (rating - 1900) * 0.8;
      } else {
        ratingScore = 990 + (rating - 2400) * 1.2;
      }
    }
    
    // Problems solved provides a base score
    const problemsScore = Math.min(problemsSolved * 20, 1000); // Cap at 1000 for problems
    
    // Contest participation shows commitment
    const contestScore = Math.min(contestsParticipated * 30, 600); // Cap at 600 for contests
    
    // Calculate the total score with a bias towards rating
    const rawScore = (ratingScore * 1.5) + problemsScore + contestScore;
    
    // Cap the score at 10000 and ensure it's an integer
    return Math.min(Math.round(rawScore), 10000);
  }

  /**
   * Calculate normalized score for CodeChef profiles
   * @param {number} rating - User's rating
   * @param {number} problemsSolved - Number of problems solved
   * @param {number} globalRank - User's global ranking
   * @param {number} contestsParticipated - Number of contests participated
   * @returns {number} - Calculated score
   */
  calculateCodeChefScore(rating, problemsSolved, globalRank, contestsParticipated = 0) {
    // Base rating score (max 3000)
    const ratingScore = rating ? Math.min(3000, rating) : 0;
    
    // Problems score based on difficulty
    let problemsScore = 0;
    if (problemsSolved > 0) {
      problemsScore = problemsSolved * 30;
    }
    
    // Rank bonus (max 1000 points, exponential decay)
    const rankBonus = globalRank > 0 ? Math.round(1000 * Math.exp(-globalRank / 10000)) : 0;
    
    // Contest participation bonus (50 points per contest, up to 1000 points)
    const contestsBonus = Math.min(1000, contestsParticipated * 50);
    
    return Math.round(ratingScore + problemsScore + rankBonus + contestsBonus);
  }

  /**
   * Calculate normalized score for GeeksforGeeks profiles
   * @param {number} codingScore - User's coding score
   * @param {number} problemsSolved - Number of problems solved
   * @param {number} instituteRank - User's institute ranking
   * @returns {number} - Calculated score
   */
  calculateGeeksforGeeksScore(codingScore, problemsSolved, instituteRank = 0) {
    // Base score from coding score (max 3000 points)
    // GeeksforGeeks coding score is typically between 0-1000
    const baseScore = Math.min(3000, codingScore * 3);
    
    // Problems solved score (max 5000 points)
    // Each problem is worth more points initially, but with diminishing returns
    const problemScore = Math.min(5000, problemsSolved * 50 * Math.exp(-problemsSolved / 100));
    
    // Institute rank bonus (max 2000 points)
    // Better ranks get exponentially more points
    const rankBonus = instituteRank > 0 
      ? Math.min(2000, 2000 * Math.exp(-instituteRank / 1000))
      : 0;
    
    // Total score (max 10000 points)
    return Math.round(baseScore + problemScore + rankBonus);
  }

  /**
   * Calculate normalized score for GitHub profiles
   * @param {number} stars - Total repository stars
   * @param {number} commits - Total commits
   * @param {number} followers - Number of followers
   * @returns {number} - Calculated score
   */
  calculateGitHubScore(stars, commits, followers) {
    // Stars have high weight as they indicate project quality
    const starsScore = stars * 10;
    
    // Commits show consistent contribution
    const commitsScore = commits * 5;
    
    // Followers indicate community impact
    const followersScore = followers * 2;
    
    return Math.round(starsScore + commitsScore + followersScore);
  }

  /**
   * Calculate normalized score for HackerRank profiles
   * @param {number} totalSolved - Total problems solved across all categories
   * @param {number} starsCount - Total stars earned across all badges
   * @returns {number} - Calculated score
   */
  calculateHackerRankScore(totalSolved, starsCount = 0) {
    // Base score from problems solved (max 5000 points)
    const problemsScore = Math.min(totalSolved * 50, 5000);
    
    // Bonus from stars earned across all badges (max 5000 points)
    // Each star is worth 100 points
    const starsScore = Math.min(starsCount * 100, 5000);
    
    // Total score (max 10000 points)
    return Math.round(problemsScore + starsScore);
  }

  /**
   * Fetch LeetCode user profile using the LeetCode Stats API
   * @param {string} username - LeetCode username
   * @returns {Object} - User profile data
   */
  async getLeetCodeProfile(username) {
    try {
      console.log(`Fetching LeetCode profile for user: ${username}`);
      
      // Use the LeetCode Stats API endpoint
      const apiUrl = `https://leetcode-stats-api.herokuapp.com/${username}`;
      console.log(`Making request to LeetCode Stats API: ${apiUrl}`);
      
      const response = await this.axiosInstance.get(apiUrl);
      
      // Check if request was successful
      if (response.data.status !== 'success') {
        throw new Error(`User ${username} not found on LeetCode or API response invalid`);
      }
      
      const data = response.data;
      console.log(`LeetCode Stats API data received for ${username}:`, {
        totalSolved: data.totalSolved,
        byDifficulty: {
          easy: data.easySolved,
          medium: data.mediumSolved,
          hard: data.hardSolved
        },
        ranking: data.ranking,
        contributionPoints: data.contributionPoints,
        reputation: data.reputation
      });
      
      // Map the difficulty data to our existing format
      const difficultyMap = {
        all: data.totalSolved || 0,
        easy: data.easySolved || 0,
        medium: data.mediumSolved || 0,
        hard: data.hardSolved || 0
      };
      
      // Calculate a score using our scoring algorithm
      const score = this.calculateLeetCodeScore(
        data.totalSolved, 
        data.ranking, 
        difficultyMap
      );
      
      return {
        username,
        problemsSolved: data.totalSolved || 0,
        ranking: data.ranking || 0,
        score,
        reputation: data.reputation || 0,
        starRating: 0, // Not provided by the new API
        easyProblemsSolved: data.easySolved || 0,
        mediumProblemsSolved: data.mediumSolved || 0,
        hardProblemsSolved: data.hardSolved || 0,
        contestsParticipated: 0, // Not provided by the new API
        rating: 0, // Not provided by the new API
        contestRanking: 0, // Not provided by the new API
        contestBadge: '', // Not provided by the new API
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching LeetCode profile for ${username}:`, error);
      throw new Error(`Failed to fetch LeetCode profile: ${error.message}`);
    }
  }

  /**
   * Fetch Codeforces user profile using official API
   * @param {string} username - Codeforces username
   * @returns {Object} - User profile data
   */
  async getCodeforcesProfile(username) {
    try {
      console.log(`Fetching Codeforces profile for user: ${username}`);
      
      // 1. Get basic user information from user.info API
      const userResponse = await this.axiosInstance.get(`https://codeforces.com/api/user.info?handles=${username}`, {
        validateStatus: status => (status >= 200 && status < 300) || status === 400
      });
      
      // Check if user exists
      if (userResponse.status === 400 || userResponse.data.status !== 'OK' || !userResponse.data.result || userResponse.data.result.length === 0) {
        console.log(`User ${username} not found on Codeforces (API response)`);
        throw new Error(`User ${username} not found on Codeforces`);
      }
      
      // Extract basic user data
      const userData = userResponse.data.result[0];
      console.log(`Retrieved basic Codeforces data for ${username}: rating=${userData.rating}, rank=${userData.rank}`);
      
      // 2. Get rating history to count contest participation
      const ratingResponse = await this.axiosInstance.get(`https://codeforces.com/api/user.rating?handle=${username}`);
      
      // Extract contests participated
      let contestsParticipated = 0;
      if (ratingResponse.data.status === 'OK') {
        contestsParticipated = ratingResponse.data.result.length;
        console.log(`${username} has participated in ${contestsParticipated} contests`);
      }
      
      // 3. Get submissions to count problems solved
      // Using count=10000 to handle users with many submissions
        const submissionsResponse = await this.axiosInstance.get(
          `https://codeforces.com/api/user.status?handle=${username}&from=1&count=10000`
        );
        
        // Process submissions to get unique solved problems
      let problemsSolved = 0;
      let easyProblemsSolved = 0;
      let mediumProblemsSolved = 0;
      let hardProblemsSolved = 0;
      let totalAcceptedSubmissions = 0;
      
      if (submissionsResponse.data.status === 'OK') {
        const submissions = submissionsResponse.data.result;
        
        // Create a set of unique problem IDs that were solved
        const solvedProblems = new Set();
        
        // Track problems by difficulty level (A, B, C, etc.)
        const problemsByIndex = {};
        
        submissions.forEach(sub => {
          // Only count if verdict is OK (accepted)
          if (sub.verdict === 'OK') {
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
        const easyIndices = ['A', 'B'];
        const mediumIndices = ['C', 'D'];
        const hardIndices = ['E', 'F', 'G', 'H', 'I', 'J', 'K'];
        
        easyProblemsSolved = Object.entries(problemsByIndex)
          .filter(([key]) => easyIndices.includes(key))
          .reduce((sum, [_, value]) => sum + value, 0);
          
        mediumProblemsSolved = Object.entries(problemsByIndex)
          .filter(([key]) => mediumIndices.includes(key))
          .reduce((sum, [_, value]) => sum + value, 0);
          
        hardProblemsSolved = Object.entries(problemsByIndex)
          .filter(([key]) => hardIndices.includes(key))
          .reduce((sum, [_, value]) => sum + value, 0);
        
        problemsSolved = solvedProblems.size;
        
        console.log(`${username} has solved ${problemsSolved} unique problems on Codeforces`);
        console.log(`Problem difficulty breakdown - Easy: ${easyProblemsSolved}, Medium: ${mediumProblemsSolved}, Hard: ${hardProblemsSolved}`);
      }
      
      // 4. Calculate score using our scoring algorithm
      const score = this.calculateCodeforcesScore(
        userData.rating || 0, 
        problemsSolved, 
        contestsParticipated
      );
      
      return {
        username,
        rating: userData.rating || 0,
        maxRating: userData.maxRating || 0,
        rank: userData.rank || 'unrated',
        problemsSolved,
        totalAcceptedSubmissions,
        easyProblemsSolved,
        mediumProblemsSolved,
        hardProblemsSolved,
        contestsParticipated,
        score,
        contribution: userData.contribution || 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching Codeforces profile for ${username}:`, error.message);
      
      // Provide specific error for not found users
      if (error.response?.status === 400 || error.message.includes('not found')) {
        throw new Error(`User ${username} not found on Codeforces`);
      }
      
      // Handle rate limiting
      if (error.response?.status === 503) {
        throw new Error(`Codeforces API rate limit exceeded. Please try again later.`);
      }
      
      // Re-throw other errors
      throw new Error(`Failed to fetch Codeforces profile: ${error.message}`);
    }
  }

  /**
   * Fetch CodeChef user profile
   * @param {string} username - CodeChef username
   * @returns {Object} - User profile data
   */
  async getCodeChefProfile(username) {
    try {
      console.log(`Fetching CodeChef profile for user: ${username}`);
      
      // Add rate limiting to reduce IP blocking risk
      const now = Date.now();
      if (this.lastCodeChefRequest && (now - this.lastCodeChefRequest < 2000)) {
        const delay = 2000 - (now - this.lastCodeChefRequest);
        console.log(`Rate limiting: Waiting ${delay}ms before CodeChef request`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      this.lastCodeChefRequest = Date.now();
      
      // Use axios with enhanced headers to appear more like a browser
      const profileUrl = `https://www.codechef.com/users/${username}`;
      const response = await this.axiosInstance.get(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'max-age=0',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://www.codechef.com/'
        },
        // Handle redirects and 404s
        maxRedirects: 5,
        validateStatus: status => status === 200
      });
      
      // Check if we were redirected away from the profile page
      const finalUrl = response.request.res.responseUrl;
      if (!finalUrl.includes(`/users/${username}`)) {
        console.log(`User ${username} not found on CodeChef - redirected to ${finalUrl}`);
        throw new Error(`User ${username} not found on CodeChef`);
      }
      
      // Load HTML content into cheerio for parsing
      const $ = cheerio.load(response.data);
      
      // Check if we're actually on a user profile page
      const usernameHeader = $('h1.h2-style, .user-details-container h1').text().trim();
      if (!usernameHeader || !$('.rating-number').length) {
        throw new Error(`User ${username} not found on CodeChef`);
      }
      
      // Extract data with multiple fallback selectors for robustness
      
      // 1. Extract rating - try multiple selectors
      let rating = 0;
      const ratingText = $('.rating-number').text().trim();
      if (ratingText) {
        const ratingMatch = ratingText.match(/(\d+)/);
        if (ratingMatch && ratingMatch[1]) {
          rating = parseInt(ratingMatch[1]);
        }
      }
      console.log(`CodeChef ${username} rating: ${rating}`);
      
      // 2. Extract global rank with fallbacks
        let globalRank = 0;
      $('.inline-list li, .user-details-container li').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
          if (text.includes('global rank')) {
          const rankMatch = text.match(/(\d+)/);
          if (rankMatch && rankMatch[1]) {
            globalRank = parseInt(rankMatch[1]);
          }
        }
      });
      console.log(`CodeChef ${username} global rank: ${globalRank}`);
        
      // 3. Extract problems solved with multiple approaches
        let problemsSolved = 0;
        
      // Approach 1: Direct h5 heading + next element
      $('h5, .h5-style').each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes('Fully Solved') || text.includes('Problems Solved')) {
          const next = $(el).next();
          if (next.length) {
            const problemsMatch = next.text().trim().match(/(\d+)/);
            if (problemsMatch && problemsMatch[1]) {
              problemsSolved = parseInt(problemsMatch[1]);
            }
          }
        }
      });
      
      // Approach 2: Look for problems-solved sections
        if (problemsSolved === 0) {
        $('.problems-solved, .rating-data-section').find('h5, .h5-style').each((_, el) => {
          const text = $(el).text().trim();
          if (text.includes('Fully Solved') || text.includes('Problems Solved')) {
            const parentDiv = $(el).parent();
            const problemsText = parentDiv.text().replace(text, '').trim();
            const problemsMatch = problemsText.match(/(\d+)/);
            if (problemsMatch && problemsMatch[1]) {
              problemsSolved = parseInt(problemsMatch[1]);
            }
          }
        });
      }
      
      // Approach 3: Full text search - last resort
      if (problemsSolved === 0) {
        const fullText = $('body').text();
        const matches = fullText.match(/Fully Solved\s*:?\s*(\d+)/i) || 
                        fullText.match(/Problems Solved\s*:?\s*(\d+)/i);
        if (matches && matches[1]) {
          problemsSolved = parseInt(matches[1]);
        }
      }
      console.log(`CodeChef ${username} problems solved: ${problemsSolved}`);
      
      // 4. Extract contests participated by counting rating history entries
        let contestsParticipated = 0;

      // Log the HTML of rating table for debugging
      console.log(`Looking for contest participation data for ${username}`);

      // First approach: Count rows in rating table
      $('.rating-table tbody tr, table.dataTable tbody tr').each((_, el) => {
        // Only count if it looks like a contest row (has rating data)
        const rowText = $(el).text().trim();
        if (rowText.includes('Rated') || /\d+\s*→\s*\d+/.test(rowText)) {
          contestsParticipated++;
        }
      });

      // Second approach: Look for contests participated count in profile details
        if (contestsParticipated === 0) {
        $('.contest-participated-count, .rating-data-section strong, .user-details-container strong').each((_, el) => {
          const text = $(el).text().trim();
          const parentText = $(el).parent().text().trim().toLowerCase();
          
          // Check if this is the contests element
          if ((parentText.includes('contest') && parentText.includes('participated')) || 
              (text.match(/^\d+$/) && parentText.includes('contest'))) {
            const matches = text.match(/\d+/);
            if (matches) {
              contestsParticipated = parseInt(matches[0]);
              console.log(`Found contest count in profile details: ${contestsParticipated}`);
            }
          }
        });
      }

      // Third approach: Look in section headings and nearby elements
      if (contestsParticipated === 0) {
        $('h3, h4, h5, .h3-style, .h4-style, .h5-style').each((_, el) => {
          const headingText = $(el).text().trim().toLowerCase();
          
          if (headingText.includes('contest') || headingText.includes('rating history')) {
            // Check if the heading itself contains a number
            const headingMatch = headingText.match(/(\d+)\s+contest/i);
            if (headingMatch && headingMatch[1]) {
              contestsParticipated = parseInt(headingMatch[1]);
              console.log(`Found contest count in heading: ${contestsParticipated}`);
            } else {
              // Look in nearby elements
              const parentDiv = $(el).parent();
              const siblingText = parentDiv.text().replace(headingText, '').trim();
              const siblingMatch = siblingText.match(/(\d+)\s+contest/i) || 
                                   siblingText.match(/participated\s+in\s+(\d+)/i);
              
              if (siblingMatch && siblingMatch[1]) {
                contestsParticipated = parseInt(siblingMatch[1]);
                console.log(`Found contest count near heading: ${contestsParticipated}`);
              }
            }
          }
        });
      }

      // Fourth approach: Parse the full page text as a last resort
      if (contestsParticipated === 0) {
        const fullText = $('body').text();
        
        // Try multiple patterns for robustness
        const patterns = [
          /participated\s+in\s+(\d+)\s+contests/i,
          /(\d+)\s+contests?\s+participated/i,
          /contests?\s+participated\s*:?\s*(\d+)/i,
          /rating\s+history\s*\(\s*(\d+)\s*\)/i
        ];
        
        for (const pattern of patterns) {
          const matches = fullText.match(pattern);
          if (matches && matches[1]) {
            contestsParticipated = parseInt(matches[1]);
            console.log(`Found contest count in full text: ${contestsParticipated}`);
            break;
          }
        }
      }

      // If no contest data found, try to find any data tables that might contain contests
      if (contestsParticipated === 0) {
        const tableCount = $('table').length;
        console.log(`Found ${tableCount} tables on the page`);
        
        // Check tables that might be contest tables
        $('table').each((i, table) => {
          const tableHeading = $(table).prev('h3, h4, h5, .h3-style, .h4-style, .h5-style').text().toLowerCase();
          const tableCaption = $(table).find('caption').text().toLowerCase();
          
          // If the table is likely a contest table, count its rows
          if (tableHeading.includes('contest') || tableHeading.includes('rating') || 
              tableCaption.includes('contest') || tableCaption.includes('rating')) {
            let rowCount = 0;
            $(table).find('tbody tr').each((_, row) => {
              rowCount++;
            });
            
            if (rowCount > 0) {
              console.log(`Table ${i+1} appears to be a contest table with ${rowCount} rows`);
              contestsParticipated = rowCount;
            }
          }
        });
      }

      console.log(`Final CodeChef ${username} contests participated: ${contestsParticipated}`);
      
      // 5. Extract stars if available
      let stars = 0;
      $('.rating-star').each((_, el) => {
        stars++;
      });
      
      // 6. Calculate score
      const score = this.calculateCodeChefScore(
          rating,
          problemsSolved,
        globalRank, 
          contestsParticipated
      );
      
      return {
        username,
        rating,
        global_rank: globalRank,
        problemsSolved,
        contestsParticipated,
        stars,
        score,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching CodeChef profile for ${username}:`, error);
      
      // Standardize error message
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error(`User ${username} not found on CodeChef`);
      }
      
      // Network error handling
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        throw new Error(`CodeChef request timed out. The service may be temporarily unavailable.`);
      }
      
      throw new Error(`Failed to fetch CodeChef profile: ${error.message}`);
    }
  }

  /**
   * Fetch GeeksforGeeks user profile using the GeeksforGeeks API
   * @param {string} username - GeeksforGeeks username
   * @returns {Object} - User profile data
   */
  async getGeeksforGeeksProfile(username) {
    try {
      console.log(`Fetching GeeksforGeeks profile for user: ${username}`);
      
      // Use the new GeeksforGeeks API endpoint
      const apiUrl = `https://geeks-for-geeks-api.vercel.app/${username}`;
      console.log(`Making request to GFG API: ${apiUrl}`);
      
      const response = await this.axiosInstance.get(apiUrl);
      
      // Check if response has valid data
      if (!response.data || !response.data.info) {
        throw new Error(`User ${username} not found on GeeksforGeeks or API response invalid`);
      }
      
      // Extract user info and solved stats from API response
      const { info, solvedStats } = response.data;
      
      console.log(`GFG API data received for ${username}:`, {
        codingScore: info.codingScore,
        totalProblemsSolved: info.totalProblemsSolved,
        instituteRank: info.instituteRank,
        availableDifficulties: solvedStats ? Object.keys(solvedStats) : []
      });
      
      // Calculate total problems by difficulty levels
      const easyProblemsSolved = solvedStats.easy?.count || 0;
      const mediumProblemsSolved = solvedStats.medium?.count || 0;
      const hardProblemsSolved = solvedStats.hard?.count || 0;
      const basicProblemsSolved = solvedStats.basic?.count || 0;
      const schoolProblemsSolved = solvedStats.school?.count || 0;
      
      // Verify if total problems solved matches the sum of individual categories
      const totalByCategories = easyProblemsSolved + mediumProblemsSolved + hardProblemsSolved + basicProblemsSolved + schoolProblemsSolved;
      const problemsSolved = info.totalProblemsSolved || totalByCategories;
      
      console.log(`GFG API data for ${username}:`, {
        codingScore: info.codingScore,
        totalProblems: problemsSolved,
        byDifficulty: {
          easy: easyProblemsSolved,
          medium: mediumProblemsSolved,
          hard: hardProblemsSolved,
          basic: basicProblemsSolved,
          school: schoolProblemsSolved
        },
        instituteRank: info.instituteRank,
        currentStreak: info.currentStreak,
        maxStreak: info.maxStreak,
        monthlyScore: info.monthlyScore
      });
      
      // Calculate total score using our scoring algorithm
      const score = this.calculateGeeksforGeeksScore(info.codingScore, problemsSolved, info.instituteRank);

      // Determine rank based on score
      const rank = this.getGeeksforGeeksRank(score);

      return {
        username,
        codingScore: info.codingScore || 0,
        problemsSolved,
        instituteRank: info.instituteRank || 0,
        currentStreak: info.currentStreak || 0,
        maxStreak: info.maxStreak || 0,
        easyProblemsSolved,
        mediumProblemsSolved,
        hardProblemsSolved,
        basicProblemsSolved,
        schoolProblemsSolved,
        contestsParticipated: 0, // Not available in the API
        contestRating: 0, // Not available in the API
        monthlyScore: info.monthlyScore || 0,
        score,
        rank,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching GeeksforGeeks profile for ${username}:`, error);
      
      if (error.message.includes('not found')) {
        throw new Error(`User ${username} not found on GeeksforGeeks`);
      }
      
      throw new Error(`Failed to fetch GeeksforGeeks profile: ${error.message}`);
    }
  }

  /**
   * Get the rank title for a GeeksforGeeks score
   * @param {number} score - GeeksforGeeks score
   * @returns {string} - Rank title
   */
  getGeeksforGeeksRank(score) {
    if (score >= 8000) return 'Code Grandmaster';
    if (score >= 6000) return 'Code Master';
    if (score >= 4000) return 'Code Expert';
    if (score >= 2000) return 'Code Ninja';
    if (score >= 1000) return 'Code Warrior';
    return 'Code Enthusiast';
  }

  /**
   * Fetch GitHub user profile
   * @param {string} username - GitHub username
   * @returns {Object} - User profile data
   */
  async getGitHubProfile(username) {
    try {
      console.log(`Fetching GitHub profile for user: ${username}`);
      
      // Check if we have a GitHub token configured
      if (!GITHUB_ACCESS_TOKEN || GITHUB_ACCESS_TOKEN === 'your_github_token_here') {
        console.warn('GitHub API token not configured. API calls will be limited to 60 requests/hour.');
      } else {
        console.log('Using authenticated GitHub API request');
      }
      
      // Use authenticated API call for user data
      const authHeader = GITHUB_ACCESS_TOKEN && GITHUB_ACCESS_TOKEN !== 'your_github_token_here' 
        ? { 'Authorization': `token ${GITHUB_ACCESS_TOKEN}` } 
        : {};
        
      const userResponse = await this.axiosInstance.get(`https://api.github.com/users/${username}`, {
          headers: {
          ...authHeader,
            'Accept': 'application/vnd.github.v3+json'
          },
          // Don't throw on 404, we'll handle it explicitly
          validateStatus: status => status === 200 || status === 404
        });
        
      // Check if user exists
      if (userResponse.status === 404) {
          console.log(`GitHub API confirms user ${username} does not exist (404 status)`);
          throw new Error(`User ${username} not found on GitHub`);
        }
        
      // Track rate limits from response headers
      const rateLimit = {
        limit: parseInt(userResponse.headers['x-ratelimit-limit'] || '60'),
        remaining: parseInt(userResponse.headers['x-ratelimit-remaining'] || '0'),
        reset: parseInt(userResponse.headers['x-ratelimit-reset'] || '0')
      };
      
      console.log(`GitHub API rate limit: ${rateLimit.remaining}/${rateLimit.limit} remaining`);
      
      // Extract base user data
      const userData = userResponse.data;
      
      // Default values in case GraphQL fails
      let contributions = 0;
      let totalStars = 0;
      let followersCount = userData.followers || 0;
      let followingCount = userData.following || 0;
      
      // Get contributions and star count using GraphQL API
      if (GITHUB_ACCESS_TOKEN && GITHUB_ACCESS_TOKEN !== 'your_github_token_here') {
        console.log(`Using GitHub GraphQL API to get contributions data for ${username}`);
        
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
          }`
        };
        
        try {
          // Make the GraphQL request
          const graphqlResponse = await this.axiosInstance.post(
            'https://api.github.com/graphql',
            graphqlQuery,
            {
              headers: {
                'Authorization': `bearer ${GITHUB_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (graphqlResponse.data && graphqlResponse.data.data && graphqlResponse.data.data.user) {
            const graphqlData = graphqlResponse.data.data.user;
            
            // Extract contributions
            if (graphqlData.contributionsCollection && 
                graphqlData.contributionsCollection.contributionCalendar) {
              contributions = graphqlData.contributionsCollection.contributionCalendar.totalContributions || 0;
              console.log(`GraphQL API: Found ${contributions} contributions for ${username}`);
            }
            
            // Calculate total stars
            if (graphqlData.repositories && graphqlData.repositories.nodes) {
              totalStars = graphqlData.repositories.nodes.reduce(
                (sum, repo) => sum + (repo.stargazerCount || 0), 0
              );
              console.log(`GraphQL API: Found ${totalStars} total stars for ${username}`);
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
          console.error(`Error using GitHub GraphQL API: ${graphqlError.message}`);
          console.warn('Using basic profile data from REST API as fallback');
          // We'll use the basic data from the REST API that we already have
        }
      } else {
        console.warn('GitHub token not available - contribution data will be limited');
      }
      
      // Calculate score using our scoring algorithm
      const score = this.calculateGitHubScore(
        totalStars || userData.public_repos || 0,
        contributions,
        followersCount
      );
      
      return {
        username,
        publicRepos: userData.public_repos || 0,
        totalCommits: contributions,
        followers: followersCount,
        following: followingCount,
        starsReceived: totalStars || userData.public_repos || 0, // Use GraphQL star count if available
        problemsSolved: contributions, // Using contributions as problems solved
        score,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching GitHub profile for ${username}:`, error);
      
      // Check if error is due to rate limiting
      if (error.response && error.response.status === 403) {
        console.warn(`GitHub API rate limit exceeded. Try again later.`);
      }
      
      // Special formatting for not found errors
      if (error.message.includes('not found')) {
        throw new Error(`User ${username} not found on GitHub`);
      }
      
      // Re-throw other errors
      throw new Error(`Failed to fetch GitHub profile: ${error.message}`);
    }
  }

  /**
   * Fetch HackerRank user profile using direct REST API
   * @param {string} username - HackerRank username
   * @returns {Object} - User profile data
   */
  async getHackerRankProfile(username) {
    try {
      console.log(`Fetching HackerRank profile for user: ${username}`);
      
      // Make a direct request to the badges API endpoint
      const response = await this.axiosInstance.get(`https://www.hackerrank.com/rest/hackers/${username}/badges`, {
        headers: {
          'Accept': 'application/json'
        },
        // Don't throw on 404, we'll handle it explicitly
        validateStatus: status => (status >= 200 && status < 300) || status === 404
      });
      
      // Check if the request was successful
      if (response.status === 404 || !response.data || response.data.status !== true) {
        throw new Error(`User ${username} not found on HackerRank`);
      }
      
      const badgesData = response.data.models || [];
      
      // Calculate total problems solved by summing up all badges
      let totalProblemsSolved = 0;
      let totalStars = 0;
      let languageBadges = {};
      let skillBadges = {};
      
      // Process each badge/category
      badgesData.forEach(badge => {
        // Sum up problems solved
        totalProblemsSolved += badge.solved || 0;
        
        // Sum up stars earned
        totalStars += badge.stars || 0;
        
        // Categorize badges
        if (badge.category_name === "Language Proficiency") {
          languageBadges[badge.badge_name] = {
            solved: badge.solved || 0,
            stars: badge.stars || 0,
            total_challenges: badge.total_challenges || 0
          };
        } else if (badge.category_name === "Specialized Skills") {
          skillBadges[badge.badge_name] = {
            solved: badge.solved || 0,
            stars: badge.stars || 0,
            total_challenges: badge.total_challenges || 0
          };
        }
      });
      
      // Calculate score based on problems solved and stars earned
      const score = this.calculateHackerRankScore(totalProblemsSolved, totalStars);
      
      return {
        username,
        problemsSolved: totalProblemsSolved,
        totalStars,
        languageBadges,
        skillBadges,
        score,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching HackerRank profile for ${username}:`, error);
      
      if (error.message.includes('not found')) {
        throw new Error(`User ${username} not found on HackerRank`);
      }
      
      throw new Error(`Failed to fetch HackerRank profile: ${error.message}`);
    }
  }

  /**
   * Get user profile data for a specific platform
   * @param {string} platform - Platform name (leetcode, codeforces, etc.)
   * @param {string} username - Username on the platform
   * @returns {Object} - User profile data
   */
  async getProfileData(platform, username) {
    try {
      let profileData;
      
      switch (platform.toLowerCase()) {
        case 'leetcode':
          profileData = await this.getLeetCodeProfile(username);
          break;
        case 'codeforces':
          profileData = await this.getCodeforcesProfile(username);
          break;
        case 'codechef':
          profileData = await this.getCodeChefProfile(username);
          break;
        case 'geeksforgeeks':
          profileData = await this.getGeeksforGeeksProfile(username);
          break;
        case 'hackerrank':
          profileData = await this.getHackerRankProfile(username);
          break;
        case 'github':
          profileData = await this.getGitHubProfile(username);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Ensure required fields have default values
      profileData.problemsSolved = profileData.problemsSolved || 0;
      profileData.score = profileData.score || 0;
      profileData.rating = profileData.rating || 0;
      profileData.rank = profileData.rank || 'unrated';

      return profileData;
    } catch (error) {
      console.error(`Error in getProfileData for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Public method to get user profile by platform
   * @param {string} platform - Platform name
   * @param {string} username - Username on the platform
   * @returns {Object} - User profile data
   */
  async getProfileByPlatform(platform, username) {
    // Skip if username is empty
    if (!username || username.trim() === '') {
      throw new Error(`No username provided for ${platform}`);
    }
    
    console.log(`Fetching ${platform} profile for user: ${username}`);
    
    // Default to no rate limiting
    let wasRateLimited = false;
    
    // Track the start time for performance monitoring
    const startTime = Date.now();
    
    try {
      // Apply rate limiting - use the new version that returns a cleanup function
      const releaseRateLimit = await applyRateLimit(platform, wasRateLimited);
      
      // Retry logic for handling rate limits and server errors
      const MAX_RETRIES = platform === 'leetcode' ? 2 : 1; // More retries for LeetCode due to 500 errors
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount <= MAX_RETRIES) {
        try {
          let data;
          
          // Get profile data based on platform
          switch (platform) {
            case 'leetcode':
              data = await this.getLeetCodeProfile(username);
              break;
            case 'codeforces':
              data = await this.getCodeforcesProfile(username);
              break;
            case 'codechef':
              data = await this.getCodeChefProfile(username);
              break;
            case 'geeksforgeeks':
              data = await this.getGeeksforGeeksProfile(username);
              break;
            case 'hackerrank':
              data = await this.getHackerRankProfile(username);
              break;
            case 'github':
              data = await this.getGitHubProfile(username);
              break;
            default:
              throw new Error(`Unsupported platform: ${platform}`);
          }
          
          // Release the rate limit token
          if (typeof releaseRateLimit === 'function') {
            releaseRateLimit();
          }
          
          // Calculate elapsed time
          const elapsed = Date.now() - startTime;
          console.log(`✅ Successfully fetched ${platform} profile for ${username} in ${elapsed}ms`);
          
          return data;
        } catch (error) {
          lastError = error;
          
          // Handle different types of errors
          if (error.response) {
            const statusCode = error.response.status;
            
            // Handle rate limiting
            if (statusCode === 429) {
              wasRateLimited = true;
              console.error(`⚠️ Rate limited on ${platform} for ${username} (429). Retry ${retryCount + 1}/${MAX_RETRIES + 1}`);
              
              // Exponential backoff for rate limits
              const backoffTime = 2000 * Math.pow(4, retryCount); // 2s, 8s, 32s...
              await new Promise(resolve => setTimeout(resolve, backoffTime));
            } 
            // Handle server errors (especially for LeetCode)
            else if (statusCode >= 500) {
              console.error(`⚠️ Server error on ${platform} for ${username} (${statusCode}). Retry ${retryCount + 1}/${MAX_RETRIES + 1}`);
              
              // Use a shorter backoff for server errors
              const backoffTime = 3000 * Math.pow(2, retryCount); // 3s, 6s, 12s...
              await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
            // For other errors, don't retry
            else {
              // Release the rate limit token
              if (typeof releaseRateLimit === 'function') {
                releaseRateLimit();
              }
              throw error;
            }
          } else {
            // For network errors, retry once with backoff
            if (retryCount < 1) {
              console.error(`⚠️ Network error on ${platform} for ${username}. Retrying once.`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
              // Release the rate limit token
              if (typeof releaseRateLimit === 'function') {
                releaseRateLimit();
              }
              throw error;
            }
          }
          
          retryCount++;
        }
      }
      
      // If we've exhausted all retries, throw the last error
      // Release the rate limit token
      if (typeof releaseRateLimit === 'function') {
        releaseRateLimit();
      }
      
      console.error(`❌ Failed to fetch ${platform} profile for ${username} after ${MAX_RETRIES + 1} attempts`);
      throw lastError;
    } catch (error) {
      // Track the error for monitoring
      const elapsed = Date.now() - startTime;
      console.error(`❌ Error fetching ${platform} profile for ${username} after ${elapsed}ms: ${error.message}`);
      
      // Add platform-specific information to the error
      error.platform = platform;
      error.username = username;
      error.elapsedMs = elapsed;
      
      throw error;
    }
  }
}

module.exports = new PlatformAPI();
module.exports = new PlatformAPI();