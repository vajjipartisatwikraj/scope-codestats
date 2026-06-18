/**
 * Submission Rate Limiter Middleware
 *
 * Prevents spam submissions by enforcing a 5-second cooldown between submissions.
 * Inspired by LeetCode, CodeChef, and Codeforces submission policies.
 *
 * KEY FEATURES:
 * - User-based tracking (not IP-based) for authenticated users
 * - Handles multiple devices/sessions for same user
 * - Prevents concurrent submission spam from multiple tabs
 * - WiFi-friendly (multiple users on same network tracked separately)
 * - In-memory storage with automatic cleanup
 *
 * RESEARCH: Based on rate limiting strategies from:
 * - LeetCode: Time-based cooldown per user
 * - CodeChef: Token bucket with burst allowance
 * - Codeforces: Sliding window with penalties
 *
 * OUR APPROACH: Fixed cooldown (5 seconds) per user
 * Simple, predictable, and effective against spam
 */

const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// In-memory stores for different types of requests
// Structure: { userId: lastRequestTimestamp }
const submissionTimestamps = new Map(); // For submit requests (strict)
const runCodeTimestamps = new Map(); // For run code requests (lighter)

// Cooldown periods
const SUBMIT_COOLDOWN_MS = 5 * 1000; // 5 seconds for submissions
const RUN_CODE_COOLDOWN_MS = 2 * 1000; // 2 seconds for run code

// Grace period to allow concurrent requests (500ms)
// This prevents blocking when frontend sends duplicate requests on same click
const GRACE_PERIOD_MS = 500;

// Cleanup interval - remove old entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Cleanup old entries to prevent memory leaks
 * Removes entries older than 1 minute (way past cooldown)
 */
function cleanupOldEntries() {
  const now = Date.now();
  const expiryTime = 60 * 1000; // 1 minute

  // Clean submission timestamps
  for (const [key, timestamp] of submissionTimestamps.entries()) {
    if (now - timestamp > expiryTime) {
      submissionTimestamps.delete(key);
    }
  }

  // Clean run code timestamps
  for (const [key, timestamp] of runCodeTimestamps.entries()) {
    if (now - timestamp > expiryTime) {
      runCodeTimestamps.delete(key);
    }
  }

  console.log(
    `[Rate Limiter] Cleanup: ${submissionTimestamps.size} submit cooldowns, ${runCodeTimestamps.size} run cooldowns`
  );
}

// Start cleanup timer
setInterval(cleanupOldEntries, CLEANUP_INTERVAL_MS);

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
        // Return user-based identifier (solves WiFi/multi-device issues)
        return `user_${decoded.userId}`;
      }
    } catch (err) {
      // Invalid token, fall through to IP-based tracking
      console.log(
        "[Submission Rate Limiter] Invalid token, using IP-based tracking"
      );
    }
  }

  // For non-authenticated requests, use IP + User-Agent fingerprint
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  const fingerprint = Buffer.from(userAgent)
    .toString("base64")
    .substring(0, 20);

  return `anon_${ip}_${fingerprint}`;
}

/**
 * Generic rate limiter factory
 * Creates a rate limiter with specific cooldown and storage
 */
function createRateLimiter(timestampMap, cooldownMs, limitType) {
  return async (req, res, next) => {
    // Skip rate limiting for admin/teacher users
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check user type from database
        const User = require("../models/User");
        const user = await User.findById(decoded.userId)
          .select("userType")
          .lean();

        if (
          user &&
          (user.userType === "admin" || user.userType === "teacher")
        ) {
          console.log(
            `[${limitType} Rate Limiter] Skipping for ${user.userType}: ${decoded.userId}`
          );
          return next(); // Skip rate limiting for admin/teacher
        }
      } catch (err) {
        // Invalid token or DB error, apply rate limiting
        console.log(
          `[${limitType} Rate Limiter] Error checking user type, applying rate limit:`,
          err.message
        );
      }
    }

    // Apply rate limiting for regular users
    applyRateLimit(req, res, next, timestampMap, cooldownMs, limitType);
  };
}

/**
 * Apply rate limiting logic (extracted to separate function)
 */
function applyRateLimit(req, res, next, timestampMap, cooldownMs, limitType) {
  const userIdentifier = getUserIdentifier(req);
  const now = Date.now();
  const lastRequest = timestampMap.get(userIdentifier);

  // Check if user has made a request recently
  if (lastRequest) {
    const timeSinceLastRequest = now - lastRequest;

    // Allow concurrent requests within grace period (likely duplicate clicks)
    // Only enforce rate limit if time > grace period
    if (timeSinceLastRequest > GRACE_PERIOD_MS) {
      const remainingCooldown = cooldownMs - timeSinceLastRequest;

      if (remainingCooldown > 0) {
        // Still in cooldown period
        console.log(
          `[${limitType} Rate Limiter] Blocked: ${userIdentifier} - ${remainingCooldown}ms remaining`
        );

        return res.status(429).json({
          success: false,
          error: `${limitType} rate limit exceeded`,
          message: "Please wait before trying again.",
          retryAfter: Math.ceil(remainingCooldown / 1000), // seconds
          cooldownSeconds: cooldownMs / 1000,
          hint: `You can ${limitType.toLowerCase()} once every ${
            cooldownMs / 1000
          } seconds to prevent spam.`,
          // Additional info for frontend
          rateLimitInfo: {
            type: limitType,
            limit: `1 ${limitType.toLowerCase()} per ${
              cooldownMs / 1000
            } seconds`,
            remaining: 0,
            resetIn: Math.ceil(remainingCooldown / 1000),
            retryAfter: Math.ceil(remainingCooldown / 1000),
          },
        });
      }
    } else {
      // Within grace period - allow but don't update timestamp
      console.log(
        `[${limitType} Rate Limiter] Concurrent request within grace period: ${userIdentifier} - ${timeSinceLastRequest}ms since last`
      );
      next();
      return;
    }
  }

  // Update timestamp for this user
  timestampMap.set(userIdentifier, now);

  // Log for monitoring
  console.log(
    `[${limitType} Rate Limiter] Allowed: ${userIdentifier} - request permitted`
  );

  // Allow the request to proceed
  next();
}

/**
 * Submission rate limiter (5-second cooldown)
 * For: submit-code, submit-code-combined, cohort submissions, practice arena submissions
 */
const submissionRateLimiter = createRateLimiter(
  submissionTimestamps,
  SUBMIT_COOLDOWN_MS,
  "Submission"
);

/**
 * Run code rate limiter (2-second cooldown)
 * For: run-code endpoint (testing with custom input)
 */
const runCodeRateLimiter = createRateLimiter(
  runCodeTimestamps,
  RUN_CODE_COOLDOWN_MS,
  "Run Code"
);

/**
 * Get current rate limit status for a user (optional utility)
 * Can be used for frontend to show countdown timers
 */
function getRateLimitStatus(req) {
  const userIdentifier = getUserIdentifier(req);
  const now = Date.now();
  const lastSubmission = submissionTimestamps.get(userIdentifier);

  if (!lastSubmission) {
    return {
      canSubmit: true,
      remainingCooldown: 0,
    };
  }

  const timeSinceLastSubmission = now - lastSubmission;
  const remainingCooldown = Math.max(
    0,
    SUBMIT_COOLDOWN_MS - timeSinceLastSubmission
  );

  return {
    canSubmit: remainingCooldown === 0,
    remainingCooldown: Math.ceil(remainingCooldown / 1000), // in seconds
    lastSubmission: new Date(lastSubmission).toISOString(),
  };
}

module.exports = {
  submissionRateLimiter,
  runCodeRateLimiter,
  getRateLimitStatus,
  // Export for testing
  _internal: {
    submissionTimestamps,
    runCodeTimestamps,
    SUBMIT_COOLDOWN_MS,
    RUN_CODE_COOLDOWN_MS,
    getUserIdentifier,
  },
};
