/**
 * Platform API Service
 * 
 * This service handles integration with various competitive programming platforms
 * to fetch user profiles, statistics, and calculate standardized scores.
 */
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
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
    
    // Initialize rate limiting for Codeforces
    this.lastCodeforcesRequest = 0;
    this.codeforcesRequestCount = 0;
    this.codeforcesResetTime = Date.now() + 60000; // Reset counter after 1 minute
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
          username: username
        }
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
          username: username
        }
      };
      
      console.log(`Making GraphQL request to LeetCode API for user: ${username}`);
      
      // Prepare headers with cookies and more browser-like appearance
      const headers = {
        'Content-Type': 'application/json',
        'Referer': `https://leetcode.com/${username}/`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://leetcode.com',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      };
      
      // Make the GraphQL request with better error handling
      const response = await this.axiosInstance.post(graphqlEndpoint, graphqlQuery, {
        headers,
        validateStatus: status => status === 200 // Only accept 200 responses
      }).catch(err => {
        console.error(`LeetCode GraphQL main query failed with: ${err.message}`);
        console.error(`Status code: ${err.response?.status}, Status text: ${err.response?.statusText}`);
        
        if (err.response?.data) {
          try {
            console.error('Error response data:', JSON.stringify(err.response.data, null, 2));
          } catch (e) {
            console.error('Error data present but could not stringify');
          }
        }
        
        return { status: err.response?.status || 500, data: null };
      });
      
      // Check if the response contains valid data
      if (!response.data || !response.data.data || !response.data.data.matchedUser) {
        console.warn(`Main profile query failed or returned invalid data for ${username}, will continue with partial data`);
        // Continue with partial data rather than failing completely
      }
      
      // Extract user data from main query
      const userData = response.data?.data?.matchedUser || {};
      console.log(`LeetCode GraphQL API main data received for ${username}`);
      
      // Initialize contest data with defaults
      let contestsParticipated = 0;
      let rating = 0;
      let contestRanking = 0;
      let contestBadge = '';
      
      // Try to extract contest data from the main query first
      if (userData.contestRating) {
        console.log(`Found contest data in main profile response for ${username}`);
        contestsParticipated = userData.contestRating.attendedContestsCount || 0;
        rating = userData.contestRating.rating || 0;
        contestRanking = userData.contestRating.globalRanking || 0;
        
        console.log(`Contest data found for ${username}:`);
        console.log(`- Contests Participated: ${contestsParticipated}`);
        console.log(`- Rating: ${rating}`);
        console.log(`- Contest Ranking: ${contestRanking}`);
        
        // Get badge information
        if (userData.contestBadge?.name) {
          contestBadge = userData.contestBadge.name;
        }
      } else {
        console.warn(`No contest data found in main profile response for ${username}, trying contest query`);
        
        // Try to get contest data separately
        try {
          console.log(`Attempting to fetch contest data for ${username} using dedicated query`);
          const contestResponse = await this.axiosInstance.post(graphqlEndpoint, contestQuery, {
            headers: {
              'Content-Type': 'application/json',
              'Referer': `https://leetcode.com/${username}/`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Origin': 'https://leetcode.com',
              'Accept': '*/*',
            }
          }).catch(err => {
            console.warn(`Contest query failed: ${err.message}`);
            if (err.response?.status) {
              console.warn(`Status code: ${err.response.status}, Status text: ${err.response.statusText}`);
            }
            return { data: null };
          });
          
          // Log the response data for debugging
          if (contestResponse.data) {
            try {
              console.log(`Contest API response:`, JSON.stringify(contestResponse.data, null, 2));
            } catch (e) {
              console.log('Contest response available but could not stringify');
            }
          }
          
          // Extract contest data if available
          if (contestResponse.data?.data?.userContestRanking) {
            const contestData = contestResponse.data.data.userContestRanking;
            contestsParticipated = contestData.attendedContestsCount || 0;
            rating = contestData.rating || 0;
            contestRanking = contestData.globalRanking || 0;
            
            console.log(`Contest data found:`);
            console.log(`- Contests Participated: ${contestsParticipated}`);
            console.log(`- Rating: ${rating}`);
            console.log(`- Contest Ranking: ${contestRanking}`);
            
            // Get badge information
            if (contestData.badge?.name) {
              contestBadge = contestData.badge.name;
            }
          } else {
            console.warn(`No contest data found in dedicated contest query response`);
          }
        } catch (contestError) {
          console.warn(`Failed to fetch contest data: ${contestError.message}`);
        }
        
        // New approach for contest data: use public REST API
        if (contestsParticipated === 0 && rating === 0) {
          try {
            console.log(`Trying alternative method for ${username} contest data using public API`);
            
            // Use the public API endpoint that doesn't require authentication
            const publicApiUrl = `https://leetcode.com/graphql/?query=query%20userContestRankingInfo(%24username%3A%20String!)%20%7B%0A%20%20userContestRanking(username%3A%20%24username)%20%7B%0A%20%20%20%20attendedContestsCount%0A%20%20%20%20rating%0A%20%20%20%20globalRanking%0A%20%20%20%20totalParticipants%0A%20%20%20%20topPercentage%0A%20%20%20%20badge%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D&variables=%7B%22username%22%3A%22${encodeURIComponent(username)}%22%7D`;
            
            const contestResponse = await this.axiosInstance.get(publicApiUrl, {
              headers: {
                'Referer': `https://leetcode.com/${username}/`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
              },
              timeout: 15000 // 15 second timeout
            }).catch(err => {
              console.warn(`Alternative contest data fetch failed: ${err.message}`);
              if (err.response?.status) {
                console.warn(`Status code: ${err.response.status}, Status text: ${err.response.statusText}`);
              }
              return { data: null };
            });
            
            // Log the response data for debugging
            if (contestResponse.data) {
              try {
                console.log(`Alternative contest API response:`, JSON.stringify(contestResponse.data, null, 2));
              } catch (e) {
                console.log('Contest response available but could not stringify');
              }
            }
            
            // Extract contest data if available
            if (contestResponse.data?.data?.userContestRanking) {
              const contestData = contestResponse.data.data.userContestRanking;
              contestsParticipated = contestData.attendedContestsCount || 0;
              rating = contestData.rating || 0;
              contestRanking = contestData.globalRanking || 0;
              
              console.log(`Alternative contest data found:`);
              console.log(`- Contests Participated: ${contestsParticipated}`);
              console.log(`- Rating: ${rating}`);
              console.log(`- Contest Ranking: ${contestRanking}`);
              
              // Get badge information
              if (contestData.badge?.name) {
                contestBadge = contestData.badge.name;
              }
            } else {
              console.warn(`No contest data found in alternative API response`);
            }
          } catch (alternativeError) {
            console.warn(`Alternative contest data fetch failed with error: ${alternativeError.message}`);
          }
          
          // If still no contest data, try scraping directly from user profile page
          if (contestsParticipated === 0 && rating === 0) {
            try {
              console.log(`Trying to scrape contest data from ${username}'s profile page as last resort`);
              
              const profilePageResponse = await this.axiosInstance.get(
                `https://leetcode.com/${username}/`, 
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml'
                  },
                  timeout: 15000 // 15 second timeout
                }
              ).catch(err => {
                console.warn(`Profile page request failed: ${err.message}`);
                return null;
              });
              
              if (profilePageResponse && profilePageResponse.status === 200) {
                console.log(`Successfully fetched ${username}'s profile page, looking for contest data`);
                const html = profilePageResponse.data;
                
                // Try to extract contest data from the HTML using regex patterns
                // This is a fallback approach and might break if LeetCode changes their HTML structure
                const contestsPattern = /attendedContestsCount\\":\s*(\d+)/;
                const ratingPattern = /rating\\":\s*(\d+)/;
                const contestsMatch = html.match(contestsPattern);
                const ratingMatch = html.match(ratingPattern);
                
                if (contestsMatch && contestsMatch[1]) {
                  contestsParticipated = parseInt(contestsMatch[1], 10) || 0;
                  console.log(`Found contests participated from HTML: ${contestsParticipated}`);
                }
                
                if (ratingMatch && ratingMatch[1]) {
                  rating = parseInt(ratingMatch[1], 10) || 0;
                  console.log(`Found rating from HTML: ${rating}`);
                }
                
                // Try to find contest badge
                const badgePattern = /contestBadge\\":{[^}]*\\"name\\":\\"([^"\\]+)/;
                const badgeMatch = html.match(badgePattern);
                if (badgeMatch && badgeMatch[1]) {
                  contestBadge = badgeMatch[1];
                  console.log(`Found contest badge from HTML: ${contestBadge}`);
                }
              }
            } catch (scrapingError) {
              console.warn(`Profile page scraping failed: ${scrapingError.message}`);
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
        contestsParticipated
      );
      
      // If we don't have any problem data, but we know the user exists,
      // return a minimal profile rather than an error
      if (allSolved === 0 && !userData.profile) {
        // Check if we actually verified that this user exists
        if (!userData.username && Object.keys(userData).length === 0) {
          // No user data at all - we should throw an error
          console.error(`No user data found for "${username}" - likely a non-existent user`);
          throw new Error(`User ${username} not found on LeetCode. Please check the spelling and try again.`);
        }
        
        console.log(`Minimal data available for ${username}, creating basic profile`);
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
          isPartialData: true // Flag to indicate this is partial data
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
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error fetching LeetCode profile for ${username}:`, error.message);
      
      // Log more details if available
      if (error.response) {
        console.error('LeetCode API Response Status:', error.response.status);
        console.error('LeetCode API Response Headers:', error.response.headers);
        
        // Safely log response data without causing additional errors
        try {
          console.error('LeetCode API Response Data:', 
            typeof error.response.data === 'object' 
              ? JSON.stringify(error.response.data) 
              : error.response.data
          );
        } catch (logError) {
          console.error('Could not stringify response data');
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
        isPartialData: true
      };
      
      // Handle authentication errors (401, 403) or bad requests (400)
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 400) {
        console.log(`LeetCode API authentication error (${error.response.status}) for ${username}, trying direct profile page request`);
        
        try {
          // Try getting basic data from the user's public profile page
          const profilePageResponse = await this.axiosInstance.get(
            `https://leetcode.com/${username}/`, 
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml'
              },
              timeout: 15000 // 15 second timeout
            }
          ).catch(err => {
            console.warn(`Profile page request failed: ${err.message}`);
            if (err.response?.status) {
              console.warn(`Status: ${err.response.status} ${err.response.statusText}`);
              
              // If we get a 404 Not Found status, the user definitely doesn't exist
              if (err.response.status === 404) {
                console.error(`LeetCode profile page returned 404 Not Found for ${username}`);
                throw new Error(`User ${username} not found on LeetCode. Please check the username and try again.`);
              }
            }
            return null;
          });
          
          // If the profile page doesn't exist, the user doesn't exist
          if (!profilePageResponse) {
            console.error(`Could not verify existence of LeetCode user ${username}`);
            throw new Error(`User ${username} not found on LeetCode. Please check the username and try again.`);
          }
          
          // Check the response content for indicators of a non-existent user
          const pageContent = profilePageResponse.data || '';
          
          // Look for common text patterns that indicate the user doesn't exist
          const nonExistentIndicators = [
            'Page not found',
            'The page you are looking for doesn\'t exist',
            'user not found',
            'User not found',
            'does not exist'
          ];
          
          if (typeof pageContent === 'string' && nonExistentIndicators.some(indicator => pageContent.includes(indicator))) {
            console.error(`LeetCode profile page indicates user ${username} doesn't exist`);
            throw new Error(`User ${username} not found on LeetCode. Please check the username and try again.`);
          }
          
          // Verify a profile section exists to confirm user is real
          const hasProfileSection = typeof pageContent === 'string' && 
            (pageContent.includes('user-profile') || 
             pageContent.includes('profile-content') || 
             pageContent.includes('profile-header'));
          
          // If we can at least confirm the user exists, try to extract some data from HTML
          if (profilePageResponse && profilePageResponse.status === 200 && hasProfileSection) {
            console.log(`Successfully confirmed ${username} exists on LeetCode via profile page`);
            
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
              console.log(`Found total problems solved: ${minimalProfile.problemsSolved}`);
            }
            
            if (easyMatch && easyMatch[1]) {
              minimalProfile.easyProblemsSolved = parseInt(easyMatch[1], 10);
            }
            
            if (mediumMatch && mediumMatch[1]) {
              minimalProfile.mediumProblemsSolved = parseInt(mediumMatch[1], 10);
            }
            
            if (hardMatch && hardMatch[1]) {
              minimalProfile.hardProblemsSolved = parseInt(hardMatch[1], 10);
            }
            
            if (contestsMatch && contestsMatch[1]) {
              minimalProfile.contestsParticipated = parseInt(contestsMatch[1], 10);
              console.log(`Found contests participated: ${minimalProfile.contestsParticipated}`);
            }
            
            if (ratingMatch && ratingMatch[1]) {
              minimalProfile.rating = parseInt(ratingMatch[1], 10);
              console.log(`Found rating: ${minimalProfile.rating}`);
            }
            
            // Calculate score with the data we have
            if (minimalProfile.problemsSolved > 0) {
              const difficultyMap = {
                all: minimalProfile.problemsSolved,
                easy: minimalProfile.easyProblemsSolved,
                medium: minimalProfile.mediumProblemsSolved,
                hard: minimalProfile.hardProblemsSolved
              };
              
              minimalProfile.score = this.calculateLeetCodeScore(
                minimalProfile.problemsSolved, 
                minimalProfile.ranking, 
                difficultyMap,
                minimalProfile.contestsParticipated
              );
              
              console.log(`Calculated score for ${username} from HTML data: ${minimalProfile.score}`);
            }
            
            minimalProfile.existsConfirmed = true;
            minimalProfile.scrapedFromHTML = true;
            
            return minimalProfile;
          }
        } catch (fallbackError) {
          // If the error explicitly mentions "not found", propagate it
          if (fallbackError.message.includes('not found')) {
            throw fallbackError;
          }
          
          console.error(`Final fallback HTML scraping failed: ${fallbackError.message}`);
          
          // At this point, we couldn't verify the user exists, so we should not return a profile
          throw new Error(`Could not verify if user ${username} exists on LeetCode. Please check the username and try again.`);
        }
        
        // If profile page check also fails, try a very simple HEAD request
        try {
          const headCheck = await this.axiosInstance.head(`https://leetcode.com/${username}/`);
          if (headCheck.status === 200) {
            console.log(`Confirmed ${username} exists (HEAD request) but couldn't get profile data`);
            minimalProfile.existsConfirmed = true;
            return minimalProfile;
          } else if (headCheck.status === 404) {
            // A 404 on HEAD request confirms the user doesn't exist
            throw new Error(`User ${username} not found on LeetCode. Please check the username and try again.`);
          }
        } catch (headCheckError) {
          console.warn(`HEAD check failed: ${headCheckError.message}`);
          
          // If it's a 404, the user definitely doesn't exist
          if (headCheckError.response?.status === 404) {
            throw new Error(`User ${username} not found on LeetCode. Please check the username and try again.`);
          }
        }
        
        // If we've reached this point, we couldn't definitively verify if the user exists or not
        // We should err on the side of caution and NOT create a profile
        console.error(`Could not verify existence of LeetCode user ${username} after multiple attempts`);
        throw new Error(`Could not verify if user ${username} exists on LeetCode. Please check the username and try again.`);
      }
      
      // Rate limiting (429)
      if (error.response?.status === 429) {
        console.error(`LeetCode API rate limit (429) exceeded for ${username}`);
        throw new Error(`LeetCode API rate limit exceeded. Please try again in a few minutes.`);
      }
      
      // Provide more specific error message
      if (error.message.includes('not found') || error.response?.status === 404) {
        throw new Error(`User ${username} not found on LeetCode. Please check the username and try again.`);
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error(`LeetCode API request timed out. Please try again later.`);
      }
      
      // Generic error message as a last resort
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
      
      // Implement rate limiting for Codeforces
      // Reset counter if the reset time has passed
      const now = Date.now();
      if (now > this.codeforcesResetTime) {
        this.codeforcesRequestCount = 0;
        this.codeforcesResetTime = now + 60000; // Reset after 1 minute
      }
      
      // If we've made more than 5 requests in the last minute, add delay
      if (this.codeforcesRequestCount >= 5) {
        const remainingTime = this.codeforcesResetTime - now;
        if (remainingTime > 0) {
          console.log(`Rate limiting: Waiting ${remainingTime}ms before Codeforces request`);
          await new Promise(resolve => setTimeout(resolve, Math.min(remainingTime, 5000)));
        }
      }
      
      // Add a small delay between requests to be extra safe
      if (this.lastCodeforcesRequest && (now - this.lastCodeforcesRequest < 1000)) {
        const delay = 1000 - (now - this.lastCodeforcesRequest);
        console.log(`Adding ${delay}ms delay between Codeforces requests`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      this.lastCodeforcesRequest = Date.now();
      this.codeforcesRequestCount++;
      
      // 1. Get basic user information from user.info API
      const userResponse = await this.axiosInstance.get(`https://codeforces.com/api/user.info?handles=${username}`, {
        validateStatus: status => (status >= 200 && status < 300) || status === 400 || status === 429
      });
      
      // Handle rate limiting response
      if (userResponse.status === 429) {
        console.log('Codeforces API rate limit hit (429 response)');
        // Wait and retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Reset our counters and retry after waiting
        this.codeforcesRequestCount = 0;
        this.lastCodeforcesRequest = 0;
        throw new Error(`Codeforces API rate limit exceeded. Please try again in a few minutes.`);
      }
      
      // Check if user exists
      if (userResponse.status === 400 || userResponse.data.status !== 'OK' || !userResponse.data.result || userResponse.data.result.length === 0) {
        console.log(`User ${username} not found on Codeforces (API response)`);
        throw new Error(`User ${username} not found on Codeforces`);
      }
      
      // Extract basic user data
      const userData = userResponse.data.result[0];
      console.log(`Retrieved basic Codeforces data for ${username}: rating=${userData.rating}, rank=${userData.rank}`);
      
      // 2. Get rating history to count contest participation
      const ratingResponse = await this.axiosInstance.get(`https://codeforces.com/api/user.rating?handle=${username}`, {
        validateStatus: status => (status >= 200 && status < 300) || status === 429
      });
      
      // Handle rate limiting for rating request
      if (ratingResponse.status === 429) {
        console.log('Codeforces API rate limit hit for rating history (429 response)');
        // Use default values and continue rather than failing completely
        console.log('Using default values for contest participation');
        return this.processCodeforcesData(userData, username, 0, 0, 0, 0, 0);
      }
      
      // Extract contests participated
      let contestsParticipated = 0;
      if (ratingResponse.data.status === 'OK') {
        contestsParticipated = ratingResponse.data.result.length;
        console.log(`${username} has participated in ${contestsParticipated} contests`);
      }
      
      // 3. Get submissions to count problems solved
      // Using count=10000 to handle users with many submissions
      try {
        const submissionsResponse = await this.axiosInstance.get(
          `https://codeforces.com/api/user.status?handle=${username}&from=1&count=10000`,
          {
            validateStatus: status => (status >= 200 && status < 300) || status === 429
          }
        );
        
        // Handle rate limiting for submissions request
        if (submissionsResponse.status === 429) {
          console.log('Codeforces API rate limit hit for submissions (429 response)');
          // Use basic data without submissions
          return this.processCodeforcesData(userData, username, contestsParticipated, 0, 0, 0, 0);
        }
        
        // Process submissions to get unique solved problems
        if (submissionsResponse.data.status === 'OK') {
          return this.processCodeforcesSubmissions(
            submissionsResponse.data, 
            userData, 
            username, 
            contestsParticipated
          );
        } else {
          // No valid submissions data, use basic profile info
          return this.processCodeforcesData(userData, username, contestsParticipated, 0, 0, 0, 0);
        }
      } catch (submissionsError) {
        console.error(`Error fetching Codeforces submissions for ${username}:`, submissionsError.message);
        // Just use what we have so far
        return this.processCodeforcesData(userData, username, contestsParticipated, 0, 0, 0, 0);
      }
    } catch (error) {
      console.error(`Error fetching Codeforces profile for ${username}:`, error.message);
      
      // Provide specific error for not found users
      if (error.response?.status === 400 || error.message.includes('not found')) {
        throw new Error(`User ${username} not found on Codeforces. Please check the spelling and try again.`);
      }
      
      // Handle rate limiting
      if (error.response?.status === 429 || error.message.includes('rate limit')) {
        throw new Error(`Codeforces API rate limit exceeded. Please try again in a few minutes.`);
      }
      
      // Specific handling for 503
      if (error.response?.status === 503) {
        throw new Error(`Codeforces API service is temporarily unavailable. Please try again later.`);
      }
      
      // Re-throw other errors
      throw new Error(`Failed to fetch Codeforces profile: ${error.message}`);
    }
  }
  
  /**
   * Process Codeforces submissions data
   * @private
   */
  processCodeforcesSubmissions(submissionsData, userData, username, contestsParticipated) {
    const submissions = submissionsData.result;
    
    // Create a set of unique problem IDs that were solved
    const solvedProblems = new Set();
    
    // Track problems by difficulty level (A, B, C, etc.)
    const problemsByIndex = {};
    let totalAcceptedSubmissions = 0;
    
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
    
    console.log(`${username} has solved ${problemsSolved} unique problems on Codeforces`);
    console.log(`Problem difficulty breakdown - Easy: ${easyProblemsSolved}, Medium: ${mediumProblemsSolved}, Hard: ${hardProblemsSolved}`);
    
    return this.processCodeforcesData(
      userData, 
      username, 
      contestsParticipated, 
      problemsSolved, 
      easyProblemsSolved, 
      mediumProblemsSolved, 
      hardProblemsSolved, 
      totalAcceptedSubmissions
    );
  }
  
  /**
   * Process and return Codeforces profile data
   * @private
   */
  processCodeforcesData(userData, username, contestsParticipated, problemsSolved, easyProblemsSolved, mediumProblemsSolved, hardProblemsSolved, totalAcceptedSubmissions = 0) {
    // For users with no activity, we'll still return a valid profile with zeros
    // (This is not an error condition anymore)
    if (problemsSolved === 0 && contestsParticipated === 0 && (userData.rating === undefined || userData.rating === 0)) {
      console.log(`Codeforces user ${username} exists but has no activity data - returning zeros`);
      // This is not an error - just return a profile with zeros
    }
    
    // Calculate score using our scoring algorithm
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
      problemsSolved: problemsSolved || 0,
      totalAcceptedSubmissions: totalAcceptedSubmissions || 0,
      easyProblemsSolved: easyProblemsSolved || 0,
      mediumProblemsSolved: mediumProblemsSolved || 0,
      hardProblemsSolved: hardProblemsSolved || 0,
      contestsParticipated: contestsParticipated || 0,
      score: score || 0,
      contribution: userData.contribution || 0,
      lastUpdated: new Date()
    };
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
        validateStatus: status => status >= 200 && status < 300
      });
      
      // Load HTML content into cheerio for parsing
      const $ = cheerio.load(response.data);
      
      // More flexible way to check if we're on a valid profile page
      // Look for typical profile elements that should be present on ANY user page
      const profileContent = $('.user-details-container').length || 
                            $('.rating-header').length || 
                            $('.rating-number').length ||
                            $('section.user-details').length;
                            
      if (!profileContent) {
        console.log(`No profile content found for user ${username} on CodeChef`);
        
        // Check if we're seeing a login page or error page
        const isLoginPage = $('body').text().includes('Login') && $('body').text().includes('Forgot Password');
        const isErrorPage = $('body').text().includes('Oops') && $('body').text().includes('Error');
        
        if (isLoginPage) {
          throw new Error(`Unable to access CodeChef profile for ${username}. The site may be requiring login.`);
        } else if (isErrorPage) {
          throw new Error(`CodeChef returned an error for the profile ${username}. The user may not exist.`);
        } else {
          throw new Error(`User ${username} not found on CodeChef or the profile format has changed`);
        }
      }
      
      // Check if we see actual username on the page
      const usernameOnPage = $('h1.h2-style, .user-details-container h1, .m-username, section.user-details h2').text().trim();
      console.log(`Username found on page: ${usernameOnPage}`);
      
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
      
      // Approach 1: Check multiple selectors for problems solved information
      const problemSelectors = [
        '.problems-solved h5, .problems-solved .h5-style', 
        '.rating-data-section h5, .rating-data-section .h5-style',
        '.problems-solved-container h5, .problems-solved-container .h5-style',
        '.rating-data-section strong',
        '.user-details-container strong',
        '.problems-solved-count'
      ];
      
      for (const selector of problemSelectors) {
        $(selector).each((_, el) => {
          const elementText = $(el).text().trim();
          const parentText = $(el).parent().text().trim();
          
          if (elementText.includes('Fully Solved') || elementText.includes('Problems Solved')) {
            // Try to find the number in the element or its parent
            const fullText = parentText || elementText;
            const problemsMatch = fullText.match(/(\d+)\s*(problem|fully)/i);
            
            if (problemsMatch && problemsMatch[1]) {
              problemsSolved = parseInt(problemsMatch[1]);
              console.log(`Found problems solved (${problemsSolved}) in selector: ${selector}`);
              return false; // Break the each loop
            }
          }
        });
        
        if (problemsSolved > 0) break; // Stop if we found a value
      }
      
      // Approach 2: Full text search as fallback
      if (problemsSolved === 0) {
        const fullText = $('body').text();
        const problemPatterns = [
          /Fully Solved\s*:?\s*(\d+)/i,
          /Problems Solved\s*:?\s*(\d+)/i,
          /(\d+)\s+problems?\s+solved/i,
          /solved\s+(\d+)\s+problems?/i
        ];
        
        for (const pattern of problemPatterns) {
          const matches = fullText.match(pattern);
          if (matches && matches[1]) {
            problemsSolved = parseInt(matches[1]);
            console.log(`Found problems solved (${problemsSolved}) using text pattern`);
            break;
          }
        }
      }
      console.log(`CodeChef ${username} problems solved: ${problemsSolved}`);
      
      // 4. Extract contests participated by counting rating history entries
      let contestsParticipated = 0;

      // Approach 1: Direct h5 heading + next element for contests participated
      $('h5, .h5-style').each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes('Contest Participated') || text.includes('Contests Participated')) {
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

      // Approach 3: Count rows in rating table as fallback
      if (contestsParticipated === 0) {
        $('.rating-table tbody tr').each(() => {
          contestsParticipated++;
        });
      }

      console.log(`Final CodeChef ${username} contests participated: ${contestsParticipated}`);
      
      // 5. Extract stars if available
      let stars = 0;
      $('.rating-star, span.star').each((_, el) => {
        stars++;
      });

      // Alternative method to find stars from text if no star elements found
      if (stars === 0) {
        const starText = $('.rating-header').text() || $('.user-details-container').text();
        const starMatch = starText.match(/(\d+)\s*(?:★|star)/i);
        if (starMatch && starMatch[1]) {
          stars = parseInt(starMatch[1]);
        }
      }
      
      // If we haven't found any profile data, something is wrong
      if (rating === 0 && globalRank === 0 && problemsSolved === 0 && contestsParticipated === 0) {
        console.log(`No meaningful profile data found for ${username}`);
        // Just return minimal data rather than throwing an error, as the profile does exist
        return {
          username,
          rating: 0,
          global_rank: 0,
          problemsSolved: 0,
          contestsParticipated: 0,
          stars: 0,
          score: 0,
          lastUpdated: new Date()
        };
      }
      
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
