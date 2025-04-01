const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../../models/User');

// Configure Passport Google OAuth strategy
require('../../config/passport');

// Google OAuth login route
router.get('/', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Google OAuth callback route
router.get('/callback', (req, res, next) => {
  console.log('Received Google OAuth callback');
  
  passport.authenticate('google', { failureRedirect: '/login?error=google-auth-failed' }, (err, user) => {
    if (err) {
      console.error('Google auth error:', err);
      let errorMessage = 'Authentication failed';
      
      // Handle validation errors specifically
      if (err.name === 'ValidationError') {
        errorMessage = err.message.replace('User validation failed: ', '');
        console.log('Validation error occurred:', errorMessage);
      }
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(errorMessage)}`);
    }

    if (!user) {
      console.log('No user returned from Google auth');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth-failed`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful authentication
    console.log(`User ${user._id} authenticated with Google, redirecting to auth success page`);
    console.log(`User type: ${user.userType || 'user (default)'}`);

    // Redirect to frontend auth success page with user data, including userType
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}&userId=${user._id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name)}&newUser=${user.newUser}&profileCompleted=${user.profileCompleted}&userType=${encodeURIComponent(user.userType || 'user')}`);
  })(req, res, next);
});

module.exports = router; 