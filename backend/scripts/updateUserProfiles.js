/**
 * Cron Job: Update User Platform Profiles
 * 
 * This script updates all users' coding platform profiles at 1:40 PM IST
 * and logs comprehensive statistics about the update process.
 * 
 * This module can be used in three ways:
 * 1. Scheduled cron job (automatically runs at 1:40 PM IST)
 * 2. Manual execution via command line: node run-sync.js
 * 3. Admin-triggered via Admin Dashboard (using the sync-profiles endpoint)
 * 
 * When triggered from the Admin Dashboard, the script accepts a progressState
 * object that is updated during execution to show real-time progress.
 */
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const cron = require('node-cron');
const User = require('../models/User');
const axios = require('axios');
const connectDB = require('../config/db');
const fs = require('fs');


// Set the base URL for API calls
const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.CRON_API_KEY;

// MongoDB Connection (with fallback)
const connectToMongoDB = async () => {
  try {
    return await connectDB();
  } catch (error) {
    console.log('Falling back to direct MongoDB connection');
    const mongoURI = process.env.MONGODB_URI;
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
  // Removed: No longer create logs directory or log files
  // const logDir = path.join(__dirname, '../logs');
  // if (!fs.existsSync(logDir)) {
  //   fs.mkdirSync(logDir, { recursive: true });
  // }
  
  // const date = new Date().toISOString().split('T')[0];
  // const logFile = path.join(logDir, `profile-update-${date}.log`);
  
  // Create a write stream for logging
  // const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Custom logger - only logs to console, no file logging
  const logger = {
    log: (message) => {
      const timestamp = new Date().toISOString();
      console.log(message);
      // Removed: logStream.write(logMessage);
    },
    error: (message, error) => {
      const timestamp = new Date().toISOString();
      const errorMessage = error ? `${message}: ${error.message}\n${error.stack}\n` : `${message}\n`;
      console.error(`ERROR: ${message}`, error);
      // Removed: logStream.write(logMessage);
    },
    close: () => {
      // No-op - no stream to close
      // Removed: logStream.end();
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
    codechef: 12000,     // Increased: 1 request per 12 seconds (from 6000ms)
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
          
          // Store the failed profile details in a list for display in the admin dashboard
          if (!stats.failedProfilesList) {
            stats.failedProfilesList = [];
          }
          
          stats.failedProfilesList.push({
            userId: user._id.toString(),
            userName: user.name,
            userEmail: user.email,
            platform: profile.platform,
            platformUsername: profile.username,
            error: errorDetails,
            errorCode: errorCode,
            timestamp: new Date().toISOString()
          });
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
 * @param {Object} progressState - Optional object to track progress (for admin dashboard)
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise} - Resolves when update process is complete
 */
const updateAllUserProfiles = async (progressState = null, signal = null) => {
  let logger = null;
  let dbConnection = null;
  let cleanupFunctions = [];
  
  // Helper to run cleanup functions
  const runCleanup = async () => {
    for (const cleanup of cleanupFunctions) {
      try {
        if (typeof cleanup === 'function') {
          await cleanup();
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  };
  
  try {
    // Setup logging
    logger = setupLogging();
    cleanupFunctions.push(() => {
      if (logger) {
        try {
          logger.close();
        } catch (e) {
          console.error('Error closing logger:', e);
        }
      }
    });
    
    logger.log('Starting profile update process');
    console.log('\x1b[36m[START]\x1b[0m Starting profile update process at', new Date().toISOString());
    
    // Handle abort signal if provided
    if (signal) {
      signal.addEventListener('abort', async () => {
        logger.log('Received abort signal - cancelling sync operation');
        
        // Update progress state
        if (progressState) {
          progressState.inProgress = false;
          progressState.cancelled = true;
          progressState.completedTime = Date.now();
          progressState.error = "Operation aborted by signal";
        }
        
        // Run cleanup functions
        await runCleanup();
      }, { once: true });
    }
    
    // Connect to MongoDB
    dbConnection = await connectToMongoDB();
    cleanupFunctions.push(async () => {
      try {
        // DO NOT close the main MongoDB connection - this will break other routes
        // Instead, just log that we're keeping the connection open
        console.log('Cleanup: Keeping MongoDB connection open for other operations');
        
        // If we're running in a test environment or standalone script, then close
        if (process.env.NODE_ENV === 'test' || require.main === module) {
          if (mongoose.connection.readyState !== 0) { // 0 = disconnected
            await mongoose.connection.close();
            console.log('MongoDB connection closed (test/standalone mode)');
          }
        }
      } catch (e) {
        console.error('Error during MongoDB cleanup:', e);
      }
    });
    
    logger.log('Connected to MongoDB');
    
    // Check if already cancelled before starting
    if (progressState && (progressState.cancelled || !progressState.inProgress || (signal && signal.aborted))) {
      logger.log('Sync operation was cancelled before starting user processing');
      await runCleanup();
      return { cancelled: true, message: "Operation cancelled before starting" };
    }
    
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
      failedProfilesList: [], // Initialize empty array to store failed profile details
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
    
    // Update progress state if provided (for admin dashboard)
    if (progressState) {
      progressState.totalUsers = users.length;
      progressState.startTime = Date.now();
      progressState.failedProfilesList = []; // Initialize the failedProfilesList in progressState
    }
    
    // Process users in batches to avoid memory issues
    const BATCH_SIZE = 2; // Reduced from 5 to 2 to further lower server load and prevent rate limiting
    let processedCount = 0;
    
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      // Check for cancellation before each batch
      if (signal && signal.aborted) {
        logger.log('Sync operation aborted before batch processing');
        break;
      }
      
      if (progressState && (progressState.cancelled || !progressState.inProgress)) {
        logger.log('Sync operation cancelled before batch processing');
        break;
      }
      
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();
      
      try {
        // Process batch with controlled concurrency and cancellation checks
        const batchPromises = batch.map(async (user) => {
          // Check for cancellation before each user
          if (signal && signal.aborted) {
            return; // Skip this user
          }
          
          if (progressState && (progressState.cancelled || !progressState.inProgress)) {
            return; // Skip this user
          }
          
          // Apply rate limiting with jitter
          const jitterMs = Math.floor(Math.random() * 300);
          await new Promise(resolve => setTimeout(resolve, jitterMs));
          
          try {
            // Process the user
            await updateUserPlatforms(user, logger, stats);
          } catch (userError) {
            console.error(`\x1b[31m[USER ERROR]\x1b[0m Failed to process user ${user.name || user.email || user._id}: ${userError.message}`);
            logger.error(`Individual user error for ${user.name || user.email || user._id}`, userError);
            stats.failedUsers++;
            
            if (progressState) {
              progressState.failedUsers = (progressState.failedUsers || 0) + 1;
            }
          } finally {
            // Increment processed count regardless of success/failure
            processedCount++;
            
            // Update progress
            if (progressState) {
              // Update with proper locking to avoid race conditions
              try {
                // Calculate current progress percentage
                const percent = Math.round(processedCount / users.length * 100);
                
                // Update all fields atomically
                progressState.processedUsers = processedCount;
                progressState.updatedProfiles = stats.updatedProfiles;
                progressState.failedProfiles = stats.failedProfiles;
                progressState.totalProfiles = stats.totalProfiles;
                progressState.failedProfilesList = stats.failedProfilesList || [];
                
                // Add a lastUpdated timestamp to help detect stalled processes
                progressState.lastUpdated = Date.now();
                
                // Log more detailed progress information
                console.log(`Progress state updated: ${processedCount}/${users.length} users (${percent}%), ` +
                           `updated: ${stats.updatedProfiles}, failed: ${stats.failedProfiles}, ` +
                           `at ${new Date().toISOString()}`);
              } catch (progressUpdateError) {
                console.error('Error updating progress state:', progressUpdateError);
                // Continue processing even if progress update fails
              }
            }
            
            // Log progress periodically
            if (processedCount % 10 === 0 || processedCount === users.length) {
              const percent = Math.round(processedCount / users.length * 100);
              logger.log(`Progress: ${processedCount}/${users.length} users (${percent}%)`);
              console.log(`\x1b[32m[PROGRESS]\x1b[0m ${processedCount}/${users.length} users (${percent}%) completed`);
            }
          }
        });
        
        // Wait for all promises with timeout protection
        await Promise.race([
          Promise.all(batchPromises),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Batch timeout exceeded (3 minutes)'));
            }, 180000); // 3 minutes timeout
          })
        ]);
      } catch (batchError) {
        console.error(`\x1b[31m[BATCH ERROR]\x1b[0m Batch ${Math.ceil(i/BATCH_SIZE) + 1} failed: ${batchError.message}`);
        logger.error(`Error processing batch ${Math.ceil(i/BATCH_SIZE) + 1}`, batchError);
        
        // Check if we need to abort due to timeout
        if (batchError.message.includes('timeout')) {
          if (progressState) {
            progressState.error = `Batch timeout: ${batchError.message}`;
          }
          // Continue with next batch, don't abort the whole process
        }
      }
      
      // Check for cancellation after batch
      if (signal && signal.aborted) {
        logger.log('Sync operation aborted after batch processing');
        break;
      }
      
      if (progressState && (progressState.cancelled || !progressState.inProgress)) {
        logger.log('Sync operation cancelled after batch processing');
        break;
      }
      
      // Log batch completion
      const batchTime = Date.now() - batchStartTime;
      logger.log(`Batch ${Math.ceil(i/BATCH_SIZE) + 1}/${Math.ceil(users.length/BATCH_SIZE)} completed in ${batchTime/1000} seconds`);
      console.log(`\x1b[36m[BATCH]\x1b[0m Batch ${Math.ceil(i/BATCH_SIZE) + 1}/${Math.ceil(users.length/BATCH_SIZE)} completed in ${(batchTime/1000).toFixed(2)} seconds`);
      
      // Add a small pause between batches
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds
      }
    }
    
    // Check if cancelled after all batches
    if (signal && signal.aborted) {
      if (progressState) {
        progressState.inProgress = false;
        progressState.completedTime = Date.now();
        progressState.cancelled = true;
      }
      
      logger.log('Sync operation was aborted');
      await runCleanup();
      
      return {
        cancelled: true,
        processedUsers: processedCount,
        totalUsers: users.length,
        ...stats
      };
    }
    
    if (progressState && progressState.cancelled) {
      logger.log('Sync operation was cancelled by admin');
      
      // Ensure progress state is updated
      progressState.inProgress = false;
      progressState.completedTime = progressState.completedTime || Date.now();
      progressState.processedUsers = processedCount;
      progressState.updatedProfiles = stats.updatedProfiles;
      progressState.failedProfiles = stats.failedProfiles;
      progressState.totalProfiles = stats.totalProfiles;
      progressState.failedProfilesList = stats.failedProfilesList || [];
      
      await runCleanup();
      
      return {
        cancelled: true,
        processedUsers: processedCount,
        totalUsers: users.length,
        ...stats
      };
    }
    
    // Calculate final statistics
    const totalTimeSeconds = (Date.now() - stats.startTime) / 1000;
    const avgProfileTime = stats.updatedProfiles > 0 ? (stats.totalTime / stats.updatedProfiles) : 0;
    
    // Log final statistics
    console.log('\n\x1b[35m========= FINAL STATISTICS =========\x1b[0m');
    console.log(`\x1b[36m[STATS]\x1b[0m Total users processed: ${stats.totalUsers}`);
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Users updated: ${stats.updatedUsers}`);
    console.log(`\x1b[31m[FAILURE]\x1b[0m Users failed: ${stats.failedUsers}`);
    console.log(`\x1b[36m[STATS]\x1b[0m Total profiles attempted: ${stats.totalProfiles}`);
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Profiles updated: ${stats.updatedProfiles}`);
    console.log(`\x1b[31m[FAILURE]\x1b[0m Profiles failed: ${stats.failedProfiles}`);
    console.log(`\x1b[36m[STATS]\x1b[0m Average time per profile: ${Math.round(avgProfileTime)}ms`);
    console.log(`\x1b[36m[STATS]\x1b[0m Total execution time: ${totalTimeSeconds.toFixed(2)} seconds`);
    
    // Update progress state for completion
    if (progressState) {
      progressState.inProgress = false;
      progressState.completedTime = Date.now();
      progressState.processedUsers = processedCount;
      progressState.updatedProfiles = stats.updatedProfiles;
      progressState.failedProfiles = stats.failedProfiles;
      progressState.totalProfiles = stats.totalProfiles;
      progressState.failedProfilesList = stats.failedProfilesList || [];
      progressState.success = true;
    }
    
    // Run cleanup
    await runCleanup();
    
    return {
      success: true,
      totalUsers: users.length,
      processedUsers: processedCount,
      updatedProfiles: stats.updatedProfiles,
      failedProfiles: stats.failedProfiles,
      totalTime: totalTimeSeconds
    };
  } catch (error) {
    console.error('\x1b[41m\x1b[37m FATAL ERROR \x1b[0m', error);
    
    if (logger) {
      logger.error('Fatal error in profile update process', error);
    }
    
    // Update progress state with error
    if (progressState) {
      progressState.error = error.message || "Unknown fatal error";
      progressState.inProgress = false;
      progressState.completedTime = Date.now();
      progressState.success = false;
    }
    
    // Run cleanup
    await runCleanup();
    
    // Re-throw for promise rejection handling
    throw error;
  }
};

// Schedule cron job to run at 1:40 PM IST (8:10 AM UTC)
const scheduleCronJob = () => {
  // Schedule cron job for 1:40 PM IST (UTC+5:30)
  // This is 8:10 AM UTC
  cron.schedule('10 8 * * *', () => {
    console.log('Running scheduled profile update at 1:40 PM IST');
    updateAllUserProfiles();
  });
  
  console.log('Cron job scheduled for 1:40 PM IST (8:10 AM UTC)');
};

// If running as standalone script
if (require.main === module) {
  scheduleCronJob();
}

// Export for direct usage
module.exports = updateAllUserProfiles; 
