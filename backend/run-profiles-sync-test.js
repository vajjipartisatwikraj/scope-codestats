/**
 * Test Script: Manually Trigger User Profiles Sync
 * 
 * This script directly calls the updateAllUserProfiles function
 * to test that the profile synchronization system is working properly.
 * 
 * Run with: node run-profiles-sync-test.js
 */
console.log('Starting manual profile sync test at', new Date().toISOString());
console.log('This will demonstrate that the sync functionality works properly');

// Import the updateAllUserProfiles function
const updateAllUserProfiles = require('./scripts/updateUserProfiles');

// Create a simple progress tracking object
const progressState = {
  inProgress: true,
  processedUsers: 0,
  updatedProfiles: 0,
  failedProfiles: 0,
  startTime: Date.now(),
  totalUsers: 0
};

// Progress tracking function
const trackProgress = () => {
  if (!progressState.inProgress) {
    clearInterval(progressTracker);
    return;
  }
  
  const elapsedTime = (Date.now() - progressState.startTime) / 1000;
  console.log(`Progress: ${progressState.processedUsers}/${progressState.totalUsers} users processed`);
  console.log(`Profiles: ${progressState.updatedProfiles} updated, ${progressState.failedProfiles} failed`);
  console.log(`Time elapsed: ${elapsedTime.toFixed(1)} seconds`);
};

// Set up progress tracking
const progressTracker = setInterval(trackProgress, 5000);

// Call the update function
updateAllUserProfiles(progressState)
  .then(result => {
    console.log('\n=========== SYNC TEST RESULTS ===========');
    console.log('Total users processed:', result.totalUsers);
    console.log('Successfully processed users:', result.processedUsers);
    console.log('Updated profiles:', result.updatedProfiles);
    console.log('Failed profiles:', result.failedProfiles);
    console.log('Total time (seconds):', result.totalTime);
    console.log('==========================================\n');
    
    // Stop the progress tracking
    clearInterval(progressTracker);
    
    console.log('Test completed successfully.');
    console.log('The cron job should work when scheduled at 12:00 AM IST (midnight).');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during profile sync test:', error);
    
    // Stop the progress tracking
    clearInterval(progressTracker);
    
    console.log('Test failed. Please check the logs for more details.');
    process.exit(1);
  }); 