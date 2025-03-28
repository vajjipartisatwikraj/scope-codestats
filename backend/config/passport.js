const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Load environment variables
require('dotenv').config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists by Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // If not, check if the email exists
        const email = profile.emails[0].value;
        user = await User.findOne({ email });

        if (user) {
          // Link the Google account to the existing user
          user.googleId = profile.id;
          user.name = user.name || profile.displayName;
          user.profilePicture = user.profilePicture || profile.photos[0].value;
          await user.save();
          return done(null, user);
        }

        // Create new user from Google data
        // First, check if the email is from the MLRIT domain
        if (!email.endsWith('@mlrit.ac.in') && !email.endsWith('@mlrinstitutions.ac.in')) {
          return done(null, false, { 
            message: 'Please use your MLRIT college email address for registration' 
          });
        }

        // Extract roll number and other details from email
        let rollNumber = '';
        let department = '';
        let graduatingYear = '';
      
        const emailParts = email.split('@');
        if (emailParts.length === 2) {
          rollNumber = emailParts[0].toUpperCase();
          
          // Extract department code (assumed to be at positions 5-7)
          if (rollNumber.length >= 8) {
            const deptCode = rollNumber.substring(5, 8);
            // Map department code to department
            const DEPARTMENT_CODES = {
              'A05': 'CSE',
              'A06': 'CSC',
              'A33': 'CSIT',
              'A12': 'IT',
              'A67': 'CSD',
              'A66': 'CSM'
            };
            department = DEPARTMENT_CODES[deptCode] || '';
          }
          
          // Calculate graduating year
          if (rollNumber.length >= 2) {
            const yearCode = rollNumber.substring(0, 2);
            const admissionYear = 2000 + parseInt(yearCode, 10);
            graduatingYear = admissionYear + 4;
          }
        }

        // Create new user
        const newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          rollNumber,
          department,
          graduatingYear,
          profilePicture: profile.photos[0].value,
          newUser: true, // Mark as new user for profile completion
          password: Math.random().toString(36).slice(-10) // Generate random password
        });

        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        console.error('Google auth error:', err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport; 