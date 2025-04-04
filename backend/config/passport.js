const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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
      callbackURL: `${process.env.API_BASE_URL}/auth/google/callback`,
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Received Google OAuth profile:', JSON.stringify({
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos
        }, null, 2));

        // Check if user already exists by Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log(`User found by Google ID: ${user._id}`);
          return done(null, user);
        }

        // If not, check if the email exists
        const email = profile.emails[0].value;
        console.log(`Checking if email exists: ${email}`);
        user = await User.findOne({ email });

        if (user) {
          // Link the Google account to the existing user
          console.log(`Existing user found by email: ${user._id}, linking Google account`);
          user.googleId = profile.id;
          user.name = user.name || profile.displayName;
          user.profilePicture = user.profilePicture || profile.photos[0].value;
          await user.save();
          return done(null, user);
        }

        // Create new user from Google data
        // First, check if the email is from the MLRIT domain
        console.log(`Validating email domain for: ${email}`);
        if (!email.endsWith('@mlrit.ac.in') && !email.endsWith('@mlrinstitutions.ac.in')) {
          console.log(`Email domain validation failed for: ${email}`);
          return done(null, false, { 
            message: 'Please use your MLRIT college email address for registration' 
          });
        }

        // Extract roll number and other details from email
        console.log(`Extracting roll number and details from: ${email}`);
        let rollNumber = '';
        let department = '';
        let graduatingYear = '';
      
        const emailParts = email.split('@');
        if (emailParts.length === 2) {
          rollNumber = emailParts[0].toUpperCase();
          console.log(`Extracted roll number: ${rollNumber}`);
          
          // Try to extract department code - be more flexible in detection
          // Map of possible department codes (expanded to include more variations)
          const DEPARTMENT_CODES = {
            'A05': 'CSE',
            '05Y': 'CSE',
            'A06': 'CSC',
            'A33': 'CSIT',
            'A12': 'IT',
            'A67': 'CSD',
            'A66': 'CSM',
            // Add default mapping if needed
            'Y9': 'CSE' // Fallback for 23r21a05y9 pattern
          };
          
          // Try multiple extraction patterns
          let deptCode = '';
          // Standard position (5-7)
          if (rollNumber.length >= 8) {
            deptCode = rollNumber.substring(5, 8);
            console.log(`Trying standard dept code position (5-7): ${deptCode}`);
          }
          
          // Try alternative positions if standard doesn't match
          if (!DEPARTMENT_CODES[deptCode] && rollNumber.length >= 9) {
            const lastTwo = rollNumber.substring(rollNumber.length - 2);
            console.log(`Trying last two characters as dept code: ${lastTwo}`);
            if (DEPARTMENT_CODES[lastTwo]) {
              deptCode = lastTwo;
            }
          }
          
          department = DEPARTMENT_CODES[deptCode] || 'CSE'; // Default to CSE if not found
          console.log(`Determined department: ${department} from code: ${deptCode}`);
          
          // Calculate graduating year
          if (rollNumber.length >= 2) {
            const yearCode = rollNumber.substring(0, 2);
            const admissionYear = 2000 + parseInt(yearCode, 10);
            graduatingYear = admissionYear + 4;
            console.log(`Calculated graduating year: ${graduatingYear} from year code: ${yearCode}`);
          } else {
            // Default to current year + 4 if extraction fails
            graduatingYear = new Date().getFullYear() + 4;
            console.log(`Using default graduating year: ${graduatingYear}`);
          }
        }

        // Create new user
        console.log('Creating new user with the following details:');
        console.log({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          rollNumber,
          department,
          graduatingYear
        });
        
        // Check if phone number is available from Google profile
        let phoneNumber = '';
        if (profile._json && profile._json.phoneNumber) {
          // Format phone number to remove spaces and ensure it meets validation
          phoneNumber = profile._json.phoneNumber.replace(/[\s-]/g, '');
          console.log(`Phone number from Google profile: ${phoneNumber}`);
        }
        
        const newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          rollNumber: rollNumber || email.split('@')[0].toUpperCase(), // Fallback to email prefix if extraction fails
          department: department || 'CSE', // Default to CSE
          graduatingYear: graduatingYear || new Date().getFullYear() + 4, // Default to current year + 4
          profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
          // Only add mobileNumber if we have a valid one from Google
          ...(phoneNumber && { mobileNumber: phoneNumber }),
          newUser: true, // Explicitly set as new user requiring profile completion
          profileCompleted: false, // Mark profile as not completed
          password: Math.random().toString(36).slice(-10), // Generate random password
        });

        try {
          await newUser.save();
          console.log(`New user created successfully with ID: ${newUser._id}`);
          return done(null, newUser);
        } catch (saveErr) {
          console.error('Error creating new user:', saveErr);
          // If there's a validation error, try to create with minimum required fields
          if (saveErr.name === 'ValidationError') {
            console.log('Trying to create user with minimal fields...');
            const minimalUser = new User({
              googleId: profile.id,
              name: profile.displayName || 'MLRIT Student',
              email: email,
              rollNumber: email.split('@')[0].toUpperCase(),
              department: 'CSE',
              graduatingYear: new Date().getFullYear() + 4,
              // Only add mobileNumber if we have a valid one from Google
              ...(phoneNumber && { mobileNumber: phoneNumber }),
              newUser: true,
              profileCompleted: false
            });
            
            try {
              await minimalUser.save();
              console.log(`Created minimal user with ID: ${minimalUser._id}`);
              return done(null, minimalUser);
            } catch (minimalSaveErr) {
              console.error('Error creating minimal user:', minimalSaveErr);
              return done(minimalSaveErr, null);
            }
          }
          return done(saveErr, null);
        }
      } catch (err) {
        console.error('Google auth error:', err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport; 
