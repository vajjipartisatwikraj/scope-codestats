/**
 * One-time backfill: seed the new sparse ActivityHeatmap for all existing
 * users from their historical DailyStats snapshots.
 *
 * After this runs once, live triggers (cohort/practice submissions + the
 * daily profile-sync external-delta trigger) keep the heatmap current.
 *
 * Usage:
 *   node backend/scripts/backfillHeatmap.js            # all active users
 *   node backend/scripts/backfillHeatmap.js <userId>   # a single user
 *
 * Safe to re-run: rebuildFromEvents replaces a user's heatmap docs.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const ActivityHeatmap = require("../models/ActivityHeatmap");

async function run() {
  await connectDB();

  const singleUserId = process.argv[2];
  const query = singleUserId
    ? { _id: singleUserId }
    : { userType: { $nin: ["admin", "teacher"] } };

  const users = await User.find(query).select("_id name email").lean();
  console.log(`Backfilling heatmap for ${users.length} user(s)...`);

  // Full fresh rebuild: clear the entire heatmap collection first so no stale
  // docs (including externally-sourced counts from earlier logic) survive.
  if (!singleUserId) {
    const cleared = await ActivityHeatmap.deleteMany({});
    console.log(`Cleared ${cleared.deletedCount} existing heatmap doc(s).`);
  }

  let ok = 0;
  let failed = 0;
  let totalDays = 0;

  for (const user of users) {
    try {
      const { inserted } = await ActivityHeatmap.rebuildFromEvents(
        user._id,
        365
      );
      totalDays += inserted;
      ok += 1;
      if (inserted > 0) {
        console.log(`  ✅ ${user.name || user._id}: ${inserted} active days`);
      }
    } catch (err) {
      failed += 1;
      console.error(`  ❌ ${user.name || user._id}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. users=${ok} failed=${failed} totalActiveDays=${totalDays}`
  );
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
