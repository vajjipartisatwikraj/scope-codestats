/**
 * Rate limit for the public profile page (GET /api/users/public/:username).
 *
 * The page is open to anyone, so it is limited per IP address:
 *  - at most 2 requests in any 1 second;
 *  - the request that goes over the limit blocks the IP for 1 minute. Every request from a
 *    blocked IP is answered with 429 until the minute is over, and requests made while blocked
 *    do not extend the block.
 *
 * The limit is the same for everyone (signed-in users, teachers and admins included), because it
 * is about the address, not the account. A request counts whether or not the profile exists, so
 * the page cannot be used to probe for usernames quickly.
 *
 * State is kept in memory (one Node process). It is small and cleans itself: an address is
 * forgotten once its last request is more than a second old and any block has ended. Behind a
 * proxy the real address comes from `trust proxy` (see server.js).
 */
const log = require("../utils/logger").scope("RATE-LIMIT");

const MAX_REQUESTS = 2;
const WINDOW_MS = 1000;
const BLOCK_MS = 60 * 1000;
const SWEEP_MS = 30 * 1000;

/** ip -> timestamps (ms) of its requests in the last second */
const recent = new Map();
/** ip -> time (ms) the block ends */
const blockedUntil = new Map();

const addressOf = (req) => (req.ip || req.socket?.remoteAddress || "unknown").replace(/^::ffff:/, "");

/** Drops what can no longer matter, so the maps do not grow with every visitor. */
const sweep = (now = Date.now()) => {
  for (const [ip, until] of blockedUntil) {
    if (until <= now) blockedUntil.delete(ip);
  }
  for (const [ip, times] of recent) {
    if (times.length === 0 || now - times[times.length - 1] >= WINDOW_MS) recent.delete(ip);
  }
};

const sweeper = setInterval(sweep, SWEEP_MS);
sweeper.unref(); // never keeps the process alive

const reject = (res, retryAfterSeconds, message) => {
  res.set("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    error: "Rate limit exceeded",
    message,
    retryAfterSeconds,
    limit: MAX_REQUESTS,
    windowSeconds: WINDOW_MS / 1000,
  });
};

/** Express middleware. Exported with a `reset` helper for tests. */
function publicProfileRateLimit(req, res, next) {
  const now = Date.now();
  const ip = addressOf(req);

  const until = blockedUntil.get(ip);
  if (until && until > now) {
    return reject(res, Math.ceil((until - now) / 1000), "Too many requests. This network is blocked for a short time. Please try again later.");
  }
  if (until) blockedUntil.delete(ip);

  const times = (recent.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  times.push(now);
  recent.set(ip, times);

  if (times.length > MAX_REQUESTS) {
    blockedUntil.set(ip, now + BLOCK_MS);
    recent.delete(ip);
    log.warn(`public profile limit exceeded, ${ip} blocked for ${BLOCK_MS / 1000}s`);
    return reject(res, BLOCK_MS / 1000, "Too many requests. This network is blocked for 1 minute. Please try again later.");
  }

  return next();
}

publicProfileRateLimit.reset = () => {
  recent.clear();
  blockedUntil.clear();
};

module.exports = publicProfileRateLimit;
