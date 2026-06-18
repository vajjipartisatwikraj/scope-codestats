/**
 * Manual Run Script for User Profile Updates
 * 
 * This script allows running the profile update process manually
 * without waiting for the scheduled cron job.
 */

const updateAllUserProfiles = require('./updateUserProfiles');

console.log('\x1b[36m============================================\x1b[0m');
console.log('\x1b[36m      MANUAL PROFILE UPDATE PROCESS        \x1b[0m');
console.log('\x1b[36m============================================\x1b[0m');
console.log('');
console.log('\x1b[32m[START]\x1b[0m Manually running user profile update process...');
console.log('\x1b[33m[NOTE]\x1b[0m This may take several minutes depending on the number of users');
console.log('');

// Add timestamp for tracking execution time
const startTime = Date.now();

updateAllUserProfiles()
  .then(() => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log('\x1b[32m============================================\x1b[0m');
    console.log(`\x1b[32m✓ Manual update completed in ${elapsedTime} seconds!\x1b[0m`);
    console.log('\x1b[32m============================================\x1b[0m');
  })
  .catch(err => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('');
    console.error('\x1b[41m\x1b[37m ERROR DURING MANUAL UPDATE \x1b[0m');
    console.error('\x1b[31m============================================\x1b[0m');
    console.error(`\x1b[31m✗ Manual update failed after ${elapsedTime} seconds\x1b[0m`);
    console.error(`\x1b[31m✗ Error: ${err.message}\x1b[0m`);
    
    // Display stack trace for debugging
    if (err.stack) {
      console.error('\x1b[33m[STACK TRACE]\x1b[0m');
      console.error(err.stack);
    }
    
    console.error('\x1b[31m============================================\x1b[0m');
    process.exit(1);
  }); 