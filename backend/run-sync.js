// Simple script to run the updateAllUserProfiles function directly
const updateAllUserProfiles = require('./scripts/updateUserProfiles');

console.log('Starting profile synchronization for all users...');
// Execute the function
updateAllUserProfiles()
  .then(() => console.log('Profile synchronization completed.'))
  .catch(err => console.error('Error during synchronization:', err)); 