/**
 * Ending a person's sessions from the server.
 *
 * The app allows one active login per account: every sign-in stores a new random `sessionToken` on
 * the user and puts the same value in the JWT, and middleware/auth.js (and the check in
 * routes/auth.js) refuse a JWT whose value no longer matches. So replacing the stored value signs
 * the person out of every device on its next request, with nothing to look up or delete.
 *
 * `reason` is kept until the next sign-in so the app can tell the person why ("role_changed": their
 * access was updated). The sign-in code clears it.
 */
const crypto = require("crypto");
const User = require("../models/User");

const REASONS = ["role_changed"];

/**
 * @param {any} userId
 * @param {"role_changed"} reason
 */
async function endSessions(userId, reason) {
  if (!REASONS.includes(reason)) throw new Error(`Unknown session end reason: ${reason}`);
  await User.updateOne(
    { _id: userId },
    { $set: { sessionToken: crypto.randomBytes(32).toString("hex"), sessionEndedReason: reason } }
  );
}

/** What the person is told when a request is refused because their sessions were ended */
const MESSAGES = {
  role_changed: "Your access was updated. Please sign in again.",
};

module.exports = { endSessions, MESSAGES };
