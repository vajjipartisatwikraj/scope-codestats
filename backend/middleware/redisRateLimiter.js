/**
 * Redis-Based Submission Rate Limiter Middleware
 *
 * Production-ready rate limiter using Redis for distributed systems
 * Falls back to in-memory storage if Redis is unavailable
 *
 * KEY FEATURES:
 * - Redis-based for multi-server deployments
 * - User-based tracking (not IP-based) for authenticated users
 * - Handles multiple devices/sessions for same user
 * - Prevents concurrent submission spam from multiple tabs
 * - Automatic failover to in-memory storage
 * - Graceful degradation if Redis is down
 *
 * RATE LIMITS:
 * - Code Submission: 5 seconds cooldown
 * - Code Execution (Run): 2 seconds cooldown
 */

const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Optional Redis - only load if redis package is installed
let redisClient = null;
try {
  redisClient = require("../config/redis");
} catch (error) {
  console.log(
    "[Rate Limiter] ⚠️  Redis not installed, using in-memory fallback"
  );
}

// Cooldown periods
const SUBMIT_COOLDOWN_MS = 5 * 1000; // 5 seconds for submissions
const RUN_CODE_COOLDOWN_MS = 2 * 1000; // 2 seconds for run code
const GRACE_PERIOD_MS = 500; // Grace period for concurrent requests

// In-memory fallback (only used if Redis is unavailable)
const fallbackTimestamps = {
  submit: new Map(),
  run: new Map(),
};

/**
 * Cleanup old entries from fallback store
 */
function cleanupFallbackStore() {
  const now = Date.now();
  const expiryTime = 60 * 1000; // 1 minute

  for (const [key, timestamp] of fallbackTimestamps.submit.entries()) {
    if (now - timestamp > expiryTime) {
      fallbackTimestamps.submit.delete(key);
    }
  }

  for (const [key, timestamp] of fallbackTimestamps.run.entries()) {
    if (now - timestamp > expiryTime) {
      fallbackTimestamps.run.delete(key);
    }
  }

  console.log(
    `[Rate Limiter Fallback] Cleanup: ${fallbackTimestamps.submit.size} submit, ${fallbackTimestamps.run.size} run cooldowns`
  );
}

// Run cleanup every 5 minutes
setInterval(cleanupFallbackStore, 5 * 60 * 1000);

/**
 * Get user identifier from request
 * Priority:
 * 1. Authenticated user ID (from JWT token)
 * 2. IP + User-Agent fingerprint (for non-authenticated)
 */
function getUserIdentifier(req) {
  // Try to get user ID from JWT token
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.userId) {
        return `user_${decoded.userId}`;
      }
    } catch (err) {
      console.log(
        "[Submission Rate Limiter] Invalid token, using IP-based tracking"
      );
    }
  }

  // For non-authenticated requests, use IP + User-Agent fingerprint
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  // Create a simple hash from IP + User-Agent
  const hash = Buffer.from(`${ip}:${userAgent}`)
    .toString("base64")
    .substring(0, 20);
  return `anon_${hash}`;
}

/**
 * Check rate limit using Redis
 * @param {string} key - Redis key for this rate limit
 * @param {number} cooldownMs - Cooldown period in milliseconds
 * @param {string} type - Type of request ('submit' or 'run')
 */
async function checkRateLimit(key, cooldownMs, type) {
  // If Redis is not available, use fallback immediately
  if (!redisClient) {
    return checkRateLimitFallback(key, cooldownMs, type);
  }

  try {
    // Try to get last request time from Redis
    const lastRequestTime = await redisClient.get(key);

    if (lastRequestTime) {
      const timeSinceLastRequest = Date.now() - parseInt(lastRequestTime);

      // Check if still in cooldown
      if (timeSinceLastRequest < cooldownMs - GRACE_PERIOD_MS) {
        const remainingTime = Math.ceil(
          (cooldownMs - timeSinceLastRequest) / 1000
        );
        return {
          allowed: false,
          remainingTime,
          retryAfter: cooldownMs - timeSinceLastRequest,
        };
      }
    }

    // Update timestamp in Redis with expiration
    const expirySeconds = Math.ceil(cooldownMs / 1000) + 60; // Add buffer
    await redisClient.set(key, String(Date.now()), expirySeconds);

    return {
      allowed: true,
      remainingTime: 0,
      retryAfter: 0,
    };
  } catch (error) {
    console.error(
      `[Redis Rate Limiter] Error checking rate limit for ${type}:`,
      error.message
    );

    // Fallback to in-memory if Redis fails
    return checkRateLimitFallback(key, cooldownMs, type);
  }
}

/**
 * Fallback rate limit check using in-memory storage
 */
function checkRateLimitFallback(key, cooldownMs, type) {
  const store =
    type === "submit" ? fallbackTimestamps.submit : fallbackTimestamps.run;
  const lastRequestTime = store.get(key);

  if (lastRequestTime) {
    const timeSinceLastRequest = Date.now() - lastRequestTime;

    if (timeSinceLastRequest < cooldownMs - GRACE_PERIOD_MS) {
      const remainingTime = Math.ceil(
        (cooldownMs - timeSinceLastRequest) / 1000
      );
      return {
        allowed: false,
        remainingTime,
        retryAfter: cooldownMs - timeSinceLastRequest,
      };
    }
  }

  // Update timestamp
  store.set(key, Date.now());

  return {
    allowed: true,
    remainingTime: 0,
    retryAfter: 0,
  };
}

/**
 * Rate limiter for code submissions
 * Enforces 5-second cooldown between submissions
 */
const submissionRateLimiter = async (req, res, next) => {
  try {
    const userIdentifier = getUserIdentifier(req);
    const redisKey = `ratelimit:submit:${userIdentifier}`;

    const result = await checkRateLimit(redisKey, SUBMIT_COOLDOWN_MS, "submit");

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${result.remainingTime} second${
          result.remainingTime !== 1 ? "s" : ""
        } before submitting again`,
        error: "RATE_LIMIT_EXCEEDED",
        retryAfter: result.remainingTime,
        cooldownMs: SUBMIT_COOLDOWN_MS,
        type: "submission",
      });
    }

    // Rate limit check passed
    next();
  } catch (error) {
    console.error("[Submission Rate Limiter] Error:", error);
    // On error, allow the request (fail open)
    next();
  }
};

/**
 * Rate limiter for code execution (run code)
 * Enforces 2-second cooldown between runs
 */
const runCodeRateLimiter = async (req, res, next) => {
  try {
    const userIdentifier = getUserIdentifier(req);
    const redisKey = `ratelimit:run:${userIdentifier}`;

    const result = await checkRateLimit(redisKey, RUN_CODE_COOLDOWN_MS, "run");

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${result.remainingTime} second${
          result.remainingTime !== 1 ? "s" : ""
        } before running code again`,
        error: "RATE_LIMIT_EXCEEDED",
        retryAfter: result.remainingTime,
        cooldownMs: RUN_CODE_COOLDOWN_MS,
        type: "run_code",
      });
    }

    // Rate limit check passed
    next();
  } catch (error) {
    console.error("[Run Code Rate Limiter] Error:", error);
    // On error, allow the request (fail open)
    next();
  }
};

/**
 * Get rate limiter statistics (for monitoring/debugging)
 */
const getRateLimiterStats = async () => {
  const redisStatus = redisClient.getStatus();

  return {
    redis: {
      connected: redisStatus.connected,
      fallbackMode: redisStatus.fallbackMode,
    },
    fallback: {
      submitCooldowns: fallbackTimestamps.submit.size,
      runCooldowns: fallbackTimestamps.run.size,
    },
    config: {
      submitCooldownMs: SUBMIT_COOLDOWN_MS,
      runCodeCooldownMs: RUN_CODE_COOLDOWN_MS,
      gracePeriodMs: GRACE_PERIOD_MS,
    },
  };
};

module.exports = {
  submissionRateLimiter,
  runCodeRateLimiter,
  getRateLimiterStats,
};
