/**
 * PRODUCTION-SAFE cleanup of the DEPRECATED heatmap collection.
 *
 * This script removes ONLY the old `dailyactivityheatmaps` collection (the
 * deprecated DailyActivityHeatmap model). It never touches any other
 * collection. The new sparse `activityheatmaps` collection is left untouched
 * and is only reported on.
 *
 * Safety measures:
 *   - Hard-coded target collection name (cannot be redirected).
 *   - Requires the explicit `--confirm` flag to perform the drop.
 *   - Dry-run by default: prints what WOULD happen.
 *
 * Usage:
 *   node backend/scripts/cleanupOldHeatmap.js            # dry run (no changes)
 *   node backend/scripts/cleanupOldHeatmap.js --confirm  # perform the drop
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");

// The ONLY collection this script is ever allowed to remove.
const DEPRECATED_COLLECTION = "dailyactivityheatmaps";
// The active collection — reported on only, never modified here.
const ACTIVE_COLLECTION = "activityheatmaps";

async function run() {
  const confirmed = process.argv.includes("--confirm");

  await connectDB();
  const db = mongoose.connection.db;
  const dbName = mongoose.connection.name;

  console.log(`\nConnected to database: "${dbName}"`);
  console.log(
    confirmed
      ? "Mode: LIVE (will drop the deprecated collection)"
      : "Mode: DRY RUN (no changes will be made)\n"
  );

  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  // Report the active collection (never modified)
  if (names.includes(ACTIVE_COLLECTION)) {
    const activeCount = await db
      .collection(ACTIVE_COLLECTION)
      .countDocuments();
    console.log(`✓ Active "${ACTIVE_COLLECTION}": ${activeCount} document(s) — left untouched.`);
  } else {
    console.log(`✓ Active "${ACTIVE_COLLECTION}": not created yet — will be created automatically on first write.`);
  }

  // Handle the deprecated collection
  if (!names.includes(DEPRECATED_COLLECTION)) {
    console.log(`✓ Deprecated "${DEPRECATED_COLLECTION}": does not exist — nothing to remove.`);
    await mongoose.connection.close();
    process.exit(0);
  }

  const oldCount = await db.collection(DEPRECATED_COLLECTION).countDocuments();
  console.log(`• Deprecated "${DEPRECATED_COLLECTION}": ${oldCount} document(s).`);

  if (!confirmed) {
    console.log(
      `\nDRY RUN: would DROP collection "${DEPRECATED_COLLECTION}" (${oldCount} docs).`
    );
    console.log("Re-run with --confirm to perform the drop.\n");
    await mongoose.connection.close();
    process.exit(0);
  }

  console.log(`\nDropping "${DEPRECATED_COLLECTION}"...`);
  await db.dropCollection(DEPRECATED_COLLECTION);
  console.log(`✅ Dropped "${DEPRECATED_COLLECTION}" (${oldCount} docs removed).`);
  console.log("No other collections were touched.\n");

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
