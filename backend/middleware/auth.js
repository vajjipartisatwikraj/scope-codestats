const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  // Check for Bearer token in Authorization header
  const authHeader = req.header('Authorization');
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Fallback to x-auth-token header
    token = req.header('x-auth-token');
  }

  if (!token) {
    return res.status(401).json({ 
      message: 'No token, authorization denied',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set basic user information from token
    req.user = {
      id: decoded.userId
    };
    
    // Get the full user information from database including userType and sessionToken
    const user = await User.findById(decoded.userId).select('userType sessionToken');
    if (!user) {
      console.log(`User not found for ID: ${decoded.userId}`);
      return res.status(401).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if session token matches (single active login enforcement)
    // If sessionToken exists in DB and doesn't match the one in JWT, reject
    if (user.sessionToken && decoded.sessionToken !== user.sessionToken) {
      console.log(`Session invalidated for user: ${decoded.userId} - User logged in elsewhere`);
      return res.status(401).json({ 
        message: 'Your session has been invalidated. You have logged in from another device.',
        code: 'SESSION_EXPIRED',
        sessionExpired: true
      });
    }
    
    req.user.userType = user.userType;
    console.log(`User authenticated: ${decoded.userId}, Type: ${req.user.userType}`);
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ 
      message: 'Token is not valid',
      code: 'TOKEN_INVALID'
    });
  }
};
