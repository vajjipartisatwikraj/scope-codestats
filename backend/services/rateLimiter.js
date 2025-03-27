const rateLimit = require('express-rate-limit');

// Create a limiter for API endpoints
const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests, please try again later.'
    }
  });
};

// Different rate limits for different platforms
const platformLimits = {
  leetcode: createRateLimiter(60 * 1000, 10),     // 10 requests per minute
  codeforces: createRateLimiter(60 * 1000, 5),    // 5 requests per minute
  codechef: createRateLimiter(60 * 1000, 10),     // 10 requests per minute
  geeksforgeeks: createRateLimiter(60 * 1000, 15),// 15 requests per minute
  hackerrank: createRateLimiter(60 * 1000, 10)    // 10 requests per minute
};

module.exports = platformLimits;
