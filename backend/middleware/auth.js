const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
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
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
