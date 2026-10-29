/**
 * One-time migration: moves platform data that used to live on the User
 * document into the Profile collection.
 *
 * Legacy User fields read:  platformScores, platformData, profiles,
 *                           lifetimeScopeScore, lifetimeCohortProblemsSolved
 *
 * Rules (a Profile that already holds stats is never overwritten):
 *   - no Profile for a linked platform         -> created from the legacy entry
 *   - Profile exists but never fetched stats   -> stats filled from the legacy entry
 *   - Profile already synced                   -> left alone
 *   - scopecodestats                           -> lifetime values take the MAX of
 *                                                 the Profile and the legacy User
 *
 * Usage:
 *   node scripts/migrate-user-platform-data-to-profile.js                     dry run
 *   node scripts/migrate-user-platform-data-to-profile.js --apply             write
 *   node scripts/migrate-user-platform-data-to-profile.js --apply --drop-legacy
 *       also $unset the legacy fields from every User (only after verifying)
 *
 * The legacy fields stay in MongoDB (the schema simply ignores them) until
 * --drop-legacy is used, so the migration can be re-run safely.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Profile = require("../models/Profile");

const APPLY = process.argv.includes("--apply");
const DROP_LEGACY = process.argv.includes("--drop-legacy");

const LEGACY_FIELDS = [
  "platformScores",
  "platformData",
  "profiles",
  "githubStats",
  "contestStats",
  "problemStats",
  "totalScore",
  "totalProblemsSolved",
  "problemsSolved",
  "lastProfileSync",
  "lifetimeScopeScore",
  "lifetimeCohortProblemsSolved",
];

const toMap = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
};

const usernameOf = (entry, fallback) => {
  const raw = entry?.username ?? fallback;
  const value = typeof raw === "object" ? raw?.username : raw;
  return value ? String(value).trim() : "";
};

/** Legacy entry -> Profile stat fields (only fields that were stored). */
function statsFromLegacy(platform, entry = {}) {
  const fields = {};
  const copy = (to, ...from) => {
    for (const key of from) {
      if (entry[key] !== undefined && entry[key] !== null) {
        fields[to] = entry[key];
        return;
      }
    }
  };
  copy("score", "score");
  copy("rating", "rating");
  copy("maxRating", "maxRating");
  copy("rank", "rank");
  copy("contestsParticipated", "contestsParticipated");
  copy("globalRank", "globalRank", "global_rank", "ranking");
  copy("countryRank", "countryRank", "country_rank");
  copy("badges", "badges");
  copy("certificates", "certificates");

  if (platform === "github") {
    fields.problemsSolved = 0;
    fields.details = {
      publicRepos: entry.publicRepos || 0,
      totalCommits: entry.totalCommits || 0,
      followers: entry.followers || 0,
      following: entry.following || 0,
      starsReceived: entry.starsReceived || 0,
      contributionsLastYear: entry.contributionsLastYear || 0,
    };
  } else {
    copy("problemsSolved", "problemsSolved", "totalSolved");
    copy("easyProblemsSolved", "easyProblemsSolved", "easySolved");
    copy("mediumProblemsSolved", "mediumProblemsSolved", "mediumSolved");
    copy("hardProblemsSolved", "hardProblemsSolved", "hardSolved");
  }
  if (typeof fields.rank === "number") fields.rank = String(fields.rank);
  return fields;
}

async function main() {
  let uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (uri.includes("localhost")) uri = uri.replace(/localhost/g, "127.0.0.1");
  await mongoose.connect(uri);
  console.log(
    `Connected to ${mongoose.connection.name}. Mode: ${APPLY ? "APPLY" : "DRY RUN"}${DROP_LEGACY ? " + DROP LEGACY" : ""}\n`
  );

  const counts = { users: 0, created: 0, filled: 0, kept: 0, scope: 0, invalid: 0 };
  const cursor = User.collection.find({}, { projection: Object.fromEntries(["_id", ...LEGACY_FIELDS].map((f) => [f, 1])) });

  for await (const user of cursor) {
    counts.users++;
    const scores = toMap(user.platformScores);
    const data = toMap(user.platformData);
    const usernames = toMap(user.profiles);
    const existing = new Map(
      (await Profile.find({ userId: user._id }).lean()).map((p) => [p.platform, p])
    );

    for (const platform of Profile.EXTERNAL_PLATFORMS) {
      const entry = scores[platform] || data[platform] || null;
      const username = usernameOf(entry, usernames[platform]);
      if (!username) continue;

      const current = existing.get(platform);
      // Old Profile rows defaulted `lastUpdated` to creation time, so the status
      // (not the timestamp) tells whether stats were ever fetched.
      if (current && current.lastUpdateStatus === "success") {
        counts.kept++;
        continue;
      }

      const stats = entry ? statsFromLegacy(platform, entry) : {};
      const lastUpdated = entry?.lastUpdated ? new Date(entry.lastUpdated) : null;
      const candidate = new Profile({ userId: user._id, platform, username });
      if (!candidate.validateProfileFormat()) {
        counts.invalid++;
        console.warn(`  skipped ${platform} "${username}" for ${user._id}: invalid username format`);
        continue;
      }

      const update = {
        $set: { username, ...stats, ...(lastUpdated ? { lastUpdated, lastUpdateStatus: "success" } : {}) },
        $setOnInsert: { userId: user._id, platform },
      };
      if (APPLY) {
        await Profile.updateOne({ userId: user._id, platform }, update, { upsert: true });
      }
      current ? counts.filled++ : counts.created++;
    }

    // Scope-CodeStats: carry the never-decreasing lifetime values across.
    const legacyScope = scores.scopecodestats || data.scopecodestats || {};
    const lifetimeScore = Math.max(
      user.lifetimeScopeScore || 0,
      legacyScope.lifetimeScore || 0,
      legacyScope.totalCohortScore || 0
    );
    const lifetimeProblems = Math.max(
      user.lifetimeCohortProblemsSolved || 0,
      legacyScope.totalCohortProblemsolved || legacyScope.totalCohortProblemsSolved || 0
    );
    if (lifetimeScore > 0 || lifetimeProblems > 0) {
      const current = existing.get("scopecodestats");
      const email = (await User.findById(user._id).select("email").lean())?.email;
      if (APPLY && (current || email)) {
        await Profile.updateOne(
          { userId: user._id, platform: "scopecodestats" },
          {
            $max: {
              lifetimeScore,
              lifetimeProblems,
              totalCohortScore: lifetimeScore,
              totalCohortProblemsSolved: lifetimeProblems,
              problemsSolved: lifetimeProblems,
            },
            $setOnInsert: { userId: user._id, platform: "scopecodestats", username: email || String(user._id) },
          },
          { upsert: true }
        );
      }
      counts.scope++;
    }
  }

  console.log("Summary:", counts);
  console.log(
    APPLY
      ? "Done. Run a profile sync (or wait for the nightly job) to refresh scores, then verify the leaderboard."
      : "Dry run only. Re-run with --apply to write."
  );

  if (APPLY && DROP_LEGACY) {
    const result = await User.collection.updateMany(
      {},
      { $unset: Object.fromEntries(LEGACY_FIELDS.map((f) => [f, ""])) }
    );
    console.log(`Removed legacy platform fields from ${result.modifiedCount} users.`);
  } else if (DROP_LEGACY) {
    console.log("--drop-legacy needs --apply; nothing removed.");
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
