const mongoose = require("mongoose");
const { ACTIVITY_PLATFORMS } = require("../config/platformActivity");

/**
 * PlatformDailyActivity: what a student did on an external platform, one document per
 * (user, platform, day), kept only for the days that had activity.
 *
 * It is a stored copy of what the platform itself says (LeetCode's submission calendar, Codeforces
 * submission times, CodeChef's and HackerRank's activity graphs, GitHub's contribution graph), read
 * during the nightly profile sync. Only a number per day is stored, never the submissions. Every
 * refresh replaces the whole stored window of that platform (services/platformActivity), so a
 * repeated sync cannot double count.
 *
 * `usernameKey` ties the days to the account they were read from. Changing the username to a
 * different account or removing it deletes them.
 *
 * ⚠️ CASCADE DELETE: references User via `userId`; deleted with the user in the User cascade
 *    middleware and when an account is suspended.
 */
const platformDailyActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    platform: { type: String, required: true, enum: Object.keys(ACTIVITY_PLATFORMS) },
    // 'YYYY-MM-DD'
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    usernameKey: { type: String, required: true },
    count: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

// One document per day; also the path for replacing a window of one platform.
platformDailyActivitySchema.index({ userId: 1, platform: 1, dateKey: 1 }, { unique: true });
// Reading the heatmap: every platform of a user in a range.
platformDailyActivitySchema.index({ userId: 1, dateKey: 1 });

module.exports = mongoose.model("PlatformDailyActivity", platformDailyActivitySchema);
