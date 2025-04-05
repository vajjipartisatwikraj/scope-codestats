const platformAPI = require('./services/platformAPIs');

// Log the exported object
console.log('Using exported platform API instance');
console.log('Module exports:', Object.keys(platformAPI));

async function testValidUser() {
  try {
    // Use the exported instance directly
    console.log('\n=== Testing Valid LeetCode Username ===');
    
    // Username to test - this is a known valid username
    const username = 'lee215';
    console.log(`Testing LeetCode profile for user: ${username}`);
    
    // Try to fetch the profile using the exported instance
    const profile = await platformAPI.getLeetCodeProfile(username);
    
    // Log the result
    console.log('Success! Profile data:');
    console.log(JSON.stringify(profile, null, 2));
    
    // Show key metrics
    console.log(`\nKey profile metrics:`);
    console.log(`Problems Solved: ${profile.problemsSolved}`);
    console.log(`Rating: ${profile.rating}`);
    console.log(`Contests Participated: ${profile.contestsParticipated}`);
    console.log(`Score: ${profile.score}`);
    console.log(`Is Partial Data: ${profile.isPartialData ? 'Yes' : 'No'}`);
    
    return true;
  } catch (error) {
    console.error('Error fetching valid LeetCode profile:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

async function testInvalidUser() {
  try {
    // Test with a non-existent username
    console.log('\n=== Testing Non-Existent LeetCode Username ===');
    
    // This username should not exist on LeetCode
    const username = 'this_user_definitely_doesnt_exist_12345xyz';
    console.log(`Testing LeetCode profile for non-existent user: ${username}`);
    
    // Try to fetch the profile - this should throw an error
    const profile = await platformAPI.getLeetCodeProfile(username);
    
    // If we get here, the test failed because we didn't throw an error
    console.error('ERROR: No error was thrown for a non-existent username!');
    console.log('Returned profile:', JSON.stringify(profile, null, 2));
    
    return false;
  } catch (error) {
    // We EXPECT an error here, so this is actually success
    console.log('Successfully detected non-existent username:');
    console.log(`Error message: ${error.message}`);
    
    // Verify the error message mentions "not found" or similar
    if (error.message.includes('not found') || error.message.includes('doesn\'t exist')) {
      console.log('✅ Test passed: Error message correctly indicates user not found');
      return true;
    } else {
      console.error('❌ Test failed: Error was thrown but message doesn\'t indicate user not found');
      console.error('Error message:', error.message);
      return false;
    }
  }
}

// Run the tests
async function runTests() {
  try {
    const validResult = await testValidUser();
    const invalidResult = await testInvalidUser();
    
    console.log('\n=== Test Results ===');
    console.log(`Valid user test: ${validResult ? 'PASSED' : 'FAILED'}`);
    console.log(`Invalid user test: ${invalidResult ? 'PASSED' : 'FAILED'}`);
    
    if (validResult && invalidResult) {
      console.log('\n✅ All tests passed! The fix is working correctly.');
    } else {
      console.log('\n❌ Tests failed. Further debugging needed.');
    }
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 