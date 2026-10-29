const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Check if req.user exists and has a userType of 'admin' or 'teacher'
    if (!req.user || (req.user.userType !== 'admin' && req.user.userType !== 'teacher')) {
      return res.status(403).json({ message: 'Access denied. Admin or Teacher privileges required.' });
    }

    next();
  } catch (err) {
    require('../utils/logger').captureError(res, err);
    res.status(500).json({ message: 'Server error' });
  }
}; 