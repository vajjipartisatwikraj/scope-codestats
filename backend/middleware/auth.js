const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const accessList = require('../services/accessListService');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
    // Set basic user information from token
    req.user = {
      id: decoded.userId
    };
    
    // Get the full user information from database including userType and sessionToken
    const user = await User.findById(decoded.userId).select('userType sessionToken email');
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if session token matches (single active login enforcement)
    // If sessionToken exists in DB and doesn't match the one in JWT, reject
    if (user.sessionToken && decoded.sessionToken !== user.sessionToken) {
      return res.status(401).json({ 
        message: 'Your session has been invalidated. You have logged in from another device.',
        code: 'SESSION_EXPIRED',
        sessionExpired: true
      });
    }
    
    // LOGIN_MODE=allowlist: an address taken off the access list is blocked on its next request,
    // even with a token that has not expired. (Always true in domain mode, and for admins.)
    if (!(await accessList.canAccess(user))) {
      res.locals.logMessage = 'Access revoked: email is not on the access list';
      return res.status(401).json({
        message: 'Your email address no longer has access. Contact your coordinator.',
        code: 'ACCESS_REVOKED'
      });
    }

    req.user.userType = user.userType;
    
    next();
  } catch (err) {
    // A bad or expired token is a normal 401, shown by the request log.
    // Anything else (for example a database failure) is logged as the error.
    if (err.name === 'TokenExpiredError') {
      res.locals.logMessage = 'Token expired';
    } else if (err.name !== 'JsonWebTokenError' && err.name !== 'NotBeforeError') {
      logger.captureError(res, err);
      // A database failure is not a bad token. A 401 here would log everyone out of the app
      // during a short outage, so answer 503 and let the client retry.
      return res.status(503).json({
        message: 'Service temporarily unavailable. Please try again.',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
    res.status(401).json({ 
      message: 'Token is not valid',
      code: 'TOKEN_INVALID'
    });
  }
};
