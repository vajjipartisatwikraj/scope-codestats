/**
 * One-time cleanup: strip Practice Arena and external-platform counts from the
 * existing activity heatmap, leaving only cohort solves.
 *
 * For every heatmap day:
 *   - `count` becomes the day's `sources.cohort` (0 if it has none)
 *   - every source other than `cohort` is removed
 * Days left with a count of 0 are deleted.
 *
 * Cohort counts are never reduced. Safe to run more than once.
 *
 * Usage:
 *   node backend/scripts/removeNonCohortHeatmap.js            # report only
 *   node backend/scripts/removeNonCohortHeatmap.js --apply    # make the change
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const ActivityHeatmap = require("../models/ActivityHeatmap");

async function summarize(label) {
  const [row] = await ActivityHeatmap.aggregate([
    {
      $group: {
        _id: null,
        days: { $sum: 1 },
        totalCount: { $sum: "$count" },
        cohort: { $sum: { $ifNull: ["$sources.cohort", 0] } },
      },
    },
  ]);
  const s = row || { days: 0, totalCount: 0, cohort: 0 };
  console.log(`${label}: ${s.days} day record(s), total count ${s.totalCount}, of which cohort ${s.cohort}`);
  return s;
}

async function run() {
  const apply = process.argv.includes("--apply");
  await connectDB();

  await summarize("Before");
  if (!apply) {
    console.log("Report only. Run again with --apply to make the change.");
    return;
  }

  // Pipeline update: runs on the server, one pass.
  // ($set on an embedded document merges into it, so `sources` is dropped first.)
  const updated = await ActivityHeatmap.collection.updateMany({}, [
    { $set: { _cohort: { $ifNull: ["$sources.cohort", 0] } } },
    { $unset: "sources" },
    { $set: { sources: { cohort: "$_cohort" }, count: "$_cohort" } },
    { $unset: "_cohort" },
  ]);
  const removed = await ActivityHeatmap.deleteMany({ count: { $lte: 0 } });

  console.log(`Updated ${updated.modifiedCount} record(s), deleted ${removed.deletedCount} empty day(s).`);
  await summarize("After");
}

run()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
