const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
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
      
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(errorMessage)}`);
    }

    if (!user) {
      console.log('No user returned from Google auth');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth-failed`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d'}
    );

    // Log successful authentication
    console.log(`User ${user._id} authenticated with Google, redirecting to auth success page`);
    console.log(`User type: ${user.userType || 'user (default)'}`);

    // Redirect to frontend auth success page with user data, including profile picture
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}&userId=${user._id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name)}&newUser=${user.newUser}&profileCompleted=${user.profileCompleted}&userType=${encodeURIComponent(user.userType || 'user')}&profilePicture=${encodeURIComponent(user.profilePicture || '')}`);
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
    console.error('Error fetching Google profile debug info:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 
