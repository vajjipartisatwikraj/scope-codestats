// At the very top of the file - suppress specific experimental warnings
// This must be the first code in the file
process.env.NODE_NO_WARNINGS = '1';
// Patch the default emitWarning function to filter out specific warnings
const originalEmit = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  // Filter out the specific warnings about CommonJS loading ES modules
  if (warning && typeof warning === 'string' && 
      (warning.includes('CommonJS module') || 
       warning.includes('loading ES Module') || 
       warning.includes('using require'))) {
    return; // Suppress this specific warning
  }
  return originalEmit.call(this, warning, ...args);
};



const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const leaderboardRoutes = require('./routes/leaderboard');
const usersRoutes = require('./routes/users');
const coursesRoutes = require('./routes/courses');
const opportunitiesRoutes = require('./routes/opportunities');
const mongoose = require('mongoose');
const adminRoutes = require('./routes/admin');
const cron = require('node-cron');
const Profile = require('./models/Profile');
const User = require('./models/User');
const platformAPI = require('./services/platformAPIs');
const healthRoutes = require('./routes/healthRoutes');
const passport = require('passport');
const session = require('express-session');
const googleAuthRoutes = require('./routes/auth/googleAuth');
const registerCronJobs = require('./ensure-cron-jobs');

const app = express();

// Initialize syncProgress tracking for profile synchronization
app.locals.syncProgress = {};

// Connect Database
connectDB();

// Middleware
app.use(cors({
  origin: ['https://codestats.zapto.org'], 
  credentials: true
}));
app.use(express.json());

// Set up session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Register all cron jobs
registerCronJobs();

// Auto-sync profiles scheduler - Runs at 5:25 PM IST (11:55 AM UTC) every day
cron.schedule('55 11 * * *', async () => {
  console.log('==========================================================');
  console.log('AUTOMATED SERVER-SIDE SYNC: Starting at', new Date().toISOString());
  console.log('==========================================================');
  
  // Track overall stats
  let totalProfiles = 0;
  let successfulUpdates = 0;
  let failedUpdates = 0;
  
  try {
    // Get all profiles without user filtering (independent of user login status)
    const profiles = await Profile.find({});
    totalProfiles = profiles.length;
    console.log(`Found ${totalProfiles} profiles to sync`);
    
    // Track the sync time
    const syncTime = new Date();
    
    // Process profiles in batches to avoid overwhelming the server
    const batchSize = 10;
    const batches = Math.ceil(profiles.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min((i + 1) * batchSize, profiles.length);
      const batch = profiles.slice(start, end);
      
      console.log(`Processing batch ${i+1}/${batches} (profiles ${start+1}-${end})`);
      
      // Process profiles in parallel within each batch
      const updatePromises = batch.map(async (profile) => {
        try {
          const { platform, username, userId } = profile;
          console.log(`Syncing ${platform} profile for user ${userId}: ${username}`);
          
          // Get updated profile data
          console.log(`Fetching REAL data for ${platform}/${username}`);
          const platformData = await platformAPI.getProfileData(platform, username);
          console.log(`Received platform data:`, JSON.stringify(platformData, null, 2));
          
          // Update profile data
          profile.score = platformData.score || 0;
          profile.problemsSolved = platformData.problemsSolved || 0;
          profile.lastUpdated = new Date();
          profile.autoSynced = true;
          profile.lastUpdateStatus = 'success';
          profile.lastUpdateError = null;
          
          // Platform-specific fields
          if (platform === 'leetcode') {
            profile.easyProblemsSolved = platformData.easyProblemsSolved || 0;
            profile.mediumProblemsSolved = platformData.mediumProblemsSolved || 0;
            profile.hardProblemsSolved = platformData.hardProblemsSolved || 0;
            profile.ranking = platformData.ranking || 0;
            profile.contestsParticipated = platformData.contestsParticipated || 0;
            profile.rating = platformData.rating || 0;
          } else if (platform === 'codeforces') {
            profile.rating = platformData.rating || 0;
            profile.maxRating = platformData.maxRating || 0;
            profile.rank = platformData.rank || 'unrated';
            profile.contribution = platformData.contribution || 0;
            profile.contestsParticipated = platformData.contestsParticipated || 0;
          } else if (platform === 'codechef') {
            profile.rating = platformData.rating || 0;
            profile.globalRank = platformData.global_rank || 0;
            profile.countryRank = platformData.country_rank || 0;
            profile.contestsParticipated = platformData.contestsParticipated || 0;
          } else if (platform === 'geeksforgeeks') {
            profile.codingScore = platformData.codingScore || 0;
            profile.instituteRank = platformData.instituteRank || 0;
            profile.contestsParticipated = platformData.contestsParticipated || 0;
            profile.easyProblemsSolved = platformData.easyProblemsSolved || 0;
            profile.mediumProblemsSolved = platformData.mediumProblemsSolved || 0;
            profile.hardProblemsSolved = platformData.hardProblemsSolved || 0;
            profile.basicProblemsSolved = platformData.basicProblemsSolved || 0;
            profile.schoolProblemsSolved = platformData.schoolProblemsSolved || 0;
            profile.monthlyScore = platformData.monthlyScore || 0;
            profile.currentStreak = platformData.currentStreak || 0;
            profile.maxStreak = platformData.maxStreak || 0;
          } else if (platform === 'hackerrank') {
            profile.badges = platformData.badges || platformData.badgesCount || 0;
            profile.certificates = platformData.certificates || platformData.certificatesCount || 0;
            profile.contestsParticipated = platformData.contestsParticipated || 0;
          } else if (platform === 'github') {
            profile.details = {
              publicRepos: platformData.publicRepos || 0,
              totalCommits: platformData.totalCommits || 0,
              followers: platformData.followers || 0,
              following: platformData.following || 0,
              starsReceived: platformData.starsReceived || 0
            };
          }
          
          await profile.save();
          
          // Also update the user's total problems solved count and score if applicable
          try {
            const user = await User.findById(userId);
            if (user) {
              // Update user's platform-specific details
              if (!user.platformData) {
                user.platformData = {};
              }
              
              user.platformData[platform] = {
                username: username,
                lastUpdated: new Date(),
                score: platformData.score || 0,
                problemsSolved: platformData.problemsSolved || 0
              };
              
              // Add platform-specific data
              if (platform === 'leetcode') {
                user.platformData[platform].ranking = platformData.ranking || 0;
                user.platformData[platform].totalSolved = platformData.problemsSolved || 0;
                user.platformData[platform].easySolved = platformData.easyProblemsSolved || 0;
                user.platformData[platform].mediumSolved = platformData.mediumProblemsSolved || 0;
                user.platformData[platform].hardSolved = platformData.hardProblemsSolved || 0;
              } else if (platform === 'geeksforgeeks') {
                user.platformData[platform].codingScore = platformData.codingScore || 0;
                user.platformData[platform].instituteRank = platformData.instituteRank || 0;
                user.platformData[platform].totalSolved = platformData.problemsSolved || 0;
                user.platformData[platform].easySolved = platformData.easyProblemsSolved || 0;
                user.platformData[platform].mediumSolved = platformData.mediumProblemsSolved || 0;
                user.platformData[platform].hardSolved = platformData.hardProblemsSolved || 0;
                user.platformData[platform].basicSolved = platformData.basicProblemsSolved || 0;
                user.platformData[platform].schoolSolved = platformData.schoolProblemsSolved || 0;
                user.platformData[platform].currentStreak = platformData.currentStreak || 0;
                user.platformData[platform].maxStreak = platformData.maxStreak || 0;
                user.platformData[platform].monthlyScore = platformData.monthlyScore || 0;
              }
              
              // Calculate the total score and problems solved across all platforms
              const allProfiles = await Profile.find({ userId });
              let totalScore = 0;
              let totalProblemsSolved = 0;
              
              allProfiles.forEach(p => {
                totalScore += p.score || 0;
                totalProblemsSolved += p.problemsSolved || 0;
              });
              
              user.totalScore = totalScore;
              user.problemsSolved = totalProblemsSolved;
              user.lastActive = new Date();
              
              await user.save();
            }
          } catch (userError) {
            console.error(`Error updating user data for ${userId}:`, userError.message);
            // Continue with sync even if user update fails
          }
          
          console.log(`Successfully synced ${platform} profile for ${username}`);
          successfulUpdates++;
        } catch (error) {
          console.error(`Error syncing profile ${profile.platform}/${profile.username}:`, error.message);
          // Update profile with error information
          profile.lastUpdateStatus = 'error';
          profile.lastUpdateError = error.message;
          profile.autoSynced = false;
          await profile.save();
          failedUpdates++;
        }
      });
      
      // Wait for all promises in this batch with a timeout
      try {
        // Wait for batch to complete with a 2-minute timeout
        await Promise.race([
          Promise.all(updatePromises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Batch timeout exceeded')), 120000)
          )
        ]);
      } catch (batchError) {
        console.error(`Error processing batch ${i+1}/${batches}:`, batchError.message);
      }
    }
    
    // Calculate time taken
    const endTime = new Date();
    const timeElapsed = (endTime - syncTime) / 1000;
    
    // Update the last sync time in the database with detailed stats
    const result = await mongoose.connection.db.collection('system').updateOne(
      { _id: 'sync_info' },
      { 
        $set: { 
          lastSync: syncTime, 
          nextSync: new Date(syncTime.getTime() + 24 * 60 * 60 * 1000),
          syncStats: {
            totalProfiles,
            successfulUpdates,
            failedUpdates,
            timeElapsedSeconds: timeElapsed,
            completedAt: endTime
          }
        } 
      },
      { upsert: true }
    );
    
    console.log('==========================================================');
    console.log(`SYNC COMPLETE: Updated ${successfulUpdates}/${totalProfiles} profiles successfully (${failedUpdates} failed)`);
    console.log(`Time taken: ${timeElapsed.toFixed(2)} seconds`);
    console.log('==========================================================');
  } catch (error) {
    console.error('Error in auto-sync process:', error);
  }
});

// Debug route
app.get('/api/debug', (req, res) => {
  res.json({ 
    message: 'Server is running correctly',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/auth',
      '/api/profiles',
      '/api/leaderboard',
      '/api/admin',
      '/api/achievements',
      '/api/users',
      '/api/courses',
      '/api/opportunities'
    ]
  });
});

// Routes
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/courses', coursesRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth/google', googleAuthRoutes);

// Test route for CodeChef profile scraping
app.get('/api/test/codechef/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    console.log(`TEST: Fetching CodeChef profile for ${username}`);
    const api = new platformAPI.PlatformAPI();
    const profileData = await api.getCodeChefProfile(username);
    
    res.json({
      success: true,
      message: 'CodeChef profile data retrieved',
      data: profileData
    });
  } catch (err) {
    console.error('CodeChef test error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching CodeChef profile', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Test route for GeeksforGeeks API
app.get('/api/test/geeksforgeeks/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    console.log(`TEST: Fetching GeeksforGeeks profile for ${username}`);
    const api = new platformAPI.PlatformAPI();
    const profileData = await api.getGeeksforGeeksProfile(username);
    
    res.json({
      success: true,
      message: 'GeeksforGeeks profile data retrieved',
      data: profileData
    });
  } catch (err) {
    console.error('GeeksforGeeks test error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching GeeksforGeeks profile', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Test route for LeetCode API
app.get('/api/test/leetcode/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    console.log(`TEST: Fetching LeetCode profile for ${username}`);
    const api = new platformAPI.PlatformAPI();
    const profileData = await api.getLeetCodeProfile(username);
    
    res.json({
      success: true,
      message: 'LeetCode profile data retrieved',
      data: profileData
    });
  } catch (err) {
    console.error('LeetCode test error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching LeetCode profile', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Test route for Google Auth
app.get('/api/test/google-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Google OAuth test route is working',
    googleAuthRoute: '/api/auth/google',
    googleCallbackRoute: '/api/auth/google/callback',
    clientID: process.env.GOOGLE_CLIENT_ID 
      ? `Configured (starts with ${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...)` 
      : 'Not configured'
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Add MongoDB connection error handling and reconnection
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  console.log('Will attempt to reconnect to MongoDB...');
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  // Try to reconnect after a short delay
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => console.log('Reconnected to MongoDB'))
      .catch(err => console.error('MongoDB reconnection error:', err));
  }, 5000);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!', error: err.message });
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
