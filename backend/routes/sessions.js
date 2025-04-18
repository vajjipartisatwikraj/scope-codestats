const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const geoip = require('geoip-lite');
const useragent = require('useragent');

// Middleware to authenticate token (assuming it's the same as in auth.js)
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to parse user agent
const parseUserAgent = (userAgentString) => {
  const agent = useragent.parse(userAgentString);
  
  return {
    browser: agent.family,
    platform: agent.os.family,
    deviceType: agent.device.family !== 'Other' ? agent.device.family : 'Desktop',
    userAgent: userAgentString
  };
};

// Function to get location from IP
const getLocationFromIp = (ip) => {
  try {
    // Handle localhost and private network IPs
    if (ip === '::1' || ip === 'localhost' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return {
        ip,
        city: 'Local Network',
        country: 'Local',
        countryCode: 'LOCAL'
      };
    }

    const cleanIp = ip.replace('::ffff:', ''); // Handle IPv6-mapped IPv4 addresses
    const geo = geoip.lookup(cleanIp);
    
    if (!geo) {
      return {
        ip,
        city: 'Unknown Location',
        country: 'Unknown',
        countryCode: 'UNK'
      };
    }
    
    return {
      ip,
      city: geo.city || 'Unknown City',
      country: geo.country || 'Unknown Country',
      countryCode: geo.country || 'UNK'
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      ip,
      city: 'Unknown Location',
      country: 'Unknown',
      countryCode: 'UNK'
    };
  }
};

// Register a new login session
router.post('/register', auth, async (req, res) => {
  try {
    const user = req.user;
    const userAgentString = req.headers['user-agent'];
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Generate a session ID
    const sessionId = uuidv4();
    
    // Parse user agent
    const deviceInfo = parseUserAgent(userAgentString);
    
    // Get location info
    const location = getLocationFromIp(ip);
    
    // Create new session
    const newSession = {
      deviceInfo,
      location,
      loginTime: new Date(),
      lastActiveTime: new Date(),
      sessionId,
      isCurrentSession: true
    };
    
    // Update existing sessions to not be current
    if (user.loginSessions) {
      user.loginSessions.forEach(session => {
        session.isCurrentSession = false;
      });
    }
    
    // Add the new session
    if (!user.loginSessions) {
      user.loginSessions = [];
    }
    user.loginSessions.push(newSession);
    
    // Limit to last 10 sessions
    if (user.loginSessions.length > 10) {
      user.loginSessions = user.loginSessions.slice(-10);
    }
    
    await user.save();
    
    res.json({
      message: 'Session registered successfully',
      sessionId
    });
  } catch (err) {
    console.error('Session registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active sessions for the user
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Sort sessions by login time (newest first)
    const sessions = user.loginSessions || [];
    sessions.sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
    
    res.json({
      sessions: sessions.map(session => ({
        id: session.sessionId,
        deviceInfo: {
          browser: session.deviceInfo.browser,
          platform: session.deviceInfo.platform,
          deviceType: session.deviceInfo.deviceType
        },
        location: {
          city: session.location.city,
          country: session.location.country
        },
        loginTime: session.loginTime,
        lastActiveTime: session.lastActiveTime,
        isCurrentSession: session.isCurrentSession
      }))
    });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Terminate a specific session
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const user = req.user;
    const { sessionId } = req.params;
    
    // Find the session index
    if (!user.loginSessions) {
      return res.status(404).json({ message: 'No sessions found' });
    }
    
    const sessionIndex = user.loginSessions.findIndex(
      session => session.sessionId === sessionId
    );
    
    if (sessionIndex === -1) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Remove the session
    user.loginSessions.splice(sessionIndex, 1);
    await user.save();
    
    res.json({ message: 'Session terminated successfully' });
  } catch (err) {
    console.error('Terminate session error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Terminate all other sessions
router.delete('/all/except-current', auth, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.loginSessions) {
      return res.status(404).json({ message: 'No sessions found' });
    }
    
    // Keep only the current session
    user.loginSessions = user.loginSessions.filter(session => session.isCurrentSession);
    
    await user.save();
    
    res.json({ message: 'All other sessions terminated successfully' });
  } catch (err) {
    console.error('Terminate all sessions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update last active time for current session
router.put('/update-activity', auth, async (req, res) => {
  try {
    const user = req.user;
    const { sessionId } = req.body;
    
    if (!user.loginSessions) {
      return res.status(404).json({ message: 'No sessions found' });
    }
    
    // Find the current session
    const sessionIndex = user.loginSessions.findIndex(
      session => session.sessionId === sessionId
    );
    
    if (sessionIndex === -1) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Update last active time
    user.loginSessions[sessionIndex].lastActiveTime = new Date();
    await user.save();
    
    res.json({ message: 'Session activity updated' });
  } catch (err) {
    console.error('Update activity error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 