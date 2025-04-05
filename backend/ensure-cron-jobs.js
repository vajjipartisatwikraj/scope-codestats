/**
 * Ensure Cron Jobs
 * 
 * This script ensures that all required cron jobs are properly registered
 * when the server starts up. It should be imported in server.js.
 */
const cron = require('node-cron');
const updateAllUserProfiles = require('./scripts/updateUserProfiles');
const fs = require('fs');
const path = require('path');

// Set up logging
const setupLogging = () => {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(logDir, `cron-${date}.log`);
  
  // Create a write stream for logging
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  return {
    log: (message) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] CRON: ${message}\n`;
      console.log(`CRON: ${message}`);
      logStream.write(logMessage);
    }
  };
};

const logger = setupLogging();

/**
 * Register all required cron jobs
 */
const registerCronJobs = () => {
  logger.log('Registering cron jobs...');
  
  // Profile update job at 12:00 AM IST (18:30 UTC of previous day)
  cron.schedule('30 18 * * *', () => {
    logger.log('Running scheduled profile update at 12:00 AM IST (midnight)');
    updateAllUserProfiles()
      .then(result => {
        logger.log(`Profile update completed. Processed ${result.processedUsers}/${result.totalUsers} users. Updated ${result.updatedProfiles} profiles.`);
      })
      .catch(error => {
        logger.log(`Profile update failed: ${error.message}`);
      });
  }, {
    scheduled: true,
    timezone: "UTC" // Make sure timezone is explicit
  });
  
  logger.log('All cron jobs registered successfully');
  logger.log(`Next profile update will occur at 12:00 AM IST (midnight)`);
};

// Export the function to be called from server.js
module.exports = registerCronJobs; 