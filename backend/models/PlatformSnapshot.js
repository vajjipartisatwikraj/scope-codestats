const mongoose = require("mongoose");
const { HISTORY_PLATFORMS } = require("../config/platformProgress");

/**
 * PlatformSnapshot — the stored history of a student's coding platform stats.
 *
 * One document per (user, platform, day), and SPARSE: a document exists only on a day when
 * the stats changed (or for the first reading). A day without a document means "same as the
 * latest earlier document", so readers must carry values forward
 * (services/platformProgress/seriesBuilder.js). The values are running totals as of the
 * last sync of that day, not amounts gained that day; gains are worked out when reading.
 *
 * The day is the IST calendar day of the sync (`dateKey`, "YYYY-MM-DD"), like the heatmap.
 *
 * `usernameKey` (the lower-cased username) ties a snapshot to the account it was read
 * from. History belongs to one account: when the username changes or is removed, all of
 * its snapshots are deleted (snapshotService.clearHistory), and readers also ignore
 * snapshots whose key differs from the profile's current username.
 *
 * Not stored here: GitHub (fetched from GitHub's own timeline on demand) and the internal
 * Scope-CodeStats platform.
 *
 * ⚠️ CASCADE DELETE: references User via `userId`; deleted with the user in the User
 *    cascade middleware.
 */
const platformSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: Object.keys(HISTORY_PLATFORMS),
    },
    // 'YYYY-MM-DD' in IST
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    username: { type: String, required: true, trim: true },
    usernameKey: { type: String, required: true },

    // Running totals as of this day's last sync
    problemsSolved: { type: Number, default: 0, min: 0 },
    easyProblemsSolved: { type: Number, default: 0, min: 0 },
    mediumProblemsSolved: { type: Number, default: 0, min: 0 },
    hardProblemsSolved: { type: Number, default: 0, min: 0 },
    // Contest rating; 0 means unrated
    rating: { type: Number, default: 0, min: 0 },
    contestsParticipated: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// The only lookup path: one document per day, and range scans / "latest before" reads in
// either direction for one user and platform.
platformSnapshotSchema.index({ userId: 1, platform: 1, dateKey: 1 }, { unique: true });

platformSnapshotSchema.statics.METRICS = [
  "problemsSolved",
  "easyProblemsSolved",
  "mediumProblemsSolved",
  "hardProblemsSolved",
  "rating",
  "contestsParticipated",
];

module.exports = mongoose.model("PlatformSnapshot", platformSnapshotSchema);
