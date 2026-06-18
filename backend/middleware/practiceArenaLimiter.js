const User = require('../models/User');

/**
 * Middleware to check if user has exceeded daily practice arena test limit
 * Limit: 3 tests per day (resets at 12:00 AM IST)
 */
const checkDailyTestLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get current date in IST timezone (UTC + 5:30)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStartIST = new Date(nowIST);
    todayStartIST.setHours(0, 0, 0, 0);
    
    // Initialize practiceArenaDailyLimit if not exists
    if (!user.practiceArenaDailyLimit) {
      user.practiceArenaDailyLimit = {
        lastResetDate: todayStartIST,
        testsStartedToday: 0
      };
    }
    
    // Check if we need to reset the counter (new day)
    const lastResetDate = user.practiceArenaDailyLimit.lastResetDate 
      ? new Date(user.practiceArenaDailyLimit.lastResetDate)
      : null;
    
    if (!lastResetDate || lastResetDate < todayStartIST) {
      // New day - reset counter
      user.practiceArenaDailyLimit.lastResetDate = todayStartIST;
      user.practiceArenaDailyLimit.testsStartedToday = 0;
      await user.save();
    }
    
    // Check if user has reached the daily limit (3 tests per day)
    const DAILY_LIMIT = 3;
    if (user.practiceArenaDailyLimit.testsStartedToday >= DAILY_LIMIT) {
      return res.status(429).json({
        message: `Daily test limit reached. You can start only ${DAILY_LIMIT} tests per day.`,
        error: 'DAILY_LIMIT_EXCEEDED',
        testsStartedToday: user.practiceArenaDailyLimit.testsStartedToday,
        dailyLimit: DAILY_LIMIT,
        resetTime: getNextResetTime()
      });
    }
    
    // Attach user to request for route to use
    req.userData = user;
    next();
  } catch (error) {
    console.error('Error in practice arena limiter:', error);
    res.status(500).json({ message: 'Error checking daily limit', error: error.message });
  }
};

/**
 * Helper function to increment the daily test counter
 * Call this after successfully starting a test
 */
const incrementDailyTestCount = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get current date in IST timezone
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStartIST = new Date(nowIST);
    todayStartIST.setHours(0, 0, 0, 0);
    
    // Initialize if not exists
    if (!user.practiceArenaDailyLimit) {
      user.practiceArenaDailyLimit = {
        lastResetDate: todayStartIST,
        testsStartedToday: 0
      };
    }
    
    // Check if we need to reset (new day)
    const lastResetDate = user.practiceArenaDailyLimit.lastResetDate 
      ? new Date(user.practiceArenaDailyLimit.lastResetDate)
      : null;
    
    if (!lastResetDate || lastResetDate < todayStartIST) {
      user.practiceArenaDailyLimit.lastResetDate = todayStartIST;
      user.practiceArenaDailyLimit.testsStartedToday = 0;
    }
    
    // Increment counter
    user.practiceArenaDailyLimit.testsStartedToday += 1;
    await user.save();
    
    return {
      testsStartedToday: user.practiceArenaDailyLimit.testsStartedToday,
      remainingTests: 3 - user.practiceArenaDailyLimit.testsStartedToday
    };
  } catch (error) {
    console.error('Error incrementing daily test count:', error);
    throw error;
  }
};

/**
 * Get the next reset time (12:00 AM IST)
 */
const getNextResetTime = () => {
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const nextReset = new Date(nowIST);
  nextReset.setHours(24, 0, 0, 0); // Set to next midnight
  return nextReset.toISOString();
};

/**
 * Get remaining tests for today
 */
const getRemainingTests = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get current date in IST timezone
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStartIST = new Date(nowIST);
    todayStartIST.setHours(0, 0, 0, 0);
    
    // Initialize if not exists
    if (!user.practiceArenaDailyLimit) {
      return {
        testsStartedToday: 0,
        remainingTests: 3,
        dailyLimit: 3,
        resetTime: getNextResetTime()
      };
    }
    
    // Check if we need to reset (new day)
    const lastResetDate = user.practiceArenaDailyLimit.lastResetDate 
      ? new Date(user.practiceArenaDailyLimit.lastResetDate)
      : null;
    
    let testsStartedToday = user.practiceArenaDailyLimit.testsStartedToday || 0;
    
    if (!lastResetDate || lastResetDate < todayStartIST) {
      testsStartedToday = 0;
    }
    
    return {
      testsStartedToday,
      remainingTests: Math.max(0, 3 - testsStartedToday),
      dailyLimit: 3,
      resetTime: getNextResetTime()
    };
  } catch (error) {
    console.error('Error getting remaining tests:', error);
    throw error;
  }
};

module.exports = {
  checkDailyTestLimit,
  incrementDailyTestCount,
  getRemainingTests,
  getNextResetTime
};
