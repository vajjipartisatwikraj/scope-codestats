const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Check if req.user exists and has a userType of 'admin' or 'teacher'
    if (!req.user || (req.user.userType !== 'admin' && req.user.userType !== 'teacher')) {
      console.log(`Admin/Teacher access denied for user: ${req.user?.id}, userType: ${req.user?.userType}`);
      return res.status(403).json({ message: 'Access denied. Admin or Teacher privileges required.' });
    }

    console.log(`Admin/Teacher access granted for user: ${req.user.id}, userType: ${req.user.userType}`);
    next();
  } catch (err) {
    console.error('Admin/Teacher auth error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}; 