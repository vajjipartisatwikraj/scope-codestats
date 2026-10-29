/**
 * One-off migration to the 7-day consistency index and score change.
 *
 *   node scripts/migrateWeeklyActivity.js
 *
 * What it does (safe to run again):
 *   1. removes the old stored values: User.consistencyIndex, User.sevenDayScore and
 *      the Profile.consistencyIndex / consistencyScore of the Scope-CodeStats platform
 *   2. sets every Scope-CodeStats score to its cohort score. The old score added
 *      consistencyIndex * 10; the index is now worked out from how the score changes, so it
 *      can no longer be part of the score (the next profile sync would do the same)
 *   3. works out the last 7 days of every active student from the score history and saves
 *      it on User.weeklyActivity (what the ranking run does after each sync)
 *
 * Uses MONGODB_URI from backend/.env (or the environment).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
for (const file of fs.readdirSync(path.join(__dirname, "../models"))) {
  if (file.endsWith(".js")) require(`../models/${file}`);
}
const Profile = require("../models/Profile");
const { HISTORY_TIMEZONE } = require("../config/platformProgress");
const { dayKeyOf } = require("../utils/dayKeys");
const { activeStudentFilter } = require("../services/rankings/scoreHistoryService");
const { updateWeeklyActivity } = require("../services/weeklyActivity/weeklyActivityService");

async function main() {
  await connectDB();
  console.log(`Database: ${mongoose.connection.name} on ${mongoose.connection.host}`);

  const oldUserValues = await User.collection.updateMany(
    { $or: [{ consistencyIndex: { $exists: true } }, { sevenDayScore: { $exists: true } }] },
    { $unset: { consistencyIndex: "", sevenDayScore: "" } }
  );

  const oldProfileValues = await Profile.collection.updateMany(
    { $or: [{ consistencyIndex: { $exists: true } }, { consistencyScore: { $exists: true } }] },
    { $unset: { consistencyIndex: "", consistencyScore: "" } }
  );

  const scores = await Profile.collection.updateMany(
    { platform: "scopecodestats", $expr: { $ne: ["$score", { $round: [{ $ifNull: ["$totalCohortScore", 0] }, 0] }] } },
    [{ $set: { score: { $round: [{ $ifNull: ["$totalCohortScore", 0] }, 0] } } }]
  );

  const ids = (await User.find(await activeStudentFilter()).select("_id").lean()).map((u) => u._id);
  const updated = await updateWeeklyActivity(ids, dayKeyOf(new Date(), HISTORY_TIMEZONE));

  console.log({
    usersWithOldValues: oldUserValues.modifiedCount,
    profilesWithOldValues: oldProfileValues.modifiedCount,
    codestatsScoresChanged: scores.modifiedCount,
    studentsUpdated: updated,
  });
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
