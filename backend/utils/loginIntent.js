/**
 * Which sign-in page the person started from: "student" (the normal one) or "teacher".
 *
 * The teacher page starts Google sign-in with a signed, short-lived `state` value that
 * Google hands back to the callback unchanged. Nothing else differs: both pages use the
 * same callback and the same JWT. A missing, expired or forged value means "student".
 *
 * The intent is only a hint. It chooses how a brand-new account is set up and where the
 * person lands; it never changes anyone's role.
 */
const jwt = require("jsonwebtoken");

const PURPOSE = "login-intent";
const TTL = "10m";

/** The value to send to Google as `state` for the given intent. */
function signLoginIntent(intent) {
  return jwt.sign({ purpose: PURPOSE, intent }, process.env.JWT_SECRET, { expiresIn: TTL });
}

/** "teacher" only when the request carries a valid teacher state; otherwise "student". */
function readLoginIntent(req) {
  const state = req && req.query && req.query.state;
  if (typeof state !== "string" || !state) return "student";
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    return decoded.purpose === PURPOSE && decoded.intent === "teacher" ? "teacher" : "student";
  } catch {
    return "student";
  }
}

module.exports = { signLoginIntent, readLoginIntent };
