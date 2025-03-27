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
    leetcode: 500,      // 2 requests per second
    codeforces: 1000,   // 1 request per second
    codechef: 2000,     // 1 request per 2 seconds (to avoid IP blocks)
    geeksforgeeks: 750, // ~1.3 requests per second
    hackerrank: 500     // 2 requests per second
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
    leetcode: 3,        // 3 concurrent LeetCode requests
    codeforces: 2,      // 2 concurrent Codeforces requests
    codechef: 1,        // Only 1 CodeChef request at a time (to avoid IP blocks)
    geeksforgeeks: 2,   // 2 concurrent GeeksforGeeks requests
    hackerrank: 3       // 3 concurrent HackerRank requests
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
      
      // Log any failed profiles
      if (failedProfiles.length > 0) {
        failedProfiles.forEach(profile => {
          logger.error(`Failed to update ${profile.platform} for ${user.name}: ${profile.error}`);
          stats.failuresByPlatform[profile.platform] = (stats.failuresByPlatform[profile.platform] || 0) + 1;
        });
      }
      
    } else {
      stats.failedUsers++;
      logger.error(`Failed to update user ${user.name}`, new Error(response.data.message));
    }
  } catch (error) {
    stats.failedUsers++;
    logger.error(`Error updating user ${user.name}`, error);
  }
  
  return stats;
};

/**
 * Delay execution based on platform rate limits
 * @param {string} platform - Platform name
 * @returns {Promise} - Resolves when it's safe to proceed
 */
const applyRateLimit = async (platform) => {
  if (!rateLimitingTracker.lastRequest[platform]) {
    rateLimitingTracker.lastRequest[platform] = Date.now();
    return;
  }
  
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimitingTracker.lastRequest[platform];
  const requiredDelay = rateLimitingTracker.delays[platform];
  
  if (timeSinceLastRequest < requiredDelay) {
    const delayMs = requiredDelay - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  rateLimitingTracker.lastRequest[platform] = Date.now();
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
    
    // Connect to MongoDB
    await connectToMongoDB();
    logger.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({});
    logger.log(`Found ${users.length} users to process`);
    
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
      concurrencyStats: {
        maxActiveUsers: 0,
        totalIdleTime: 0
      }
    };
    
    // Process users in batches to avoid memory issues
    // Increasing batch size for efficiency, but still keeping it reasonable
    const BATCH_SIZE = 20; // Increased from 10 to 20
    let processedCount = 0;
    
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();
      
      // Process batch with concurrency control
      await Promise.all(batch.map(async (user) => {
        // Apply global rate limiting with jitter to spread out requests
        const jitterMs = Math.floor(Math.random() * 500);
        await new Promise(resolve => setTimeout(resolve, jitterMs));
        
        await updateUserPlatforms(user, logger, stats);
        processedCount++;
        
        if (processedCount % 20 === 0 || processedCount === users.length) {
          logger.log(`Progress: ${processedCount}/${users.length} users (${Math.round(processedCount / users.length * 100)}%)`);
        }
      }));
      
      // Log batch completion time
      const batchTime = Date.now() - batchStartTime;
      logger.log(`Batch ${Math.ceil(i/BATCH_SIZE) + 1}/${Math.ceil(users.length/BATCH_SIZE)} completed in ${batchTime/1000} seconds`);
      
      // Add a small pause between batches to prevent overwhelming the server
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Calculate final statistics
    const totalTimeSeconds = (Date.now() - stats.startTime) / 1000;
    const avgProfileTime = stats.totalTime / stats.updatedProfiles || 0;
    
    // Log final statistics
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
    
  } catch (error) {
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