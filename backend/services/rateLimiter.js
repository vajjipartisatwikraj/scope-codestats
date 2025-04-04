const rateLimit = require('express-rate-limit');
const Profile = require('../models/Profile');

// Create a limiter for API endpoints
const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests, please try again later.'
    }
  });
};

// Different rate limits for different platforms
const platformLimits = {
  leetcode: createRateLimiter(60 * 1000, 10),     // 10 requests per minute
  codeforces: createRateLimiter(60 * 1000, 5),    // 5 requests per minute
  codechef: createRateLimiter(60 * 1000, 10),     // 10 requests per minute
  geeksforgeeks: createRateLimiter(60 * 1000, 15),// 15 requests per minute
  hackerrank: createRateLimiter(60 * 1000, 10)    // 10 requests per minute
};

// User profile update rate limiter
// This function checks if a user can update a specific platform profile
// based on the last update time
const checkProfileUpdateRateLimit = async (userId, platform) => {
  try {
    // Find the user's profile for the given platform
    const profile = await Profile.findOne({ userId, platform });
    
    // If profile doesn't exist or has never been updated, allow the update
    if (!profile || !profile.lastUpdateAttempt) {
      return { allowed: true };
    }
    
    // Get the cooldown time (12 hours = 43200000 ms)
    const cooldownTime = 12 * 60 * 60 * 1000; 
    
    // Calculate time since last update
    const now = new Date();
    const lastUpdate = new Date(profile.lastUpdateAttempt);
    const timeSinceLastUpdate = now - lastUpdate;
    
    // If less than cooldown time has passed
    if (timeSinceLastUpdate < cooldownTime) {
      // Calculate remaining time in seconds
      const remainingTime = Math.ceil((cooldownTime - timeSinceLastUpdate) / 1000);
      
      return { 
        allowed: false, 
        message: `Please wait ${remainingTime} seconds before updating your ${platform} profile again.`,
        remainingTime
      };
    }
    
    // Allow the update if cooldown period has passed
    return { allowed: true };
  } catch (error) {
    console.error("Error checking profile update rate limit:", error);
    // In case of error, default to allowing the update to prevent blocking users unnecessarily
    return { allowed: true };
  }
};

module.exports = {
  platformLimits,
  checkProfileUpdateRateLimit
};
