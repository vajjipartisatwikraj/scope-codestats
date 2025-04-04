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
  calculateLeetCodeScore(totalSolved, ranking, difficulty = {}, contestsParticipated = 0) {
    // New formula: (LCPS*10 + (LCR-1300)^2/10 + LCNC*50)
    // Where LCPS = Problems solved, LCR = Rating, LCNC = Number of contests participated
    
    // Use total solved problems
    const problemsScore = totalSolved * 10;
    
    // For LeetCode, we often don't have a direct "rating" value, 
    // so we'll use ranking if available (inverted since lower rank is better)
    let ratingScore = 0;
    if (ranking > 0) {
      // We don't have LeetCode rating directly, so we'll approximate based on ranking
      // Assuming 3000 - ranking/100 as an approximation for rating
      const approximatedRating = Math.max(1300, 3000 - ranking/100);
      ratingScore = Math.pow(approximatedRating - 1300, 2) / 10;
    }
    
    // Contests score
    const contestsScore = contestsParticipated * 50;
    
    // Calculate total score
    const score = problemsScore + ratingScore + contestsScore;
    
    return Math.round(score);
  }

  /**
   * Calculate normalized score for Codeforces profiles
   * @param {number} rating - User's rating
   * @param {number} problemsSolved - Number of problems solved
   * @param {number} contestsParticipated - Number of contests participated
   * @returns {number} - Calculated score
   */
  calculateCodeforcesScore(rating, problemsSolved, contestsParticipated = 0) {
    // New formula: (CFPS*2 + (CFR-800)^2/10 + CFNC*50)
    // Where CFPS = Problems solved, CFR = Rating, CFNC = Number of contests participated
    
    // Problems solved component
    const problemsScore = problemsSolved * 2;
    
    // Rating component - only if the user has a rating
    let ratingScore = 0;
    if (rating > 0) {
      ratingScore = Math.pow(Math.max(0, rating - 800), 2) / 10;
    }
    
    // Contests participated component
    const contestsScore = contestsParticipated * 50;
    
    // Calculate total score
    const score = problemsScore + ratingScore + contestsScore;
    
    return Math.round(score);
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
    // New formula: (CCPS*2 + (CCR-1200)^2/10 + CCNC*50)
    // Where CCPS = Problems solved, CCR = Rating, CCNC = Number of contests participated
    
    // Problems solved component
    const problemsScore = problemsSolved * 2;
    
    // Rating component - only if the user has a rating
    let ratingScore = 0;
    if (rating > 0) {
      ratingScore = Math.pow(Math.max(0, rating - 1200), 2) / 10;
    }
    
    // Contests participated component
    const contestsScore = contestsParticipated * 50;
    
    // Calculate total score
    const score = problemsScore + ratingScore + contestsScore;
    
    return Math.round(score);
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
      
      // LeetCode GraphQL endpoint
      const graphqlEndpoint = 'https://leetcode.com/graphql';
      
      // GraphQL query to fetch user profile data
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
              userCalendar {
                streak
                totalActiveDays
              }
            }
          }
        `,
        variables: {
          username: username
        }
      };
      
      console.log(`Making GraphQL request to LeetCode API for user: ${username}`);
      
      // Make the GraphQL request
      const response = await this.axiosInstance.post(graphqlEndpoint, graphqlQuery, {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      });
      
      // Check if the response contains valid data
      if (!response.data || !response.data.data || !response.data.data.matchedUser) {
        throw new Error(`User ${username} not found on LeetCode or API response invalid`);
      }
      
      const userData = response.data.data.matchedUser;
      
      console.log(`LeetCode GraphQL API data received for ${username}:`, userData);
      
      // Extract problem solving statistics
      const submitStats = userData.submitStats?.acSubmissionNum || [];
      
      // Initialize difficulty counts
      let allSolved = 0;
      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;
      
      // Process submission stats by difficulty
      submitStats.forEach(stat => {
        const count = stat.count || 0;
        
        switch (stat.difficulty) {
          case 'All':
            allSolved = count;
            break;
          case 'Easy':
            easySolved = count;
            break;
          case 'Medium':
            mediumSolved = count;
            break;
          case 'Hard':
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
        hard: hardSolved
      };
      
      // Calculate a score using our scoring algorithm
      const score = this.calculateLeetCodeScore(
        allSolved, 
        profile.ranking || 0, 
        difficultyMap,
        userData.contestBadge ? 1 : 0 // If user has a contest badge, count at least 1 contest
      );
      
      // Get user stats from calendar if available
      const calendar = userData.userCalendar || {};
      const streak = calendar.streak || 0;
      const activeDays = calendar.totalActiveDays || 0;
      
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
        contestsParticipated: userData.contestBadge ? 1 : 0,
        rating: 0, // Not available in this query
        contestRanking: 0, // Not available in this query
        contestBadge: userData.contestBadge?.name || '',
        streak: streak,
        activeDays: activeDays,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching LeetCode profile for ${username}:`, error);
      
      if (error.response) {
        console.error('LeetCode API Response Status:', error.response.status);
        console.error('LeetCode API Response Headers:', error.response.headers);
        console.error('LeetCode API Response Data:', error.response.data);
      }
      
      // Provide more specific error message
      if (error.message.includes('not found')) {
        throw new Error(`User ${username} not found on LeetCode`);
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error(`LeetCode API request timed out. Please try again later.`);
      } else if (error.response?.status === 429) {
        throw new Error(`LeetCode API rate limit exceeded. Please try again later.`);
      }
      
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
      
      // Validate that we found meaningful data - a user might exist but have no activity
      if (problemsSolved === 0 && contestsParticipated === 0 && (userData.rating === undefined || userData.rating === 0)) {
        console.log(`Codeforces user ${username} exists but has no activity data`);
        throw new Error(`Codeforces user '${username}' exists but has no public activity data. The user might be inactive.`);
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
        throw new Error(`User ${username} not found on Codeforces. Please check the spelling and try again.`);
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
      
      const response = await this.axiosInstance.get(apiUrl, {
        // Accept any status code to handle ourselves
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
        timeout: 20000 // Increase timeout for sometimes slow third-party API
      });
      
      // Check if the response indicates the user doesn't exist
      // This is the correct way to detect a non-existent user according to the API format
      if (response.data && response.data.error === "Profile Not Found") {
        throw new Error(`User '${username}' not found on GeeksforGeeks. Please check the spelling and try again.`);
      }
      
      // Additional check for empty responses
      if (!response.data || response.status !== 200) {
        throw new Error(`GeeksforGeeks API returned an invalid response for user '${username}'. Please try again later.`);
      }
      
      // Check if we have the required info object
      if (!response.data.info) {
        throw new Error(`GeeksforGeeks user '${username}' profile data could not be retrieved. The profile may be private or not yet complete.`);
      }
      
      // Extract user info and solved stats from API response
      const { info, solvedStats = {} } = response.data;
      
      // Calculate total problems by difficulty levels - handle possible undefined values
      const easyProblemsSolved = solvedStats?.easy?.count || 0;
      const mediumProblemsSolved = solvedStats?.medium?.count || 0;
      const hardProblemsSolved = solvedStats?.hard?.count || 0;
      const basicProblemsSolved = solvedStats?.basic?.count || 0;
      const schoolProblemsSolved = solvedStats?.school?.count || 0;
      
      // Calculate total problems solved
      const totalByCategories = easyProblemsSolved + mediumProblemsSolved + hardProblemsSolved + basicProblemsSolved + schoolProblemsSolved;
      const problemsSolved = info.totalProblemsSolved || totalByCategories || 0;
      
      console.log(`GFG API data for ${username}:`, {
        codingScore: info.codingScore || 0,
        totalProblems: problemsSolved,
        byDifficulty: {
          easy: easyProblemsSolved,
          medium: mediumProblemsSolved,
          hard: hardProblemsSolved,
          basic: basicProblemsSolved,
          school: schoolProblemsSolved
        }
      });
      
      // Calculate total score using our scoring algorithm
      const score = this.calculateGeeksforGeeksScore(info.codingScore || 0, problemsSolved, info.instituteRank || 0);

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
      
      // Just pass through user not found errors
      if (error.message.includes('not found')) {
        throw error;
      }
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error(`GeeksforGeeks API request timed out. Please try again later.`);
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
      
      // Validate GitHub username format before making API call
      if (!this.isValidGitHubUsername(username)) {
        throw new Error(`Invalid GitHub username format: ${username}`);
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
          throw new Error(`User "${username}" not found on GitHub. Please verify the username is correct and the profile is public.`);
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
        throw new Error(`GitHub API rate limit exceeded. Please try again later.`);
      }
      
      // Special handling for validation errors we introduced
      if (error.message.includes('Invalid GitHub username format')) {
        throw new Error(`Invalid GitHub username format: "${username}". GitHub usernames can only contain alphanumeric characters, hyphens and underscores.`);
      }
      
      // Special formatting for not found errors
      if (error.message.includes('not found')) {
        throw new Error(`User "${username}" not found on GitHub. Please verify the username is correct and the profile is public.`);
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
  isValidGitHubUsername(username) {
    // GitHub usernames must:
    // - Only contain alphanumeric characters, hyphens or underscores
    // - Not start with a hyphen or underscore
    // - Not have consecutive hyphens
    // - Be at most 39 characters long
    return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|_|-(?=[a-zA-Z0-9])){0,38}$/.test(username);
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
      // Validate inputs
      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error(`Username is required for ${platform}`);
      }
      
      // Normalize inputs
      const normalizedPlatform = platform.toLowerCase().trim();
      const normalizedUsername = username.trim();
      
      console.log(`Getting profile data for ${normalizedPlatform}/${normalizedUsername}`);
      
      let profileData;
      
      switch (normalizedPlatform) {
        case 'leetcode':
          profileData = await this.getLeetCodeProfile(normalizedUsername);
          break;
        case 'codeforces':
          profileData = await this.getCodeforcesProfile(normalizedUsername);
          break;
        case 'codechef':
          profileData = await this.getCodeChefProfile(normalizedUsername);
          break;
        case 'geeksforgeeks':
          profileData = await this.getGeeksforGeeksProfile(normalizedUsername);
          break;
        case 'hackerrank':
          profileData = await this.getHackerRankProfile(normalizedUsername);
          break;
        case 'github':
          profileData = await this.getGitHubProfile(normalizedUsername);
          break;
        default:
          throw new Error(`Unsupported platform: ${normalizedPlatform}`);
      }

      // Validate that we actually got a proper result
      if (!profileData || typeof profileData !== 'object') {
        console.error(`Invalid profile data returned for ${normalizedPlatform}/${normalizedUsername}`);
        throw new Error(`Failed to retrieve valid profile data for ${normalizedUsername} on ${normalizedPlatform}`);
      }

      // Ensure required fields have default values
      profileData.username = profileData.username || normalizedUsername;
      profileData.problemsSolved = profileData.problemsSolved || 0;
      profileData.score = profileData.score || 0;
      profileData.rating = profileData.rating || 0;
      profileData.rank = profileData.rank || 'unrated';

      return profileData;
    } catch (error) {
      console.error(`Error in getProfileData for ${platform}/${username}:`, error);
      
      // For user not found errors, add more helpful text if not already present
      if (error.message.includes('not found') && !error.message.includes('Please check')) {
        throw new Error(`${error.message}. Please check the spelling and try again.`);
      }
      
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
    return this.getProfileData(platform, username);
  }
}

module.exports = new PlatformAPI();