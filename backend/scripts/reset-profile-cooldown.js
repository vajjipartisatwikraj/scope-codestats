/**
 * Clears the 6-hour profile-update cooldown for one user, so a platform profile
 * can be re-saved immediately while testing.
 *
 * The cooldown is derived from `Profile.lastUpdateAttempt`
 * (`services/rateLimiter.js`), so resetting it only means unsetting that
 * timestamp. Scores, usernames and every other field are left untouched.
 *
 * Scoped to a single user on purpose: it takes an identifier and refuses to run
 * without one, so it can never clear cooldowns platform-wide by accident.
 *
 * Usage:
 *   node scripts/reset-profile-cooldown.js <email|rollNumber> [platform]
 *
 * Examples:
 *   node scripts/reset-profile-cooldown.js 23R21A05Y9
 *   node scripts/reset-profile-cooldown.js 23R21A05Y9 leetcode
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const Profile = require("../models/Profile");

const VALID_PLATFORMS = [
  "leetcode",
  "codechef",
  "codeforces",
  "hackerrank",
  "github",
];

async function main() {
  const [identifier, platform] = process.argv.slice(2);

  if (!identifier) {
    console.error(
      "Usage: node scripts/reset-profile-cooldown.js <email|rollNumber> [platform]"
    );
    process.exit(1);
  }
  if (platform && !VALID_PLATFORMS.includes(platform)) {
    console.error(
      `Unknown platform "${platform}". Expected one of: ${VALID_PLATFORMS.join(", ")}`
    );
    process.exit(1);
  }

  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }
  // Node 18+ resolves localhost to IPv6 first, which Mongo may not be listening on.
  if (uri.includes("localhost")) uri = uri.replace(/localhost/g, "127.0.0.1");

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}`);

  // Match on either identifier, case-insensitively for the roll number since it
  // is stored with its original casing.
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { rollNumber: new RegExp(`^${identifier}$`, "i") },
    ],
  }).select("name email rollNumber");

  if (!user) {
    console.error(`No user found for "${identifier}"`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`User: ${user.name} (${user.email}, ${user.rollNumber})`);

  const filter = { userId: user._id, ...(platform ? { platform } : {}) };
  const profiles = await Profile.find(filter).select(
    "platform username lastUpdateAttempt updateAttempts"
  );

  if (profiles.length === 0) {
    console.log("No profile rows to reset.");
    await mongoose.disconnect();
    return;
  }

  console.log("\nBefore:");
  profiles.forEach((p) => {
    console.log(
      `  ${p.platform.padEnd(11)} lastUpdateAttempt=${
        p.lastUpdateAttempt ? p.lastUpdateAttempt.toISOString() : "null"
      }`
    );
  });

  // Unsetting the timestamp is all the limiter checks; nothing else is modified.
  const result = await Profile.updateMany(filter, {
    $set: { lastUpdateAttempt: null },
  });

  const changed = result.modifiedCount ?? result.nModified ?? 0;
  console.log(`\nCleared the cooldown on ${changed} profile row(s).`);
  console.log("You can now update the profile from the dashboard immediately.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
