/**
 * Direct Profile Update Runner
 * 
 * This script directly calls the updateAllUserProfiles function
 * without scheduling it as a cron job.
 */

const updateAllUserProfiles = require('./scripts/updateUserProfiles');

async function runProfileUpdate() {
  console.log('Starting immediate profile update...');
  
  try {
    const result = await updateAllUserProfiles();
    console.log('Profile update completed successfully:', result);
    process.exit(0);
  } catch (error) {
    console.error('Profile update failed:', error);
    process.exit(1);
  }
}

// Run the update immediately
runProfileUpdate();