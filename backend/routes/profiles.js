const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const platformAPI = require('../services/platformAPIs');
const platformLimits = require('../services/rateLimiter');
const mongoose = require('mongoose');

// Use the platformAPI module directly as it's already an instance
const platformAPIService = platformAPI;

// Add or update profile
router.post('/:platform', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const { platform } = req.params;

    // Validate input
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }

    if (!['geeksforgeeks', 'codechef', 'codeforces', 'leetcode', 'hackerrank', 'github'].includes(platform)) {
      return res.status(400).json({ message: 'Invalid platform' });
    }

    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    try {
      // Get platform data
      let platformData;
      
      try {
        // Try to fetch platform data
        platformData = await platformAPIService.getProfileData(platform, username);
      } catch (fetchError) {
        // Special handling for GeeksforGeeks - create a placeholder profile
        if (platform === 'geeksforgeeks' && fetchError.message.includes('not found')) {
          console.log(`Creating placeholder profile for GeeksforGeeks user: ${username}`);
          
          // Create placeholder data for GeeksforGeeks
          platformData = {
            username,
            codingScore: 0,
            instituteRank: 0,
            problemsSolved: 0,
            easyProblemsSolved: 0,
            mediumProblemsSolved: 0,
            hardProblemsSolved: 0,
            contestsParticipated: 0,
            score: 0,
            lastUpdated: new Date(),
            updateStatus: 'pending',
            rank: 'Code Enthusiast',
            message: `Placeholder profile created for ${username} - please verify the username is correct`
          };
        } else {
          // For other platforms or different errors, rethrow
          throw fetchError;
        }
      }
      
      if (!platformData || !platformData.username) {
        throw new Error(`Failed to fetch ${platform} profile data`);
      }

      let profile = await Profile.findOne({
        userId: req.user.id,
        platform
      });

      const profileData = {
        userId: req.user.id,
        platform,
        username,
        lastUpdateStatus: 'success',
        lastUpdated: new Date(),
        lastUpdateError: null
      };

      // Update platform-specific fields
      if (platform === 'github') {
        Object.assign(profileData, {
          score: platformData.score || 0,
          problemsSolved: platformData.totalCommits || 0,
          details: {
            publicRepos: platformData.publicRepos || 0,
            totalCommits: platformData.totalCommits || 0,
            followers: platformData.followers || 0,
            following: platformData.following || 0,
            starsReceived: platformData.starsReceived || 0,
            score: platformData.score || 0,
            lastUpdated: new Date()
          }
        });
      } else {
        Object.assign(profileData, {
          score: platformData.score || 0,
          problemsSolved: platformData.problemsSolved || 0,
          easyProblemsSolved: platformData.easyProblemsSolved || 0,
          mediumProblemsSolved: platformData.mediumProblemsSolved || 0,
          hardProblemsSolved: platformData.hardProblemsSolved || 0,
          rating: platformData.rating || 0,
          rank: platformData.rank || 'unrated',
          maxRating: platformData.maxRating || 0,
          globalRank: platform === 'codechef' ? platformData.global_rank || 0 : 
                     platform === 'leetcode' ? platformData.ranking || 0 : 0,
          countryRank: platform === 'codechef' ? platformData.country_rank || 0 : 0,
          instituteRank: platform === 'geeksforgeeks' ? platformData.instituteRank || 0 : 0,
          contestsParticipated: platformData.contestsParticipated || 0,
          contestRanking: platformData.contestRanking || 0,
          contestBadge: platformData.contestBadge || ''
        });

        if (platform === 'hackerrank') {
          profileData.badges = platformData.badges || 0;
          profileData.certificates = platformData.certificates || 0;
        }
      }

      if (profile) {
        // Update existing profile
        Object.assign(profile, profileData);
      } else {
        // Create new profile
        profile = new Profile(profileData);
      }

      await profile.save();

      // Update user's profiles
      await User.findByIdAndUpdate(req.user.id, {
        [`profiles.${platform}`]: username
      });

      // Format response data
      const responseData = {
        username: profile.username,
        details: platform === 'github' ? profile.details : {
          score: profile.score,
          problemsSolved: profile.problemsSolved,
          easyProblemsSolved: profile.easyProblemsSolved,
          mediumProblemsSolved: profile.mediumProblemsSolved,
          hardProblemsSolved: profile.hardProblemsSolved,
          rating: profile.rating,
          rank: profile.rank,
          maxRating: profile.maxRating,
          globalRank: profile.globalRank,
          countryRank: profile.countryRank,
          instituteRank: profile.instituteRank,
          contestsParticipated: profile.contestsParticipated || 0,
          contestRanking: profile.contestRanking || 0,
          contestBadge: profile.contestBadge || '',
          lastUpdated: profile.lastUpdated
        }
      };

      res.json({
        success: true,
        profile: {
          platform,
          username,
          ...(platform === 'github' ? {
            details: profile.details
          } : {
            details: responseData.details
          })
        },
        data: responseData
      });

    } catch (error) {
      console.error(`Error updating ${platform} profile:`, error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to update ${platform} profile: ${error.message}` 
      });
    }
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user profiles
router.get('/', auth, async (req, res) => {
  try {
    const profiles = await Profile.find({ userId: req.user.id });
    const user = await User.findById(req.user.id).select('profiles');
    
    res.json({
      success: true,
      profiles: profiles.map(profile => ({
        platform: profile.platform,
        username: profile.username,
        score: profile.score,
        problemsSolved: profile.problemsSolved,
        easyProblemsSolved: profile.easyProblemsSolved,
        mediumProblemsSolved: profile.mediumProblemsSolved,
        hardProblemsSolved: profile.hardProblemsSolved,
        rating: profile.rating,
        rank: profile.rank,
        maxRating: profile.maxRating,
        globalRank: profile.globalRank,
        countryRank: profile.countryRank,
        contestsParticipated: profile.contestsParticipated,
        lastUpdated: profile.lastUpdated,
        lastUpdateStatus: profile.lastUpdateStatus,
        lastUpdateError: profile.lastUpdateError
      })),
      userProfiles: user.profiles
    });
  } catch (err) {
    console.error('Get profiles error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update profile scores
router.put('/update-scores', auth, platformLimits.leetcode, async (req, res) => {
  try {
    const profiles = await Profile.find({ userId: req.user.id });
    let totalScore = 0;
    let totalProblemsSolved = 0;
    const updatedProfiles = [];
    
    // Initialize platform-specific data to store in user collection
    const userProfilesData = {};
    
    // Try to find CodeChef profile first to get overall problems solved
    const codechefProfile = profiles.find(profile => profile.platform === 'codechef');
    let codechefProblemsSolved = 0;

    if (codechefProfile) {
      try {
        const codechefData = await platformAPIService.getProfileData(
          'codechef',
          codechefProfile.username
        );
        
        codechefProblemsSolved = codechefData.problemsSolved || 0;
        console.log(`Using CodeChef problems solved (${codechefProblemsSolved}) as overall count`);
      } catch (codechefError) {
        console.error('Error fetching CodeChef profile:', codechefError.message);
      }
    }

    // Process each profile in parallel with timeouts
    const updatePromises = profiles.map(async (profile) => {
      try {
        profile.updateAttempts += 1;
        
        // Set a timeout for profile fetch operations
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        // Fetch profile data with timeout
        const platformDataPromise = platformAPIService.getProfileData(
          profile.platform,
          profile.username
        );
        
        const platformData = await Promise.race([platformDataPromise, timeoutPromise]);

        // Update profile document
        profile.score = platformData.score;
        profile.problemsSolved = platformData.problemsSolved;
        profile.rating = platformData.rating;
        profile.rank = platformData.rank;
        profile.maxRating = platformData.maxRating;
        profile.easyProblemsSolved = platformData.easyProblemsSolved || 0;
        profile.mediumProblemsSolved = platformData.mediumProblemsSolved || 0;
        profile.hardProblemsSolved = platformData.hardProblemsSolved || 0;
        
        // Add contests participated for all platforms
        profile.contestsParticipated = platformData.contestsParticipated || 0;
        
        profile.lastUpdated = Date.now();
        profile.lastUpdateStatus = 'success';
        profile.lastUpdateError = null;

        await profile.save();
        totalScore += profile.score;
        
        // If this is CodeChef, use its problems solved as the total
        if (profile.platform === 'codechef') {
          totalProblemsSolved = platformData.problemsSolved || 0;
        }

        // Add this profile data to userProfilesData for updating user document
        userProfilesData[profile.platform] = {
          username: profile.username,
          score: profile.score,
          problemsSolved: profile.problemsSolved,
          rating: profile.rating,
          rank: profile.rank,
          lastUpdated: profile.lastUpdated
        };

        // Add platform-specific data to the user profile summary
        if (profile.platform === 'github') {
          userProfilesData[profile.platform].totalCommits = platformData.totalCommits || 0;
          userProfilesData[profile.platform].publicRepos = platformData.publicRepos || 0;
          userProfilesData[profile.platform].followers = platformData.followers || 0;
          userProfilesData[profile.platform].starsReceived = platformData.starsReceived || 0;
        } else if (profile.platform === 'codeforces' || profile.platform === 'codechef' || profile.platform === 'leetcode' || profile.platform === 'hackerrank' || profile.platform === 'geeksforgeeks') {
          userProfilesData[profile.platform].contestsParticipated = platformData.contestsParticipated || 0;
          userProfilesData[profile.platform].rating = platformData.rating || 0;
          userProfilesData[profile.platform].maxRating = platformData.maxRating || 0;
          
          // Add difficulty-wise problems for coding platforms
          if (platformData.easyProblemsSolved !== undefined) {
            userProfilesData[profile.platform].easyProblemsSolved = platformData.easyProblemsSolved || 0;
          }
          if (platformData.mediumProblemsSolved !== undefined) {
            userProfilesData[profile.platform].mediumProblemsSolved = platformData.mediumProblemsSolved || 0;
          }
          if (platformData.hardProblemsSolved !== undefined) {
            userProfilesData[profile.platform].hardProblemsSolved = platformData.hardProblemsSolved || 0;
          }
        }
        
        // Track platform timings
        const platformElapsedTime = Date.now() - platformStartTime;
        platformTimings[profile.platform] = platformElapsedTime;

        return {
          platform: profile.platform,
          username: profile.username,
          ...platformData,
          lastUpdated: profile.lastUpdated,
          lastUpdateStatus: 'success'
        };
      } catch (platformError) {
        profile.lastUpdateStatus = 'error';
        profile.lastUpdateError = platformError.message;
        await profile.save();

        return {
          platform: profile.platform,
          username: profile.username,
          error: platformError.message,
          lastUpdateStatus: 'error',
          lastUpdated: profile.lastUpdated
        };
      }
    });

    // Wait for all profile updates to finish
    const results = await Promise.allSettled(updatePromises);
    
    // Process results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        updatedProfiles.push(result.value);
      } else {
        console.error('Error updating profile:', result.reason);
      }
    });
    
    // Update user document with consolidated data
    const userUpdateData = { 
      totalScore,
      totalProblemsSolved,
      lastProfileSync: new Date(),
      platformScores: userProfilesData,
      // Add overall GitHub metrics to user document for easy access
      githubStats: userProfilesData.github ? {
        totalCommits: userProfilesData.github.totalCommits || 0,
        publicRepos: userProfilesData.github.publicRepos || 0,
        starsReceived: userProfilesData.github.starsReceived || 0,
        followers: userProfilesData.github.followers || 0,
        lastUpdated: new Date()
      } : null,
      // Contest statistics
      contestStats: {
        totalContestsParticipated: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.contestsParticipated || 0), 0),
        contestsByPlatform: {
          codeforces: userProfilesData.codeforces ? userProfilesData.codeforces.contestsParticipated || 0 : 0,
          codechef: userProfilesData.codechef ? userProfilesData.codechef.contestsParticipated || 0 : 0,
          leetcode: userProfilesData.leetcode ? userProfilesData.leetcode.contestsParticipated || 0 : 0,
          hackerrank: userProfilesData.hackerrank ? userProfilesData.hackerrank.contestsParticipated || 0 : 0,
          geeksforgeeks: userProfilesData.geeksforgeeks ? userProfilesData.geeksforgeeks.contestsParticipated || 0 : 0
        }
      },
      // Problem-solving statistics
      problemStats: {
        totalSolved: totalProblemsSolved,
        easySolved: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.easyProblemsSolved || 0), 0),
        mediumSolved: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.mediumProblemsSolved || 0), 0),
        hardSolved: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.hardProblemsSolved || 0), 0)
      }
    };

    // Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      userUpdateData,
      { new: true }
    );

    console.log(`Profiles synced successfully for user ${req.user.id}. Total score: ${totalScore}`);

    res.json({
      success: true,
      message: 'All profiles synced successfully',
      profiles: updatedProfiles,
      totalScore,
      totalProblemsSolved: codechefProblemsSolved,
      user: {
        totalScore: updatedUser.totalScore,
        totalProblemsSolved: updatedUser.totalProblemsSolved,
        lastProfileSync: updatedUser.lastProfileSync,
        githubStats: updatedUser.githubStats,
        contestStats: updatedUser.contestStats,
        problemStats: updatedUser.problemStats,
        platformScores: updatedUser.platformScores
      }
    });
  } catch (err) {
    console.error('Update scores error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update profiles for a specific user by ID (used by cron job)
router.put('/update-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const apiKey = req.header('X-API-Key');
    
    // Validate API key for cron job access
    if (apiKey !== process.env.CRON_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized: Invalid API key' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const platforms = ['leetcode', 'codeforces', 'codechef', 'geeksforgeeks', 'hackerrank', 'github'];
    let totalScore = 0;
    let totalProblemsSolved = 0;
    const updatedProfiles = [];
    const userProfilesData = {};
    
    // Track timing statistics
    const startTime = Date.now();
    const platformTimings = {};
    
    // Process each platform with retry logic
    for (const platform of platforms) {
      const username = user.profiles ? user.profiles[platform] : null;
      
      // Skip platforms where the user hasn't set a username
      if (!username) {
        updatedProfiles.push({
          platform,
          username: null,
          lastUpdateStatus: 'skipped',
          reason: 'No username configured'
        });
        continue;
      }
      
      // Find existing profile or create new one
      let profile = await Profile.findOne({
        userId: user._id,
        platform,
        username
      });
      
      if (!profile) {
        profile = new Profile({
          userId: user._id,
          platform,
          username,
          lastUpdateStatus: 'pending'
        });
        await profile.save();
      }
      
      // Set profile update in progress
      profile.lastUpdateStatus = 'updating';
      profile.lastUpdateAttempt = new Date();
      await profile.save();
      
      const platformStartTime = Date.now();
      
      try {
        // Try to update profile with retry logic (maximum 2 retries)
        let platformData;
        let attempt = 0;
        const maxAttempts = 3;
        let lastError = null;
        
        while (attempt < maxAttempts) {
          try {
            // Add jitter to avoid all retries happening at the same time
            if (attempt > 0) {
              const jitterMs = Math.floor(Math.random() * 1000) + 1000;
              await new Promise(resolve => setTimeout(resolve, jitterMs));
              console.log(`Retry attempt ${attempt} for ${platform} profile of ${username}`);
            }
            
            // Make API call with platform-specific timeout
            const timeoutMs = platform === 'codechef' ? 30000 : 20000;
            platformData = await Promise.race([
              platformAPIService.getProfileByPlatform(platform, username),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`${platform} API request timeout after ${timeoutMs}ms`)), timeoutMs)
              )
            ]);
            
            // If we got here, the request succeeded
            break;
            
          } catch (retryError) {
            attempt++;
            lastError = retryError;
            
            // Only continue retrying on timeouts or specific recoverable errors
            if (!retryError.message.includes('timeout') && 
                !retryError.message.includes('rate limit') &&
                !retryError.message.includes('ECONNRESET') &&
                !retryError.message.includes('503')) {
              throw retryError; // Non-recoverable error, don't retry
            }
            
            // If we've used all retries, throw the last error
            if (attempt >= maxAttempts) {
              throw new Error(`Failed after ${maxAttempts} attempts: ${lastError.message}`);
            }
          }
        }
        
        // Update profile document with new data
        profile.problemsSolved = platformData.problemsSolved || 0;
        profile.score = platformData.score || 0;
        profile.rating = platformData.rating || 0;
        profile.rank = platformData.rank || 'unrated';
        profile.lastUpdated = new Date();
        profile.lastUpdateStatus = 'success';
        profile.lastUpdateError = null;
        
        // Platform-specific fields
        if (platform === 'leetcode') {
          profile.easyProblemsSolved = platformData.easyProblemsSolved || 0;
          profile.mediumProblemsSolved = platformData.mediumProblemsSolved || 0;
          profile.hardProblemsSolved = platformData.hardProblemsSolved || 0;
        } else if (platform === 'github') {
          profile.details = {
            publicRepos: platformData.publicRepos || 0,
            totalCommits: platformData.totalCommits || 0,
            followers: platformData.followers || 0,
            following: platformData.following || 0,
            starsReceived: platformData.starsReceived || 0
          };
        } else if (platform === 'codeforces' || platform === 'codechef') {
          profile.contestsParticipated = platformData.contestsParticipated || 0;
          profile.contestRanking = platformData.contestRanking || 0;
          profile.contestBadge = platformData.contestBadge || '';
        }
        
        // Save updated profile
        await profile.save();
        
        // Add to total score and problems solved
        totalScore += profile.score || 0;
        totalProblemsSolved += profile.problemsSolved || 0;
        
        // Add to user profile data collection
        userProfilesData[platform] = {
          username: profile.username,
          score: profile.score,
          problemsSolved: profile.problemsSolved,
          rating: profile.rating,
          rank: profile.rank,
          lastUpdated: profile.lastUpdated
        };
        
        // Add platform-specific data to the user profile summary
        if (platform === 'github') {
          userProfilesData[platform].totalCommits = platformData.totalCommits || 0;
          userProfilesData[platform].publicRepos = platformData.publicRepos || 0;
          userProfilesData[platform].followers = platformData.followers || 0;
          userProfilesData[platform].starsReceived = platformData.starsReceived || 0;
        } else if (platform === 'codeforces' || platform === 'codechef' || platform === 'leetcode' || platform === 'hackerrank' || platform === 'geeksforgeeks') {
          userProfilesData[platform].contestsParticipated = platformData.contestsParticipated || 0;
          userProfilesData[platform].rating = platformData.rating || 0;
          userProfilesData[platform].maxRating = platformData.maxRating || 0;
          
          // Add difficulty-wise problems for coding platforms
          if (platformData.easyProblemsSolved !== undefined) {
            userProfilesData[platform].easyProblemsSolved = platformData.easyProblemsSolved || 0;
          }
          if (platformData.mediumProblemsSolved !== undefined) {
            userProfilesData[platform].mediumProblemsSolved = platformData.mediumProblemsSolved || 0;
          }
          if (platformData.hardProblemsSolved !== undefined) {
            userProfilesData[platform].hardProblemsSolved = platformData.hardProblemsSolved || 0;
          }
        }
        
        // Track platform timings
        const platformElapsedTime = Date.now() - platformStartTime;
        platformTimings[platform] = platformElapsedTime;
        
        updatedProfiles.push({
          platform,
          username,
          ...platformData,
          lastUpdated: profile.lastUpdated,
          lastUpdateStatus: 'success',
          updateTimeMs: platformElapsedTime
        });
        
      } catch (error) {
        // Update profile with error information
        profile.lastUpdateStatus = 'error';
        profile.lastUpdateError = error.message;
        await profile.save();
        
        // Track platform timings even for errors
        const platformElapsedTime = Date.now() - platformStartTime;
        platformTimings[platform] = platformElapsedTime;
        
        updatedProfiles.push({
          platform,
          username,
          error: error.message,
          lastUpdateStatus: 'error',
          lastUpdated: profile.lastUpdated,
          updateTimeMs: platformElapsedTime
        });
      }
      
      // Add a small delay between platform requests to reduce load
      if (platforms.indexOf(platform) < platforms.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Update user document with consolidated data
    const userUpdateData = { 
      totalScore,
      totalProblemsSolved,
      lastProfileSync: new Date(),
      platformScores: userProfilesData,
      // Add overall GitHub metrics to user document for easy access
      githubStats: userProfilesData.github ? {
        totalCommits: userProfilesData.github.totalCommits || 0,
        publicRepos: userProfilesData.github.publicRepos || 0,
        starsReceived: userProfilesData.github.starsReceived || 0,
        followers: userProfilesData.github.followers || 0,
        lastUpdated: new Date()
      } : null,
      // Contest statistics
      contestStats: {
        totalContestsParticipated: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.contestsParticipated || 0), 0),
        contestsByPlatform: {
          codeforces: userProfilesData.codeforces ? userProfilesData.codeforces.contestsParticipated || 0 : 0,
          codechef: userProfilesData.codechef ? userProfilesData.codechef.contestsParticipated || 0 : 0,
          leetcode: userProfilesData.leetcode ? userProfilesData.leetcode.contestsParticipated || 0 : 0,
          hackerrank: userProfilesData.hackerrank ? userProfilesData.hackerrank.contestsParticipated || 0 : 0,
          geeksforgeeks: userProfilesData.geeksforgeeks ? userProfilesData.geeksforgeeks.contestsParticipated || 0 : 0
        }
      },
      // Problem-solving statistics
      problemStats: {
        totalSolved: totalProblemsSolved,
        easySolved: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.easyProblemsSolved || 0), 0),
        mediumSolved: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.mediumProblemsSolved || 0), 0),
        hardSolved: Object.values(userProfilesData)
          .reduce((total, platform) => total + (platform.hardProblemsSolved || 0), 0)
      }
    };
    
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      userUpdateData,
      { new: true }
    );
    
    // Calculate total elapsed time
    const totalElapsedTime = Date.now() - startTime;
    
    console.log(`Profiles synced successfully for user ${userId}. Total score: ${totalScore}`);
    
    res.json({
      success: true,
      message: 'User profiles synced successfully',
      profiles: updatedProfiles,
      totalScore,
      totalProblemsSolved,
      elapsedTimeMs: totalElapsedTime,
      platformTimings,
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        totalScore: updatedUser.totalScore,
        totalProblemsSolved: updatedUser.totalProblemsSolved,
        lastProfileSync: updatedUser.lastProfileSync,
        githubStats: updatedUser.githubStats,
        contestStats: updatedUser.contestStats,
        problemStats: updatedUser.problemStats,
        platformScores: updatedUser.platformScores
      }
    });
  } catch (err) {
    console.error('Update user profiles error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'name email phone department section graduationYear rollNumber mobileNumber skills interests about linkedinUrl profiles'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all platform profiles
    const platformProfiles = await Profile.find({ userId: req.user.id });

    // Format the response to match the expected profile structure
    const profile = {
      user: user._id,
      name: user.name,
      email: user.email,
      phone: user.mobileNumber || user.phone || '',
      department: user.department || '',
      section: user.section || '',
      rollNumber: user.rollNumber || '',
      graduationYear: user.graduationYear || new Date().getFullYear(),
      skills: user.skills || [],
      interests: user.interests || [],
      about: user.about || '',
      linkedinUrl: user.linkedinUrl || '',
      profiles: {
        leetcode: { username: '', details: null },
        codeforces: { username: '', details: null },
        codechef: { username: '', details: null },
        geeksforgeeks: { username: '', details: null },
        hackerrank: { username: '', details: null },
        github: { username: '', details: null }
      }
    };

    // Add platform profiles to the response
    platformProfiles.forEach(platformProfile => {
      if (platformProfile.platform === 'github') {
        profile.profiles[platformProfile.platform] = {
          username: platformProfile.username,
          details: platformProfile.details || {
            publicRepos: 0,
            totalCommits: 0,
            followers: 0,
            following: 0,
            starsReceived: 0,
            score: 0,
            lastUpdated: new Date()
          }
        };
      } else {
        profile.profiles[platformProfile.platform] = {
          username: platformProfile.username,
          details: {
            score: platformProfile.score || 0,
            problemsSolved: platformProfile.problemsSolved || 0,
            easyProblemsSolved: platformProfile.easyProblemsSolved || 0,
            mediumProblemsSolved: platformProfile.mediumProblemsSolved || 0,
            hardProblemsSolved: platformProfile.hardProblemsSolved || 0,
            rating: platformProfile.rating || 0,
            rank: platformProfile.rank || 'unrated',
            maxRating: platformProfile.maxRating || 0,
            globalRank: platformProfile.globalRank || 0,
            countryRank: platformProfile.countryRank || 0,
            instituteRank: platformProfile.instituteRank || 0,
            contestsParticipated: platformProfile.contestsParticipated || 0,
            lastUpdated: platformProfile.lastUpdated,
            lastUpdateStatus: platformProfile.lastUpdateStatus
          }
        };
      }
    });

    // Add usernames from user.profiles as fallback
    if (user.profiles) {
      Object.keys(user.profiles).forEach(platform => {
        if (user.profiles[platform] && !profile.profiles[platform]?.username) {
          profile.profiles[platform] = {
            username: user.profiles[platform],
            details: null
          };
        }
      });
    }

    res.json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update current user's profile
router.put('/me', auth, async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      section,
      rollNumber,
      graduationYear,
      skills,
      interests,
      about,
      linkedinUrl
    } = req.body;

    const updateFields = {
      name,
      mobileNumber: phone,
      department,
      section,
      rollNumber,
      graduationYear,
      skills: Array.isArray(skills) ? skills : [],
      interests: Array.isArray(interests) ? interests : [],
      about: about || '',
      linkedinUrl: linkedinUrl || ''
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format the response
    const profile = {
      user: user._id,
      name: user.name,
      email: user.email,
      phone: user.mobileNumber || user.phone || '',
      department: user.department || '',
      section: user.section || '',
      rollNumber: user.rollNumber || '',
      graduationYear: user.graduationYear || new Date().getFullYear(),
      skills: user.skills || [],
      interests: user.interests || [],
      about: user.about || '',
      linkedinUrl: user.linkedinUrl || ''
    };

    res.json(profile);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/profiles/platform/:platform/:username
// @desc    Get user's platform profile data
// @access  Public
router.get('/platform/:platform/:username', async (req, res) => {
  try {
    const { platform, username } = req.params;
    const platformData = await platformAPIService.getProfileByPlatform(platform, username);
    res.json(platformData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Debug endpoint for CodeChef profile scraping
router.get('/debug-codechef/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    console.log(`DEBUG: Fetching CodeChef profile for ${username}`);
    const profileData = await platformAPIService.getCodeChefProfile(username);
    
    res.json({
      success: true,
      message: 'CodeChef profile data retrieved',
      data: profileData
    });
  } catch (err) {
    console.error('CodeChef debug error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching CodeChef profile', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Debug endpoint for Codeforces profile retrieval
router.get('/debug-codeforces/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    console.log(`DEBUG: Fetching Codeforces profile for ${username}`);
    
    // Option to force using Puppeteer instead of API
    const forcePuppeteer = req.query.forcePuppeteer === 'true';
    
    let profileData;
    if (forcePuppeteer) {
      // Force using Puppeteer scraping
      profileData = await platformAPIService.getCodeforcesProfileWithPuppeteer(username);
    } else {
      // Use the normal method (API first, fallback to Puppeteer)
      profileData = await platformAPIService.getCodeforcesProfile(username);
    }
    
    res.json({
      success: true,
      message: 'Codeforces profile data retrieved',
      method: forcePuppeteer ? 'puppeteer' : 'auto',
      data: profileData
    });
  } catch (err) {
    console.error('Codeforces debug error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching Codeforces profile', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get sync information
router.get('/sync-info', auth, async (req, res) => {
  try {
    // Get sync info from the database
    const syncInfo = await mongoose.connection.db.collection('system').findOne({ _id: 'sync_info' });
    
    if (!syncInfo) {
      // If no sync has occurred yet, calculate when the next one will be
      const now = new Date();
      // Calculate next 5:25 PM IST (11:55 AM UTC)
      const nextSync = new Date();
      nextSync.setUTCHours(11, 55, 0, 0); // Set to 11:55 AM UTC
      
      // If that time has already passed today, move to tomorrow
      if (nextSync <= now) {
        nextSync.setDate(nextSync.getDate() + 1);
      }
      
      return res.json({
        lastSync: null,
        nextSync,
        timeRemaining: nextSync.getTime() - now.getTime(),
        syncStats: null,
        scheduledTime: '5:25 PM IST (11:55 AM UTC)',
        message: 'No sync has occurred yet. First sync will run at the scheduled time.'
      });
    }
    
    // Calculate time remaining until next sync
    const now = new Date();
    const timeRemaining = syncInfo.nextSync.getTime() - now.getTime();
    
    res.json({
      lastSync: syncInfo.lastSync,
      nextSync: syncInfo.nextSync,
      timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
      syncStats: syncInfo.syncStats || null,
      scheduledTime: '5:25 PM IST (11:55 AM UTC)',
      message: syncInfo.lastSync 
        ? `Last sync completed on ${new Date(syncInfo.lastSync).toLocaleString()}. Next sync at ${new Date(syncInfo.nextSync).toLocaleString()}.` 
        : 'No sync has occurred yet.'
    });
  } catch (error) {
    console.error('Error fetching sync info:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug endpoint for contests participated across platforms
router.get('/debug-contests', async (req, res) => {
  try {
    // Get all profiles with non-zero contests participated
    const profiles = await Profile.find({ contestsParticipated: { $gt: 0 } })
      .select('platform username userId contestsParticipated')
      .sort({ contestsParticipated: -1 })
      .limit(20);
    
    if (profiles.length === 0) {
      // If no profiles found with non-zero contests, get any profiles
      const anyProfiles = await Profile.find({})
        .select('platform username userId contestsParticipated')
        .limit(20);
      
      return res.json({
        message: 'No profiles found with contests participated',
        anyProfiles
      });
    }
    
    res.json({
      message: `Found ${profiles.length} profiles with contests participated`,
      profiles
    });
  } catch (error) {
    console.error('Error fetching contest participation data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
