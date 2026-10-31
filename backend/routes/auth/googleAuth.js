const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Configure Passport Google OAuth strategy
require('../../config/passport');
const log = require("../../utils/logger").scope("GOOGLE-AUTH");
const { signLoginIntent, readLoginIntent } = require('../../utils/loginIntent');

// Two sign-in pages share one Google flow, one callback and one JWT. The teacher page
// only adds a signed `state` that comes back to the callback (utils/loginIntent.js);
// the student route is unchanged.

// Google OAuth login route (student sign-in page)
router.get('/', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Google OAuth login route (teacher sign-in page)
router.get('/teacher', (req, res, next) =>
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state: signLoginIntent('teacher')
  })(req, res, next)
);

// Google OAuth callback route (both sign-in pages)
router.get('/callback', (req, res, next) => {
  log.debug('Received Google OAuth callback');
  // Where to send the person back to if sign-in fails
  const loginPath = readLoginIntent(req) === 'teacher' ? '/teacher-login' : '/login';
  
  passport.authenticate('google', { failureRedirect: '/login?error=google-auth-failed' }, async (err, user, info) => {
    if (err) {
      log.error('Google auth error:', err);
      let errorMessage = 'Authentication failed';
      
      // Handle validation errors specifically
      if (err.name === 'ValidationError') {
        errorMessage = err.message.replace('User validation failed: ', '');
        log.debug('Validation error occurred:', errorMessage);
      }
      
      return res.redirect(`${process.env.FRONTEND_URL}${loginPath}?error=${encodeURIComponent(errorMessage)}`);
    }

    if (!user) {
      // The strategy says why it refused in info.code (config/passport.js). Only these two
      // are passed on, so nothing else can be put on the sign-in page through the URL.
      const reason = ['not-allowed', 'domain-not-allowed'].includes(info && info.code) ? info.code : 'auth-failed';
      log.debug(`No user returned from Google auth (${reason})`);
      return res.redirect(`${process.env.FRONTEND_URL}${loginPath}?error=${reason}`);
    }

    // Generate unique session token for single active login enforcement
    const crypto = require('crypto');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Update user with new session token (invalidates previous sessions)
    await User.findByIdAndUpdate(user._id, {
      sessionToken: sessionToken,
      lastLoginAt: new Date(),
      lastLoginDevice: req.headers['user-agent'] || 'Unknown'
    });
    
    // Generate JWT token with session token embedded
    const token = jwt.sign(
      { 
        userId: user._id,
        sessionToken: sessionToken
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d'}
    );

    // Log successful authentication
    log.debug(`User ${user._id} authenticated with Google, redirecting to auth success page`);
    log.debug(`User type: ${user.userType || 'user (default)'}`);
    log.debug(`Session token generated - old sessions invalidated`);

    // Redirect to frontend auth success page with user data, including profile picture
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}&userId=${user._id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name)}&newUser=${user.newUser}&profileCompleted=${user.profileCompleted}&userType=${encodeURIComponent(user.userType || 'user')}&signupIntent=${encodeURIComponent(user.signupIntent || 'student')}&profilePicture=${encodeURIComponent(user.profilePicture || '')}`);
  })(req, res, next);
});

// Debug route to get Google profile information
router.get('/debug-profile', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.user._id).select('name email profilePicture googleId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json({
      message: 'Google profile debug information',
      user: {
        name: user.name,
        email: user.email,
        hasProfilePicture: !!user.profilePicture,
        profilePictureUrl: user.profilePicture || '',
        googleId: user.googleId || null
      }
    });
  } catch (error) {
    log.error('Error fetching Google profile debug info:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 
