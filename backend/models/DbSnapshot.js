const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * How big one collection was on one day. The snapshot job rewrites today's row every hour, so a
 * day keeps its last reading; the history is one row per collection per day, forever (a few
 * thousand rows a year).
 *
 * The row named TOTAL_KEY holds the whole database: its records, sizes and the disk it lives on.
 * Sizes are in bytes.
 *
 *   count         records (documents)
 *   dataSize      the data as BSON, before compression
 *   storageSize   what the data takes on disk, after compression
 *   indexSize     all indexes of the collection
 *   freeSize      space inside the files that deleted data left, reusable by this collection
 *   fsUsedSize, fsTotalSize   the disk of the database server (the total row only)
 */
const TOTAL_KEY = "(database)";

const dbSnapshotSchema = new Schema(
  {
    day: { type: String, required: true }, // "YYYY-MM-DD" in IST
    collectionName: { type: String, required: true },
    // The Mongoose model that owns the collection, when there is one
    model: { type: String, default: "" },

    count: { type: Number, default: 0 },
    dataSize: { type: Number, default: 0 },
    storageSize: { type: Number, default: 0 },
    indexSize: { type: Number, default: 0 },
    freeSize: { type: Number, default: 0 },
    fsUsedSize: { type: Number, default: null },
    fsTotalSize: { type: Number, default: null },

    takenAt: { type: Date, required: true },
  },
  { versionKey: false }
);

dbSnapshotSchema.index({ day: 1, collectionName: 1 }, { unique: true });
dbSnapshotSchema.index({ collectionName: 1, day: 1 });

const DbSnapshot = mongoose.model("DbSnapshot", dbSnapshotSchema);
DbSnapshot.TOTAL_KEY = TOTAL_KEY;

module.exports = DbSnapshot;
