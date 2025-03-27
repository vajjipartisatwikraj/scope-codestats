/**
 * Manual Run Script for User Profile Updates
 * 
 * This script allows running the profile update process manually
 * without waiting for the scheduled cron job.
 */

const updateAllUserProfiles = require('./updateUserProfiles');

console.log('Manually running the user profile update process...');
updateAllUserProfiles()
  .then(() => {
    console.log('Manual update completed!');
  })
  .catch(err => {
    console.error('Error during manual update:', err);
    process.exit(1);
  }); 