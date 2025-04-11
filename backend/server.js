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
const notificationsRoutes = require('./routes/notifications');
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
  origin: ['http://localhost:5173'], 
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

// Removed: Redundant cron job (already handled in updateUserProfiles.js)
// Auto-sync profiles is now scheduled only once at midnight IST via the updateUserProfiles.js file

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
app.use('/api/notifications', notificationsRoutes);
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

// Test route for Google profile image
app.get('/api/test/google-profile-image', (req, res) => {
  // Check if there's a user in the session
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Return the user's profile picture URL
  return res.json({
    name: req.user.name,
    profilePicture: req.user.profilePicture || '',
    hasProfilePicture: !!req.user.profilePicture,
    googleId: req.user.googleId || null
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
