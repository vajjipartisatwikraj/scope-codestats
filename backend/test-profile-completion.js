/**
 * Test script for the completeRegistration endpoint
 * 
 * Run with: node test-profile-completion.js
 */

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');

// Configuration
const API_URL = 'http://localhost:5000/api';
const TEST_USER_EMAIL = 'test@mlrit.ac.in'; // Change to a valid test user email

// Create test token
const createTestToken = async (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Disconnect from MongoDB
const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
};

// Test profile completion
const testProfileCompletion = async () => {
  try {
    // Step 1: Connect to the database
    const conn = await connectDB();
    
    // Step 2: Find a test user
    const testUser = await User.findOne({ email: TEST_USER_EMAIL });
    
    if (!testUser) {
      console.error(`Test user with email ${TEST_USER_EMAIL} not found`);
      await disconnectDB();
      return;
    }
    
    console.log(`Found test user: ${testUser.name} (${testUser._id})`);
    
    // Step 3: Create a token for the test user
    const token = await createTestToken(testUser._id);
    
    // Step 4: Create test profile data
    const profileData = {
      name: testUser.name || 'Test User',
      phone: '9876543210',
      department: testUser.department || 'CSE',
      section: 'A',
      rollNumber: testUser.rollNumber || '19BXXYYYY',
      graduationYear: 2025,
      skills: ['JavaScript', 'React', 'Node.js'],
      interests: ['Web Development', 'AI/ML'],
      about: 'This is a test profile for debugging purposes.',
      linkedinUrl: 'https://linkedin.com/in/testuser',
      githubUrl: 'https://github.com/testuser',
      profileCompleted: true
    };
    
    console.log('Sending profile data:', JSON.stringify(profileData, null, 2));
    
    // Step 5: Send the request
    try {
      const response = await axios.post(
        `${API_URL}/auth/completeRegistration`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Success! Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Request failed:');
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(`Status: ${error.response.status}`);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }
    }
    
    // Step 6: Disconnect from the database
    await disconnectDB();
    
  } catch (error) {
    console.error('Test failed:', error);
    await disconnectDB();
  }
};

// Run the test
testProfileCompletion(); 