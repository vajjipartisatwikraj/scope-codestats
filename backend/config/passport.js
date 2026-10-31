const passport = require('passport');
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const log = require("../utils/logger").scope("PASSPORT");
const { readLoginIntent } = require("../utils/loginIntent");
const { isInstitutionEmail, normalizeEmail } = require("./loginAccess");
const accessList = require("../services/accessListService");
const { startingDetails, uniqueUsername } = require("../services/newAccountService");

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

/**
 * Refuses a sign-in. `info.code` travels to the callback in routes/auth/googleAuth.js, which
 * sends it to the sign-in page (?error=<code>) so the person is told why:
 *   domain-not-allowed  LOGIN_MODE=domain and the address is not a college address
 *   not-allowed         LOGIN_MODE=allowlist and the address is not on the access list
 */
const deny = (done, code) => done(null, false, { code });

/** A welcome notification for a new account. Never blocks the sign-in. */
async function sendWelcome(user) {
  try {
    const Notification = require('../models/Notification');
    await new Notification({
      userId: user._id,
      title: 'Welcome to CodeStats!',
      message: `Hey ${user.name}! Team SCOPE welcomes you to CodeStats!!`,
      read: false,
      autoDelete: true
    }).save();
    log.debug(`Welcome notification created for new user: ${user._id}`);
  } catch (notificationErr) {
    log.error('Error creating welcome notification:', notificationErr);
  }
}

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_BASE_URL}/auth/google/callback`,
      proxy: true,
      // The verify function receives the request, to read which sign-in page was used
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        log.debug('Received Google OAuth profile:', JSON.stringify({
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos
        }, null, 2));

        const picture = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

        // Who may sign in is decided in one place (services/accessListService.js):
        //   LOGIN_MODE=domain     only college addresses can create an account; existing accounts
        //                         are not checked again
        //   LOGIN_MODE=allowlist  only addresses on the access list, new and existing accounts alike

        // Check if user already exists by Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          log.debug(`User found by Google ID: ${user._id}`);
          if (!(await accessList.canAccess(user))) {
            log.debug(`Sign-in refused: ${user.email} is not on the access list`);
            return deny(done, 'not-allowed');
          }
          return done(null, user);
        }

        // If not, check if the email exists
        const email = normalizeEmail(profile.emails && profile.emails[0] && profile.emails[0].value);
        if (!email) {
          log.debug('Google profile has no email address');
          return deny(done, 'no-email');
        }
        log.debug(`Checking if email exists: ${email}`);
        user = await User.findOne({ email });

        if (user) {
          if (!(await accessList.canAccess(user))) {
            log.debug(`Sign-in refused: ${user.email} is not on the access list`);
            return deny(done, 'not-allowed');
          }
          // Link the Google account to the existing user
          log.debug(`Existing user found by email: ${user._id}, linking Google account`);
          user.googleId = profile.id;
          user.name = user.name || profile.displayName;
          user.profilePicture = user.profilePicture || picture;
          await user.save();
          return done(null, user);
        }

        // A new account: only if this address may sign in
        const verdict = await accessList.canCreateAccount(email);
        if (!verdict.allowed) {
          log.debug(`Sign-in refused (${verdict.reason}): ${email}`);
          return deny(done, verdict.reason);
        }

        // Accounts created from the teacher sign-in page skip the student profile form and
        // stay regular users until an admin approves their teacher access request. The
        // intent only matters here, for a brand-new account. An address the admin listed as a
        // teacher on the access list already has that approval: it becomes a teacher at once.
        const listedAsTeacher = Boolean(verdict.entry && verdict.entry.role === 'teacher');
        const isTeacherEntry = listedAsTeacher || readLoginIntent(req) === 'teacher';
        const accountSetup = listedAsTeacher
          ? { userType: 'teacher', signupIntent: 'teacher', newUser: false, profileCompleted: true }
          : isTeacherEntry
            ? { signupIntent: 'teacher', newUser: false, profileCompleted: true }
            : { newUser: true, profileCompleted: false };
        log.debug(`New account (${listedAsTeacher ? 'listed teacher' : isTeacherEntry ? 'teacher page' : 'student page'})`);

        // Roll number, department and year: read from a college address, placeholders for any
        // other address (the person types the real ones in the profile setup)
        const id = new mongoose.Types.ObjectId();
        const details = startingDetails(email, id);
        const username = await uniqueUsername(email);
        log.debug('Creating new user:', { email, username, rollNumber: details.rollNumber, department: details.department });

        // Check if phone number is available from Google profile
        let phoneNumber = '';
        if (profile._json && profile._json.phoneNumber) {
          // Format phone number to remove spaces and ensure it meets validation
          phoneNumber = profile._json.phoneNumber.replace(/[\s-]/g, '');
        }

        const newUser = new User({
          _id: id,
          googleId: profile.id,
          name: profile.displayName,
          email,
          username,
          rollNumber: details.rollNumber,
          department: details.department,
          // Teachers have no graduating year
          ...(!isTeacherEntry && details.graduatingYear && { graduatingYear: details.graduatingYear }),
          profilePicture: picture,
          // Only add mobileNumber if we have a valid one from Google
          ...(phoneNumber && { mobileNumber: phoneNumber }),
          // Students: new user who must complete their profile. Teachers: see accountSetup.
          ...accountSetup,
          password: Math.random().toString(36).slice(-10), // Generate random password
        });

        try {
          await newUser.save();
          log.debug(`New user created successfully with ID: ${newUser._id}`);
          await sendWelcome(newUser);
          return done(null, newUser);
        } catch (saveErr) {
          log.error('Error creating new user:', saveErr);
          // If there's a validation error, try to create with minimum required fields
          if (saveErr.name === 'ValidationError') {
            log.debug('Trying to create user with minimal fields...');
            const minimalUser = new User({
              _id: id,
              googleId: profile.id,
              name: profile.displayName || (isInstitutionEmail(email) ? 'MLRIT Student' : 'CodeStats user'),
              email,
              username,
              rollNumber: details.rollNumber,
              department: details.department,
              ...(!isTeacherEntry && details.graduatingYear && { graduatingYear: details.graduatingYear }),
              // Only add mobileNumber if we have a valid one from Google
              ...(phoneNumber && { mobileNumber: phoneNumber }),
              ...accountSetup
            });

            try {
              await minimalUser.save();
              log.debug(`Created minimal user with ID: ${minimalUser._id}`);
              await sendWelcome(minimalUser);
              return done(null, minimalUser);
            } catch (minimalSaveErr) {
              log.error('Error creating minimal user:', minimalSaveErr);
              return done(minimalSaveErr, null);
            }
          }
          return done(saveErr, null);
        }
      } catch (err) {
        log.error('Google auth error:', err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport; 
