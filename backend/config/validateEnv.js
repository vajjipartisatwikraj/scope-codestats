/**
 * Checks the environment once at start-up.
 *
 * A missing required value stops the process with a clear message, instead of failing later
 * on the first login (for example a redirect to "undefined/login"). Weak values only warn,
 * so an existing deployment keeps starting while the secrets are rotated.
 */
const logger = require("../utils/logger");
const { MODES, isValidMode, loginMode } = require("./loginAccess");

const REQUIRED = [
  "MONGODB_URI",
  "JWT_SECRET",
  "SESSION_SECRET",
  "FRONTEND_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

const MIN_SECRET_LENGTH = 32;

function validateEnv(env = process.env) {
  const missing = REQUIRED.filter((name) => !env[name] || !String(env[name]).trim());
  if (missing.length) {
    logger.error("CONFIG", new Error(`missing environment variables: ${missing.join(", ")}`));
    process.exit(1);
  }

  // A typo here must not silently fall back to another mode, so it stops the start-up
  if (!isValidMode(env)) {
    logger.error(
      "CONFIG",
      new Error(`LOGIN_MODE must be one of: ${MODES.join(", ")} (got "${env.LOGIN_MODE}")`),
    );
    process.exit(1);
  }
  logger.info("CONFIG", `login mode: ${loginMode(env)}`);

  for (const name of ["JWT_SECRET", "SESSION_SECRET"]) {
    if (env[name].length < MIN_SECRET_LENGTH) {
      logger.warn("CONFIG", `${name} is shorter than ${MIN_SECRET_LENGTH} characters, rotate it to a long random value`);
    }
  }

  if (env.JWT_SECRET === env.SESSION_SECRET) {
    logger.warn("CONFIG", "JWT_SECRET and SESSION_SECRET are the same value, use two different secrets");
  }

  if (env.NODE_ENV !== "production" && /^https:\/\//i.test(env.FRONTEND_URL)) {
    logger.warn(
      "CONFIG",
      "FRONTEND_URL is https but NODE_ENV is not production: CORS is limited to localhost and the session cookie is not secure",
    );
  }
}

module.exports = validateEnv;
