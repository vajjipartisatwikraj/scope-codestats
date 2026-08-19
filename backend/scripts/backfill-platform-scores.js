/**
 * Backfills `User.platformScores` from the `Profile` collection.
 *
 * Fixes rows left behind by the original bug, where the dashboard wrote fetched
 * stats to `Profile` only and the leaderboard column stayed at 0 (or kept an old
 * username's score) until the nightly cron ran.
 *
 * Uses the same `services/profileMirror` the route now uses, so the result is
 * identical to what a fresh dashboard update produces.
 *
 * Usage:
 *   node scripts/backfill-platform-scores.js <email|rollNumber>   one user
 *   node scripts/backfill-platform-scores.js --all                every user
 *   node scripts/backfill-platform-scores.js <id> --dry-run       report only
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const Profile = require("../models/Profile");
const { mirrorProfileToUser } = require("../services/profileMirror");

async function backfillUser(user, { dryRun }) {
  const profiles = await Profile.find({ userId: user._id })
    .select(
      "platform username score problemsSolved easyProblemsSolved mediumProblemsSolved " +
        "hardProblemsSolved rating rank maxRating globalRank countryRank " +
        "contestsParticipated badges certificates details lastUpdated lastUpdateStatus"
    )
    .lean();

  if (profiles.length === 0) return { changed: 0, skipped: 0 };

  const stored =
    user.platformScores instanceof Map
      ? Object.fromEntries(user.platformScores)
      : user.platformScores || {};

  let changed = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const existing = stored[profile.platform];

    // Only worth mirroring when the stored copy is missing, from a different
    // username, or carries a different score.
    const needsMirror =
      !existing ||
      existing.username !== profile.username ||
      (existing.score || 0) !== (profile.score || 0);

    if (!needsMirror) {
      skipped += 1;
      continue;
    }

    const before = existing
      ? `${existing.username}:${existing.score || 0}`
      : "missing";
    const after = `${profile.username}:${profile.score || 0}`;

    console.log(`    ${profile.platform.padEnd(15)} ${before}  →  ${after}`);

    if (!dryRun) {
      // `platformData` is only available on a live fetch; the Profile row already
      // holds the equivalent flat fields, which the builders fall back to.
      await mirrorProfileToUser(user._id, profile.platform, profile, {});
    }
    changed += 1;
  }

  return { changed, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const all = args.includes("--all");
  const identifier = args.find((a) => !a.startsWith("--"));

  if (!identifier && !all) {
    console.error(
      "Usage: node scripts/backfill-platform-scores.js <email|rollNumber> | --all [--dry-run]"
    );
    process.exit(1);
  }

  let uri = process.env.MONGODB_URI;
  if (uri.includes("localhost")) uri = uri.replace(/localhost/g, "127.0.0.1");
  await mongoose.connect(uri);
  console.log(`Database: ${mongoose.connection.name}`);
  if (dryRun) console.log("DRY RUN — nothing will be written\n");

  const filter = all
    ? {}
    : {
        $or: [
          { email: identifier.toLowerCase() },
          { rollNumber: new RegExp(`^${identifier}$`, "i") },
        ],
      };

  const users = await User.find(filter).select(
    "name rollNumber platformScores platformData totalScore"
  );

  if (users.length === 0) {
    console.error("No matching users");
    await mongoose.disconnect();
    process.exit(1);
  }

  let totalChanged = 0;

  for (const user of users) {
    const result = await backfillUser(user, { dryRun });
    if (result.changed > 0) {
      console.log(
        `  ${user.name} (${user.rollNumber}): ${result.changed} platform(s) updated\n`
      );
      totalChanged += result.changed;
    }
  }

  console.log(
    `\nDone. ${totalChanged} platform entr${totalChanged === 1 ? "y" : "ies"} ` +
      `${dryRun ? "would be" : ""} updated across ${users.length} user(s).`
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
