/**
 * Cron Job: Update User Platform Profiles
 * 
 * This script updates all users' coding platform profiles at 2:00 AM IST
 * and logs comprehensive statistics about the update process.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const cron = require('node-cron');
const User = require('../models/User');
const axios = require('axios');
const connectDB = require('../config/db');
const fs = require('fs');
const path = require('path');

// Set the base URL for API calls
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const API_KEY = process.env.CRON_API_KEY || 'default-cron-key';

// MongoDB Connection (with fallback)
const connectToMongoDB = async () => {
  try {
    return await connectDB();
  } catch (error) {
    console.log('Falling back to direct MongoDB connection');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cp-tracker';
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected Successfully (fallback)');
    return conn;
  }
};

// Setup logging
const setupLogging = () => {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(logDir, `profile-update-${date}.log`);
  
  // Create a write stream for logging
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Custom logger
  const logger = {
    log: (message) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      console.log(message);
      logStream.write(logMessage);
    },
    error: (message, error) => {
      const timestamp = new Date().toISOString();
      const errorMessage = error ? `${message}: ${error.message}\n${error.stack}\n` : `${message}\n`;
      const logMessage = `[${timestamp}] ERROR: ${errorMessage}`;
      console.error(`ERROR: ${message}`, error);
      logStream.write(logMessage);
    },
    close: () => {
      logStream.end();
    }
  };
  
  return logger;
};

// Platform-specific rate limiting tracker
const rateLimitingTracker = {
  lastRequest: {
    github: 0,
    leetcode: 0,
    codeforces: 0,
    codechef: 0,
    geeksforgeeks: 0,
    hackerrank: 0
  },
  delays: {
    github: 1000,       // 1 request per second (GitHub has strict limits)
    leetcode: 2000,      // Increased: 1 request per 2 seconds (from 500ms)
    codeforces: 5000,   // Increased: 1 request per 5 seconds (from 1000ms)
    codechef: 6000,     // Increased: 1 request per 6 seconds (from 2000ms)
    geeksforgeeks: 2000, // Increased: 1 request per 2 seconds (from 750ms)
    hackerrank: 1500     // Increased: 1 request per 1.5 seconds (from 500ms)
  },
  // Track platforms currently being processed
  activeRequests: {
    github: 0,
    leetcode: 0,
    codeforces: 0,
    codechef: 0,
    geeksforgeeks: 0,
    hackerrank: 0
  },
  // Maximum concurrent requests per platform
  maxConcurrent: {
    github: 1,         // Only 1 GitHub request at a time
    leetcode: 1,        // Reduced: Only 1 concurrent LeetCode request (from 3)
    codeforces: 1,      // Reduced: Only 1 concurrent Codeforces request (from 2)
    codechef: 1,        // Only 1 CodeChef request at a time
    geeksforgeeks: 1,   // Reduced: Only 1 concurrent GeeksforGeeks request (from 2)
    hackerrank: 1       // Reduced: Only 1 concurrent HackerRank request (from 3)
  }
};

/**
 * Update a single user's platform profiles
 * @param {Object} user - User document
 * @param {Object} logger - Logger instance
 * @param {Object} stats - Statistics object
 * @returns {Object} Updated statistics
 */
const updateUserPlatforms = async (user, logger, stats) => {
  try {
    const startTime = Date.now();
    logger.log(`Starting update for user ${user.name} (${user.email})`);
    
    // Call API to update user profiles
    const response = await axios.put(
      `${API_BASE_URL}/profiles/update-user/${user._id}`,
      {},
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120 second timeout (increased from 60s)
      }
    );
    
    const elapsedTime = Date.now() - startTime;
    
    if (response.data.success) {
      // Count successful and failed profile updates
      const successfulProfiles = response.data.profiles.filter(p => p.lastUpdateStatus === 'success');
      const failedProfiles = response.data.profiles.filter(p => p.lastUpdateStatus === 'error');
      
      stats.updatedProfiles += successfulProfiles.length;
      stats.failedProfiles += failedProfiles.length;
      stats.totalProfiles += response.data.profiles.length;
      stats.updatedUsers++;
      stats.totalTime += elapsedTime;
      
      // Track per-platform statistics
      successfulProfiles.forEach(profile => {
        stats.profilesByPlatform[profile.platform] = (stats.profilesByPlatform[profile.platform] || 0) + 1;
      });
      
      logger.log(
        `Successfully updated user ${user.name} with ${successfulProfiles.length} profiles ` +
        `(failed: ${failedProfiles.length}). Total score: ${response.data.totalScore}. ` +
        `Took ${elapsedTime}ms`
      );
      
      // Log any failed profiles with detailed error information
      if (failedProfiles.length > 0) {
        logger.error(`${failedProfiles.length} profile updates failed for user ${user.name}:`);
        
        failedProfiles.forEach(profile => {
          const errorDetails = profile.lastUpdateError || profile.error || 'Unknown error';
          const errorCode = profile.errorCode || 'UNKNOWN';
          
          // Log to console with color for better visibility in terminal
          console.error(`\x1b[31m[ERROR]\x1b[0m ${profile.platform.toUpperCase()} for ${user.name} (${profile.username}): ${errorDetails}`);
          // Log details to the log file as well
          logger.error(`Failed to update ${profile.platform} for ${user.name} (${profile.username}): [${errorCode}] ${errorDetails}`);
          
          stats.failuresByPlatform[profile.platform] = (stats.failuresByPlatform[profile.platform] || 0) + 1;
        });
        
        // Log platform-specific error counts
        const failedPlatformCounts = Object.entries(stats.failuresByPlatform)
          .map(([platform, count]) => `${platform}: ${count}`)
          .join(', ');
        console.error(`\x1b[33m[SUMMARY]\x1b[0m Failed updates by platform: ${failedPlatformCounts}`);
      }
      
    } else {
      stats.failedUsers++;
      const errorMsg = response.data.message || 'No error message provided';
      console.error(`\x1b[31m[ERROR]\x1b[0m Failed to update user ${user.name} (${user.email}): ${errorMsg}`);
      logger.error(`Failed to update user ${user.name}`, new Error(errorMsg));
    }
  } catch (error) {
    stats.failedUsers++;
    
    // Enhanced error logging for network and timeout errors
    const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const statusCode = error.response?.status || '';
    const statusText = error.response?.statusText || '';
    
    // Log with color coding for terminal visibility
    console.error(`\x1b[31m[FATAL ERROR]\x1b[0m Error updating user ${user.name} (${user.email}): ${errorCode} ${statusCode} ${statusText}`);
    console.error(`\x1b[31m[DETAILS]\x1b[0m ${errorMsg}`);
    
    // Log to file with more details
    logger.error(`Error updating user ${user.name} (${user.email})`, error);
    
    // If it's a timeout error, add more context
    if (error.code === 'ECONNABORTED' || errorMsg.includes('timeout')) {
      console.error(`\x1b[33m[TIMEOUT]\x1b[0m Request timed out after 120 seconds for user ${user.name}`);
    }
  }
  
  return stats;
};

/**
 * Delay execution based on platform rate limits with exponential backoff for rate-limited platforms
 * @param {string} platform - Platform name
 * @param {boolean} wasRateLimited - Whether the previous request was rate limited
 * @returns {Promise} - Resolves when it's safe to proceed
 */
const applyRateLimit = async (platform, wasRateLimited = false) => {
  if (!rateLimitingTracker.lastRequest[platform]) {
    rateLimitingTracker.lastRequest[platform] = Date.now();
    return;
  }
  
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimitingTracker.lastRequest[platform];
  let requiredDelay = rateLimitingTracker.delays[platform];
  
  // Apply exponential backoff for platforms that are frequently rate limited
  if (wasRateLimited) {
    // If the platform was just rate limited, use a much longer delay
    // For CodeChef and Codeforces specifically, be extra cautious
    if (platform === 'codechef' || platform === 'codeforces') {
      requiredDelay = requiredDelay * 5; // 5x normal delay for these platforms when rate limited
      console.log(`\x1b[33m[RATE LIMIT BACKOFF]\x1b[0m Applying extended delay (${requiredDelay}ms) for ${platform} due to rate limiting`);
    } else if (platform === 'leetcode') {
      requiredDelay = requiredDelay * 3; // 3x normal delay for LeetCode when rate limited
      console.log(`\x1b[33m[RATE LIMIT BACKOFF]\x1b[0m Applying extended delay (${requiredDelay}ms) for ${platform} due to rate limiting`);
    } else {
      requiredDelay = requiredDelay * 2; // 2x normal delay for other platforms
    }
  }
  
  // Check active requests against max concurrent
  const activeRequests = rateLimitingTracker.activeRequests[platform] || 0;
  const maxConcurrent = rateLimitingTracker.maxConcurrent[platform] || 1;
  
  if (activeRequests >= maxConcurrent) {
    // Wait for active requests to decrease
    const concurrencyDelayMs = 1000; // Wait 1 second and check again
    console.log(`\x1b[36m[CONCURRENCY]\x1b[0m Waiting for ${platform} active requests to decrease (${activeRequests}/${maxConcurrent})`);
    await new Promise(resolve => setTimeout(resolve, concurrencyDelayMs));
    return applyRateLimit(platform, wasRateLimited); // Recursive call to check again
  }
  
  if (timeSinceLastRequest < requiredDelay) {
    const delayMs = requiredDelay - timeSinceLastRequest;
    if (delayMs > 1000) { // Only log delays longer than 1 second
      console.log(`\x1b[36m[RATE LIMIT]\x1b[0m Waiting ${(delayMs/1000).toFixed(1)}s before next ${platform} request`);
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  // Update the last request time and increment active requests
  rateLimitingTracker.lastRequest[platform] = Date.now();
  rateLimitingTracker.activeRequests[platform] = (rateLimitingTracker.activeRequests[platform] || 0) + 1;
  
  return () => {
    // This function should be called when the request is complete to decrement active requests
    rateLimitingTracker.activeRequests[platform] = Math.max(0, (rateLimitingTracker.activeRequests[platform] || 1) - 1);
  };
};

/**
 * Main function to update all users' platform profiles
 */
const updateAllUserProfiles = async () => {
  let logger = null;
  
  try {
    // Setup logging
    logger = setupLogging();
    logger.log('Starting profile update process');
    console.log('\x1b[36m[START]\x1b[0m Starting profile update process at', new Date().toISOString());
    
    // Connect to MongoDB
    await connectToMongoDB();
    logger.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({});
    logger.log(`Found ${users.length} users to process`);
    console.log(`\x1b[36m[INFO]\x1b[0m Found ${users.length} users to process`);
    
    // Initialize statistics
    const stats = {
      totalUsers: users.length,
      updatedUsers: 0,
      failedUsers: 0,
      totalProfiles: 0,
      updatedProfiles: 0,
      failedProfiles: 0,
      totalTime: 0,
      startTime: Date.now(),
      profilesByPlatform: {},
      failuresByPlatform: {},
      errorsByType: {},
      concurrencyStats: {
        maxActiveUsers: 0,
        totalIdleTime: 0
      }
    };
    
    // Process users in batches to avoid memory issues
    // Reducing batch size to prevent overwhelming the APIs
    const BATCH_SIZE = 10; // Reduced from 20 to 10
    let processedCount = 0;
    
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();
      
      try {
        // Process batch with concurrency control
        await Promise.all(batch.map(async (user) => {
          // Apply global rate limiting with jitter to spread out requests
          const jitterMs = Math.floor(Math.random() * 500);
          await new Promise(resolve => setTimeout(resolve, jitterMs));
          
          try {
            await updateUserPlatforms(user, logger, stats);
          } catch (userError) {
            // Log individual user errors to prevent batch failure
            console.error(`\x1b[31m[USER ERROR]\x1b[0m Failed to process user ${user.name} (${user.email}): ${userError.message}`);
            logger.error(`Individual user error for ${user.name}`, userError);
            stats.failedUsers++;
          }
          
          processedCount++;
          
          if (processedCount % 20 === 0 || processedCount === users.length) {
            const percent = Math.round(processedCount / users.length * 100);
            logger.log(`Progress: ${processedCount}/${users.length} users (${percent}%)`);
            console.log(`\x1b[32m[PROGRESS]\x1b[0m ${processedCount}/${users.length} users (${percent}%) completed`);
            
            // Print current success/failure rates
            if (stats.totalProfiles > 0) {
              const successRate = ((stats.updatedProfiles / stats.totalProfiles) * 100).toFixed(2);
              console.log(`\x1b[36m[STATUS]\x1b[0m Success rate: ${successRate}% (${stats.updatedProfiles}/${stats.totalProfiles} profiles)`);
            }
          }
        }));
      } catch (batchError) {
        // Log batch error but continue with the next batch
        console.error(`\x1b[31m[BATCH ERROR]\x1b[0m Batch ${Math.ceil(i/BATCH_SIZE) + 1} failed: ${batchError.message}`);
        logger.error(`Error processing batch ${Math.ceil(i/BATCH_SIZE) + 1}`, batchError);
      }
      
      // Log batch completion time
      const batchTime = Date.now() - batchStartTime;
      logger.log(`Batch ${Math.ceil(i/BATCH_SIZE) + 1}/${Math.ceil(users.length/BATCH_SIZE)} completed in ${batchTime/1000} seconds`);
      console.log(`\x1b[36m[BATCH]\x1b[0m Batch ${Math.ceil(i/BATCH_SIZE) + 1}/${Math.ceil(users.length/BATCH_SIZE)} completed in ${(batchTime/1000).toFixed(2)} seconds`);
      
      // Add a small pause between batches to prevent overwhelming the server
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Calculate final statistics
    const totalTimeSeconds = (Date.now() - stats.startTime) / 1000;
    const avgProfileTime = stats.totalTime / stats.updatedProfiles || 0;
    
    // Log final statistics with color formatting for terminal visibility
    console.log('\n\x1b[35m========= FINAL STATISTICS =========\x1b[0m');
    console.log(`\x1b[36m[STATS]\x1b[0m Total users processed: ${stats.totalUsers}`);
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Users updated: ${stats.updatedUsers}`);
    console.log(`\x1b[31m[FAILURE]\x1b[0m Users failed: ${stats.failedUsers}`);
    console.log(`\x1b[36m[STATS]\x1b[0m Total profiles attempted: ${stats.totalProfiles}`);
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Profiles updated: ${stats.updatedProfiles}`);
    console.log(`\x1b[31m[FAILURE]\x1b[0m Profiles failed: ${stats.failedProfiles}`);
    console.log(`\x1b[36m[STATS]\x1b[0m Average time per profile: ${Math.round(avgProfileTime)}ms`);
    console.log(`\x1b[36m[STATS]\x1b[0m Total execution time: ${totalTimeSeconds.toFixed(2)} seconds`);
    
    // Log per-platform statistics with color coding
    console.log('\n\x1b[35m========= PLATFORM STATISTICS =========\x1b[0m');
    for (const platform in stats.profilesByPlatform) {
      const successful = stats.profilesByPlatform[platform] || 0;
      const failed = stats.failuresByPlatform[platform] || 0;
      const total = successful + failed;
      const successRate = total > 0 ? (successful / total * 100).toFixed(2) : '0.00';
      
      // Color-code based on success rate
      let colorCode = '\x1b[32m'; // Green for good success rate
      if (successRate < 90) colorCode = '\x1b[33m'; // Yellow for moderate success rate
      if (successRate < 70) colorCode = '\x1b[31m'; // Red for poor success rate
      
      console.log(`${colorCode}[${platform.toUpperCase()}]\x1b[0m ${successful}/${total} successful (${successRate}% success rate)`);
      
      // If failures, log how many
      if (failed > 0) {
        console.log(`\x1b[33m[WARNING]\x1b[0m ${platform} had ${failed} failed profile updates`);
      }
    }
    
    // Log regular entries for the log file
    logger.log('\n--- FINAL STATISTICS ---');
    logger.log(`Total users processed: ${stats.totalUsers}`);
    logger.log(`Users updated: ${stats.updatedUsers}`);
    logger.log(`Users failed: ${stats.failedUsers}`);
    logger.log(`Total profiles attempted: ${stats.totalProfiles}`);
    logger.log(`Profiles updated: ${stats.updatedProfiles}`);
    logger.log(`Profiles failed: ${stats.failedProfiles}`);
    logger.log(`Average time per profile: ${Math.round(avgProfileTime)}ms`);
    logger.log(`Total execution time: ${totalTimeSeconds.toFixed(2)} seconds`);
    
    // Log per-platform statistics
    logger.log('\n--- PLATFORM STATISTICS ---');
    for (const platform in stats.profilesByPlatform) {
      const successful = stats.profilesByPlatform[platform] || 0;
      const failed = stats.failuresByPlatform[platform] || 0;
      const total = successful + failed;
      const successRate = total > 0 ? (successful / total * 100).toFixed(2) : '0.00';
      
      logger.log(`${platform}: ${successful}/${total} successful (${successRate}% success rate)`);
    }
    
    logger.log('Profile update process completed\n');
    console.log('\x1b[36m[COMPLETE]\x1b[0m Profile update process completed at', new Date().toISOString());
    
  } catch (error) {
    // Enhanced fatal error logging with context 
    const errorMsg = error.message || 'Unknown error';
    const errorStack = error.stack || '';
    
    console.error('\x1b[41m\x1b[37m[FATAL ERROR]\x1b[0m Fatal error in profile update process:');
    console.error(`\x1b[31m[ERROR MESSAGE]\x1b[0m ${errorMsg}`);
    console.error(`\x1b[31m[STACK TRACE]\x1b[0m\n${errorStack}`);
    
    if (logger) {
      logger.error('Fatal error in profile update process', error);
    } else {
      console.error('Fatal error in profile update process', error);
    }
  } finally {
    // Close database connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      if (logger) {
        logger.log('MongoDB connection closed');
        logger.close();
      } else {
        console.log('MongoDB connection closed');
      }
    }
  }
};

// If running as standalone script
if (require.main === module) {
  // Schedule cron job for 2:00 AM IST (UTC+5:30)
  // This is 20:30 UTC of the previous day
  cron.schedule('30 20 * * *', () => {
    console.log('Running scheduled profile update at 2:00 AM IST');
    updateAllUserProfiles();
  });
  
  console.log('Cron job scheduled for 2:00 AM IST (20:30 UTC)');
} else {
  // Export function for manual execution or testing
  module.exports = updateAllUserProfiles;
} 