const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const platformAPI = require('../services/platformAPIs');
const { checkProfileUpdateRateLimit } = require('../services/rateLimiter');
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
    
    // Check rate limiting
    const rateLimitCheck = await checkProfileUpdateRateLimit(req.user.id, platform);
    if (!rateLimitCheck.allowed) {
      // Format the remaining time in hours and minutes instead of raw seconds
      const hours = Math.floor(rateLimitCheck.remainingTime / 3600);
      const minutes = Math.floor((rateLimitCheck.remainingTime % 3600) / 60);
      const formattedTime = `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      
      return res.status(429).json({ 
        success: false, 
        message: `Please wait ${formattedTime} before updating your ${platform} profile again.`,
        remainingTime: rateLimitCheck.remainingTime,
        formattedTime: formattedTime
      });
    }
    
    // Update the platform username in User model
    if (!user.profiles) {
      user.profiles = {};
    }
    user.profiles[platform] = username;
    await user.save();
    
    console.log(`Updated ${platform} username to ${username} in User.profiles`);

    // Check if profile already exists but don't update lastUpdateAttempt yet
    let profile = await Profile.findOne({ userId: req.user.id, platform });

    if (profile) {
      // If profile exists, just update the username but don't increment attempts 
      // or update lastUpdateAttempt until we've successfully fetched data
      profile.username = username;
      try {
        await profile.save();
      } catch (validationError) {
        // Handle username validation errors separately with a clear message
        if (validationError.message.includes('Invalid profile format')) {
          if (platform === 'github') {
            return res.status(400).json({
              success: false,
              message: `Invalid GitHub username format: "${username}". GitHub usernames can only contain alphanumeric characters, hyphens and underscores.`
            });
          } else {
            return res.status(400).json({
              success: false,
              message: `Invalid ${platform} username format: "${username}"`
            });
          }
        }
        throw validationError;
      }
    } else {
      // Create new profile with minimal fields, don't set lastUpdateAttempt yet
      profile = new Profile({
        userId: req.user.id,
        platform,
        username
      });
      
      try {
        await profile.save();
      } catch (validationError) {
        // Handle username validation errors separately with a clear message
        if (validationError.message.includes('Invalid profile format')) {
          if (platform === 'github') {
            return res.status(400).json({
              success: false,
              message: `Invalid GitHub username format: "${username}". GitHub usernames can only contain alphanumeric characters, hyphens and underscores.`
            });
          } else {
            return res.status(400).json({
              success: false,
              message: `Invalid ${platform} username format: "${username}"`
            });
          }
        }
        throw validationError;
      }
    }

    // Fetch initial data for the profile (async)
    try {
      // Get platform data
      let platformData;
      
      try {
        // Try to fetch platform data
        platformData = await platformAPIService.getProfileData(platform, username);
        
        // Additional validation for platforms that might return empty data for non-existent users
        if (platform === 'codeforces') {
          // For Codeforces - check if essential data exists
          if (platformData.rating === undefined && platformData.rank === undefined && 
               platformData.problemsSolved === undefined && platformData.score === undefined) {
            throw new Error(`Codeforces user '${username}' not found or has no public data available`);
          }
        }
      } catch (fetchError) {
        // Specific handling for GitHub profile not found errors
        if (platform === 'github' && (fetchError.message.includes('not found') || fetchError.message.includes('Failed to fetch'))) {
          return res.status(404).json({
            success: false,
            message: `GitHub user "${username}" not found. Please verify the username is correct and the profile is public.`
          });
        }
        
        // Special handling for GeeksforGeeks - create a placeholder profile only if explicitly mentioned in error
        if (platform === 'geeksforgeeks' && fetchError.message.includes('placeholder requested')) {
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
        throw new Error(`Failed to fetch ${platform} profile data for user '${username}'`);
      }

      // Re-fetch the profile to ensure we have the latest version
      profile = await Profile.findOne({
        userId: req.user.id,
        platform
      });

      // Now we've successfully fetched the data, update lastUpdateAttempt and increment attempts
      const profileData = {
        userId: req.user.id,
        platform,
        username,
        lastUpdateStatus: 'success',
        lastUpdated: new Date(),
        lastUpdateError: null,
        lastUpdateAttempt: new Date(),
        updateAttempts: (profile.updateAttempts || 0) + 1
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
        data: {
          platform,
          username,
          details: responseData.details
        },
        profile: {
          platform,
          username,
          ...(platform === 'github' ? {
            details: profile.details
          } : {
            details: responseData.details
          })
        }
      });

    } catch (error) {
      console.error(`Error updating ${platform} profile:`, error);
      
      // Update the profile with error information, but don't update lastUpdateAttempt 
      // since this was a failed attempt (not a successful update that should trigger cooldown)
      if (profile) {
        profile.lastUpdateStatus = 'error';
        profile.lastUpdateError = error.message;
        await profile.save();
      }
      
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
router.put('/update-scores', auth, async (req, res) => {
  try {
    // Check if usernames were provided in the request
    const providedUsernames = req.body.usernames || {};
    const preserveExistingUsernames = req.body.preserveExistingUsernames === true;
    console.log('Received usernames from request:', providedUsernames);
    console.log('Preserve existing usernames flag:', preserveExistingUsernames);
    
    // Get existing profiles
    const existingProfiles = await Profile.find({ userId: req.user.id });
    const profiles = [];
    const existingUsernamesByPlatform = {};
    
    // First collect existing usernames for reference
    for (const profile of existingProfiles) {
      existingUsernamesByPlatform[profile.platform] = profile.username;
    }
    
    // Get user to check profiles object
    const user = await User.findById(req.user.id);
    if (user && user.profiles) {
      Object.entries(user.profiles).forEach(([platform, username]) => {
        // If we don't have this username from Profile collection, add it from User object
        if (!existingUsernamesByPlatform[platform] && username) {
          const usernameValue = typeof username === 'object' ? 
            (username.username || '') : String(username);
          if (usernameValue && usernameValue.trim() !== '') {
            existingUsernamesByPlatform[platform] = usernameValue.trim();
          }
        }
      });
    }
    
    // Then handle existing profiles, updating usernames if needed
    for (const profile of existingProfiles) {
      // If a new username was provided for this platform, check if it's valid
      if (providedUsernames[profile.platform]) {
        const newUsername = providedUsernames[profile.platform].trim();
        
        if (newUsername && newUsername !== profile.username) {
          console.log(`Updating username for ${profile.platform} from ${profile.username} to ${newUsername}`);
          profile.username = newUsername;
          await profile.save();
        } else if (!newUsername && preserveExistingUsernames) {
          console.log(`Keeping existing username for ${profile.platform}: ${profile.username}`);
          // Keep existing username - don't update with empty value
        }
      }
      profiles.push(profile);
    }
    
    // Then create new profiles for platforms that don't have one yet
    const existingPlatforms = profiles.map(p => p.platform);
    for (const [platform, username] of Object.entries(providedUsernames)) {
      if (!existingPlatforms.includes(platform) && username.trim() !== '') {
        console.log(`Creating new profile for ${platform} with username ${username}`);
        const newProfile = new Profile({
          userId: req.user.id,
          platform,
          username: username.trim(),
          score: 0,
          problemsSolved: 0,
          lastUpdated: new Date(),
          updateAttempts: 0
        });
        await newProfile.save();
        profiles.push(newProfile);
      }
    }
    
    // Also create profiles for existing usernames from User.profiles that weren't in Profile collection
    if (preserveExistingUsernames) {
      for (const [platform, username] of Object.entries(existingUsernamesByPlatform)) {
        if (!existingPlatforms.includes(platform) && !providedUsernames[platform] && username) {
          console.log(`Creating new profile for ${platform} with existing username ${username}`);
          const newProfile = new Profile({
            userId: req.user.id,
            platform,
            username,
            score: 0,
            problemsSolved: 0,
            lastUpdated: new Date(),
            updateAttempts: 0
          });
          await newProfile.save();
          profiles.push(newProfile);
        }
      }
    }
    
    // Update the user.profiles object with the new usernames
    if (Object.keys(providedUsernames).length > 0) {
      const profilesUpdate = {};
      
      // First, get the final usernames from the profiles array
      const finalUsernames = {};
      profiles.forEach(profile => {
        finalUsernames[profile.platform] = profile.username;
      });
      
      // Then update only those that have a valid username
      Object.entries(finalUsernames).forEach(([platform, username]) => {
        if (username && username.trim() !== '') {
          profilesUpdate[`profiles.${platform}`] = username.trim();
        } else if (preserveExistingUsernames && user.profiles && user.profiles[platform]) {
          // Keep existing username in User.profiles if we're preserving existing values
          // and the new username is empty
          profilesUpdate[`profiles.${platform}`] = user.profiles[platform];
        }
      });
      
      if (Object.keys(profilesUpdate).length > 0) {
        await User.findByIdAndUpdate(
          req.user.id,
          { $set: profilesUpdate },
          { new: true }
        );
        console.log('Updated User.profiles with usernames');
      }
    }
    
    let totalScore = 0;
    let totalProblemsSolved = 0;
    const updatedProfiles = [];
    const platformTimings = {}; // Object to track how long each platform update takes
    
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
        const originalUsername = profile.username; // Store the original username
        profile.updateAttempts += 1;
        
        // Set a timeout for profile fetch operations
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        // Add a timestamp for tracking how long each platform takes
        const platformStartTime = Date.now();
        
        // Fetch profile data with timeout
        const platformDataPromise = platformAPIService.getProfileData(
          profile.platform,
          profile.username
        );
        
        let platformData;
        try {
          platformData = await Promise.race([platformDataPromise, timeoutPromise]);
        } catch (fetchError) {
          console.error(`Error fetching data for ${profile.platform}/${profile.username}:`, fetchError.message);
          
          // If this is a newly updated username and it failed, revert to the original username if available
          if (providedUsernames[profile.platform] && 
              providedUsernames[profile.platform] === profile.username &&
              existingUsernamesByPlatform[profile.platform] && 
              existingUsernamesByPlatform[profile.platform] !== profile.username) {
            
            console.log(`Invalid username detected for ${profile.platform}, reverting to original: ${existingUsernamesByPlatform[profile.platform]}`);
            
            // Revert the username
            profile.username = existingUsernamesByPlatform[profile.platform];
            await profile.save();
            
            // Try again with the original username
            platformData = await Promise.race([
              platformAPIService.getProfileData(profile.platform, profile.username),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on retry')), 10000))
            ]);
          } else {
            // If we can't revert, re-throw the error
            throw fetchError;
          }
        }

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
    
    // Update User.profiles with the final verified usernames from successful updates
    const finalVerifiedUsernames = {};
    updatedProfiles.forEach(profile => {
      if (profile.lastUpdateStatus === 'success') {
        finalVerifiedUsernames[profile.platform] = profile.username;
      }
    });
    
    // Update the User.profiles object with verified usernames
    if (Object.keys(finalVerifiedUsernames).length > 0) {
      const profilesUpdate = {};
      Object.entries(finalVerifiedUsernames).forEach(([platform, username]) => {
        if (username && username.trim() !== '') {
          profilesUpdate[`profiles.${platform}`] = username.trim();
        }
      });
      
      if (Object.keys(profilesUpdate).length > 0) {
        await User.findByIdAndUpdate(
          req.user.id,
          { $set: profilesUpdate },
          { new: true }
        );
        console.log('Updated User.profiles with verified usernames after sync');
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
            username: typeof user.profiles[platform] === 'object' ? 
              (user.profiles[platform].username || '') : 
              String(user.profiles[platform]),
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
    console.log('Updating profile for user:', req.user.id, JSON.stringify(req.body, null, 2));
    
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
      linkedinUrl,
      githubUrl
    } = req.body;

    // Build update fields object
    const updateFields = {
      mobileNumber: phone,
      section,
      skills: Array.isArray(skills) ? skills : [],
      interests: Array.isArray(interests) ? interests : [],
      about: about || '',
      linkedinUrl: linkedinUrl || ''
    };
    
    // Only add required fields if they're provided (to avoid potential validation issues)
    if (name) updateFields.name = name;
    if (department) updateFields.department = department;
    if (rollNumber) updateFields.rollNumber = rollNumber;
    if (graduationYear) updateFields.graduatingYear = graduationYear;
    
    // Handle GitHub URL if provided
    if (githubUrl) {
      updateFields['profiles.github'] = githubUrl;
    }

    try {
      // First get the user to validate the update
      const existingUser = await User.findById(req.user.id);
      
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Apply the updates to validate before saving
      Object.entries(updateFields).forEach(([key, value]) => {
        if (key.includes('.')) {
          // Handle nested properties like profiles.github
          const [parent, child] = key.split('.');
          if (!existingUser[parent]) existingUser[parent] = {};
          existingUser[parent][child] = value;
        } else {
          existingUser[key] = value;
        }
      });
      
      // Validate the user
      await existingUser.validate();
      
      // If validation passes, update the user
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password');
      
      // Format the response
      const profile = {
        user: user._id,
        name: user.name,
        email: user.email,
        phone: user.mobileNumber || user.phone || '',
        department: user.department || '',
        section: user.section || '',
        rollNumber: user.rollNumber || '',
        graduationYear: user.graduatingYear || new Date().getFullYear(),
        skills: user.skills || [],
        interests: user.interests || [],
        about: user.about || '',
        linkedinUrl: user.linkedinUrl || '',
        githubUrl: user.profiles?.github || ''
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile
      });
    } catch (validationError) {
      console.error('Validation error:', validationError);
      
      if (validationError.name === 'ValidationError') {
        const errors = {};
        
        // Format validation errors for response
        Object.keys(validationError.errors).forEach(field => {
          errors[field] = validationError.errors[field].message;
        });
        
        return res.status(400).json({
          message: 'Validation error',
          errors
        });
      }
      
      throw validationError; // Re-throw if not a validation error
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
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

/**
 * @route   GET /api/profiles/quick-sync
 * @desc    Quickly sync all profiles for the logged-in user
 * @access  Private
 */
router.get('/quick-sync', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all profiles for the user
    const profiles = await Profile.find({ userId });
    
    if (profiles.length === 0) {
      return res.json({
        success: true,
        message: 'No profiles found to sync',
        profiles: []
      });
    }
    
    console.log(`Starting quick sync for user ${userId} with ${profiles.length} profiles`);
    
    // Mark profiles as updating
    await Profile.updateMany(
      { userId },
      { 
        $set: { 
          lastUpdateAttempt: new Date(),
          lastUpdateStatus: 'updating'
        },
        $inc: { updateAttempts: 1 }
      }
    );
    
    // Start background sync without waiting for completion
    // This allows for a quick response to the frontend
    const syncProfilesInBackground = async () => {
      try {
        // Track updates for reporting
        const updatedProfiles = [];
        let totalScore = 0;
        let totalProblemsSolved = 0;
        
        // Process each profile
        for (const profile of profiles) {
          try {
            const { platform, username } = profile;
            console.log(`Background sync: Processing ${platform}/${username}`);
            
            const platformData = await platformAPIService.getProfileData(platform, username);
            
            // Update profile with fresh data
            const updates = { 
              score: platformData.score || 0,
              problemsSolved: platformData.problemsSolved || 0,
              lastUpdated: new Date(),
              lastUpdateStatus: 'success',
              lastUpdateError: null
            };
            
            // Add platform-specific fields
            if (platform === 'leetcode') {
              updates.easyProblemsSolved = platformData.easyProblemsSolved || 0;
              updates.mediumProblemsSolved = platformData.mediumProblemsSolved || 0;
              updates.hardProblemsSolved = platformData.hardProblemsSolved || 0;
              updates.ranking = platformData.ranking || 0;
              updates.contestsParticipated = platformData.contestsParticipated || 0;
              updates.rating = platformData.rating || 0;
            } else if (platform === 'codeforces') {
              updates.rating = platformData.rating || 0;
              updates.maxRating = platformData.maxRating || 0;
              updates.rank = platformData.rank || 'unrated';
              updates.contestsParticipated = platformData.contestsParticipated || 0;
            } else if (platform === 'codechef') {
              updates.rating = platformData.rating || 0;
              updates.globalRank = platformData.global_rank || 0;
              updates.countryRank = platformData.country_rank || 0;
              updates.contestsParticipated = platformData.contestsParticipated || 0;
            } else if (platform === 'github') {
              updates.details = {
                publicRepos: platformData.publicRepos || 0,
                totalCommits: platformData.totalCommits || 0,
                followers: platformData.followers || 0,
                following: platformData.following || 0,
                starsReceived: platformData.starsReceived || 0,
                score: platformData.score || 0,
                lastUpdated: new Date()
              };
            }
            
            // Save profile updates
            await Profile.findByIdAndUpdate(profile._id, updates);
            
            // Track for total score calculation
            totalScore += platformData.score || 0;
            totalProblemsSolved += platformData.problemsSolved || 0;
            
            updatedProfiles.push({
              platform,
              username,
              score: platformData.score || 0,
              problemsSolved: platformData.problemsSolved || 0,
              lastUpdated: new Date(),
              lastUpdateStatus: 'success'
            });
            
          } catch (profileError) {
            console.error(`Error syncing ${profile.platform}/${profile.username}:`, profileError);
            
            // Mark this profile as failed
            await Profile.findByIdAndUpdate(profile._id, {
              lastUpdateStatus: 'error',
              lastUpdateError: profileError.message,
              lastUpdateAttempt: new Date()
            });
          }
        }
        
        // Update user document with new totals
        await User.findByIdAndUpdate(userId, {
          totalScore,
          totalProblemsSolved,
          lastProfileSync: new Date()
        });
        
        console.log(`Background sync completed for user ${userId}. Updated ${updatedProfiles.length}/${profiles.length} profiles.`);
      } catch (syncError) {
        console.error(`Background sync error for user ${userId}:`, syncError);
      }
    };
    
    // Start the background process without waiting
    syncProfilesInBackground().catch(err => {
      console.error('Background sync process error:', err);
    });
    
    // Return immediately with profiles that will be updated
    res.json({
      success: true,
      message: `Sync started for ${profiles.length} profiles. Results will be available shortly.`,
      profiles: profiles.map(p => ({
        platform: p.platform,
        username: p.username,
        lastUpdateStatus: 'updating'
      }))
    });
    
  } catch (err) {
    console.error('Quick sync error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error starting sync process', 
      error: err.message 
    });
  }
});

// Get all coding platform usernames for a user
router.get('/usernames', auth, async (req, res) => {
  try {
    // First get usernames from the User model profiles object
    const user = await User.findById(req.user.id).select('profiles platformData');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Then get profiles from the Profile collection
    const profileDocs = await Profile.find({ userId: req.user.id });
    
    // Create a combined result with usernames from all sources
    const platforms = ['leetcode', 'codeforces', 'codechef', 'geeksforgeeks', 'hackerrank', 'github'];
    const result = {};
    
    // Initialize result object with empty values
    platforms.forEach(platform => {
      result[platform] = {
        username: '',
        lastUpdated: null
      };
    });
    
    // Add usernames from User.profiles object
    if (user.profiles) {
      platforms.forEach(platform => {
        if (user.profiles[platform]) {
          // Ensure username is a string
          const username = user.profiles[platform];
          result[platform].username = typeof username === 'object' ? 
            (username.username || '') : // If it's an object with a username property, use that
            String(username); // Otherwise convert to string
        }
      });
    }
    
    // Add usernames from User.platformData object
    if (user.platformData) {
      Object.entries(user.platformData).forEach(([platform, data]) => {
        if (data && data.username) {
          // Ensure username is a string
          result[platform].username = typeof data.username === 'object' ?
            '' : // If it's an object, use empty string
            String(data.username); // Otherwise convert to string
          result[platform].lastUpdated = data.lastUpdated;
        }
      });
    }
    
    // Override with Profile documents if they exist (most authoritative source)
    profileDocs.forEach(profile => {
      if (platforms.includes(profile.platform)) {
        // Ensure username is a string
        result[profile.platform].username = typeof profile.username === 'object' ?
          '' : // If it's an object, use empty string
          String(profile.username); // Otherwise convert to string
        result[profile.platform].lastUpdated = profile.lastUpdated;
      }
    });
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching user platform usernames:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all profile stats for the current user
router.get('/stats', auth, async (req, res) => {
  try {
    // Find all profiles for the current user
    const profiles = await Profile.find({ userId: req.user.id });
    
    if (!profiles || profiles.length === 0) {
      return res.json({
        success: true,
        message: 'No profiles found',
        profiles: []
      });
    }
    
    // Format the profile data
    const formattedProfiles = profiles.map(profile => {
      const baseData = {
        platform: profile.platform,
        username: profile.username,
        score: profile.score || 0,
        problemsSolved: profile.problemsSolved || 0,
        lastUpdated: profile.lastUpdated,
        lastUpdateStatus: profile.lastUpdateStatus
      };
      
      // Add platform-specific fields
      if (profile.platform === 'github') {
        return {
          ...baseData,
          publicRepos: profile.details?.publicRepos || 0,
          totalCommits: profile.details?.totalCommits || 0,
          followers: profile.details?.followers || 0,
          following: profile.details?.following || 0,
          starsReceived: profile.details?.starsReceived || 0
        };
      } else {
        return {
          ...baseData,
          rating: profile.rating || 0,
          rank: profile.rank || 'unrated',
          easyProblemsSolved: profile.easyProblemsSolved || 0,
          mediumProblemsSolved: profile.mediumProblemsSolved || 0,
          hardProblemsSolved: profile.hardProblemsSolved || 0,
          contestsParticipated: profile.contestsParticipated || 0,
          globalRank: profile.globalRank || 0,
          countryRank: profile.countryRank || 0
        };
      }
    });
    
    // Calculate total score across all platforms
    const totalScore = profiles.reduce((sum, profile) => sum + (profile.score || 0), 0);
    
    res.json({
      success: true,
      totalScore,
      profiles: formattedProfiles
    });
    
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching profile stats'
    });
  }
});

module.exports = router;
