const mongoose = require("mongoose");

/**
 * ScoreHistory — a student's scores and ranks, recorded after every profile sync.
 *
 * One document per (student, IST day), and SPARSE like PlatformSnapshot: a document is
 * written only when a score or a rank changed since the student's latest document. A day
 * without a document means "same as the latest earlier document"; readers carry values
 * forward (services/rankings/scoreSeriesBuilder.js).
 *
 *   scores.<platform>      that platform's score. Present only for platforms the student has
 *                          linked (0 is a real score; absent means not linked)
 *   totalScore             the sum of the platform scores
 *   ranks.overall          { rank, of } among all active students, by total score
 *   ranks.department       { rank, of } among the students of the same department
 *   ranks.platforms.<p>    { rank, of } among the students who have a score on that platform
 *
 * Ties share the best rank (two students tied for 2nd are both 2nd; the next is 4th).
 * `of` is the number of students that were ranked in that group on that night.
 *
 * A platform's scores and ranks belong to one account: when the student changes or removes
 * that platform's username they are deleted (scoreHistoryService.clearPlatformScoreHistory).
 * The total score and the overall and department ranks stay, they were true at the time.
 *
 * ⚠️ CASCADE DELETE: references User via `userId`; deleted with the user in the User
 *    cascade middleware.
 */
const rankSchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true, min: 1 },
    of: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const platformFields = (type) =>
  Object.fromEntries(require("../config/rankings").SCORE_PLATFORMS.map((platform) => [platform, type]));

const scoreHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    // The department the department rank was computed in
    department: { type: String, default: "" },
    totalScore: { type: Number, required: true, min: 0 },
    scores: platformFields({ type: Number, min: 0 }),
    ranks: {
      overall: { type: rankSchema, default: undefined },
      department: { type: rankSchema, default: undefined },
      platforms: platformFields({ type: rankSchema, default: undefined }),
    },
  },
  { timestamps: true }
);

// One document per student per day. Descending on the date so "the latest document of each
// student" and "the latest before a day" are index walks.
scoreHistorySchema.index({ userId: 1, dateKey: -1 }, { unique: true });

module.exports = mongoose.model("ScoreHistory", scoreHistorySchema);
