const mongoose = require("mongoose");

/**
 * Profile: the single source of truth for a user's coding-platform data.
 *
 * One document per (user, platform). It holds the username, the latest stats
 * scraped from the platform, and the bookkeeping for every sync attempt
 * (when it last succeeded, when it last failed and why).
 *
 * Nothing platform related is stored on the User document. User-level totals
 * (total score, total problems) are derived from these documents with
 * `Profile.getSummaries()` / `Profile.totalsLookupStages()`.
 *
 * CASCADE DELETE: User.js deletes `Profile.deleteMany({ userId })` when a user
 * is removed.
 */

// Platforms a student can link a username for.
const EXTERNAL_PLATFORMS = [
  "leetcode",
  "codeforces",
  "codechef",
  "hackerrank",
  "github",
];
// Internal platform computed from cohorts / practice arena. Needs no username.
const INTERNAL_PLATFORMS = ["scopecodestats"];
const PLATFORMS = [...EXTERNAL_PLATFORMS, ...INTERNAL_PLATFORMS];

// Keep in sync with services/platformScraper/errors.js
const ERROR_TYPES = [
  "invalid_username",
  "not_found",
  "rate_limited",
  "timeout",
  "service_unavailable",
  "network",
  "unknown",
];

// Students may refresh a platform once per cooldown window.
const UPDATE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const num = { type: Number, default: 0 };

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: { type: String, required: true, enum: PLATFORMS },
    username: { type: String, required: true, trim: true },

    // ── Stats (overwritten by every successful sync) ──────────────────────
    score: num,
    problemsSolved: num,
    easyProblemsSolved: num,
    mediumProblemsSolved: num,
    hardProblemsSolved: num,
    rating: num,
    maxRating: num,
    rank: { type: String, default: "unrated" },
    globalRank: num,
    countryRank: num,
    instituteRank: num,
    contestsParticipated: num,
    contestRanking: num,
    contestBadge: { type: String, default: "" },
    // HackerRank
    badges: num,
    certificates: num,
    // GitHub
    details: {
      type: {
        _id: false,
        publicRepos: num,
        totalCommits: num,
        followers: num,
        following: num,
        starsReceived: num,
        contributionsLastYear: num,
      },
      default: null,
    },
    // Scope-CodeStats (internal platform). The lifetime values never decrease,
    // so score survives a cohort being deleted.
    totalCohortsCompleted: num,
    totalCohortProblemsSolved: num,
    totalCohortScore: num,
    lifetimeScore: num,
    lifetimeProblems: num,
    totalPracticeArenaContests: num,

    // ── Sync bookkeeping ──────────────────────────────────────────────────
    lastUpdateStatus: {
      type: String,
      enum: ["pending", "updating", "success", "error", "skipped"],
      default: "pending",
    },
    // Last SUCCESSFUL sync. Also the clock for the student update cooldown.
    lastUpdated: { type: Date, default: null },
    // Last sync attempt, successful or not.
    lastUpdateAttempt: { type: Date, default: null },
    // Details of the most recent failure. Cleared by the next success.
    lastUpdateError: { type: String, default: null },
    lastErrorType: { type: String, enum: [...ERROR_TYPES, null], default: null },
    lastErrorAt: { type: Date, default: null },
    consecutiveFailures: num,
    // Total attempts and who triggered the last one.
    updateAttempts: num,
    lastSyncSource: {
      type: String,
      enum: ["user", "cron", "admin", "system", null],
      default: null,
    },
  },
  { timestamps: true }
);

ProfileSchema.index({ userId: 1, platform: 1 }, { unique: true });
// Admin views list the profiles that are currently failing.
ProfileSchema.index({ lastUpdateStatus: 1, platform: 1 });

// Runs on validate (not save) so recording a sync failure with
// `save({ validateBeforeSave: false })` still works for a bad stored username.
ProfileSchema.pre("validate", function (next) {
  if (typeof this.score !== "number" || Number.isNaN(this.score)) this.score = 0;
  if (!this.validateProfileFormat()) {
    return next(new Error("Invalid profile format"));
  }
  next();
});

// Usernames end up in outbound request URLs, so every platform is validated.
const SAFE_USERNAME = /^[A-Za-z0-9._-]{1,64}$/;
const GITHUB_USERNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|_|-(?=[a-zA-Z0-9])){0,38}$/;
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

ProfileSchema.methods.validateProfileFormat = function () {
  switch (this.platform) {
    case "github":
      return GITHUB_USERNAME.test(this.username);
    case "scopecodestats":
      // The internal platform stores the user's email or id.
      return OBJECT_ID.test(this.username) || EMAIL.test(this.username);
    default:
      return SAFE_USERNAME.test(this.username);
  }
};

/** When the student may refresh this platform again (null when allowed now). */
function cooldownEnd(lastUpdated) {
  if (!lastUpdated) return null;
  const end = new Date(new Date(lastUpdated).getTime() + UPDATE_COOLDOWN_MS);
  return end > new Date() ? end : null;
}

ProfileSchema.methods.cooldownEndsAt = function () {
  return cooldownEnd(this.lastUpdated);
};

/**
 * The shape sent to the dashboard / profile pages. Works on documents and on
 * lean objects. Sync status and the last error travel with the stats so the UI
 * can explain why a platform failed to update.
 */
ProfileSchema.statics.toClient = function (p) {
  const out = {
    platform: p.platform,
    username: p.username,
    score: p.score || 0,
    problemsSolved: p.problemsSolved || 0,
    easyProblemsSolved: p.easyProblemsSolved || 0,
    mediumProblemsSolved: p.mediumProblemsSolved || 0,
    hardProblemsSolved: p.hardProblemsSolved || 0,
    rating: p.rating || 0,
    maxRating: p.maxRating || 0,
    rank: p.rank || "unrated",
    globalRank: p.globalRank || 0,
    countryRank: p.countryRank || 0,
    instituteRank: p.instituteRank || 0,
    contestsParticipated: p.contestsParticipated || 0,
    contestRanking: p.contestRanking || 0,
    contestBadge: p.contestBadge || "",
    badges: p.badges || 0,
    certificates: p.certificates || 0,
    lastUpdated: p.lastUpdated || null,
    lastUpdateAttempt: p.lastUpdateAttempt || null,
    lastUpdateStatus: p.lastUpdateStatus || "pending",
    lastUpdateError: p.lastUpdateError || null,
    lastErrorType: p.lastErrorType || null,
    lastErrorAt: p.lastErrorAt || null,
    cooldownEndsAt: cooldownEnd(p.lastUpdated),
  };
  if (p.platform === "github") {
    // Flattened so every platform reads the same way on the client.
    const gh = p.details?.toObject ? p.details.toObject() : p.details || {};
    Object.assign(out, {
      publicRepos: gh.publicRepos || 0,
      totalCommits: gh.totalCommits || 0,
      followers: gh.followers || 0,
      following: gh.following || 0,
      starsReceived: gh.starsReceived || 0,
      contributionsLastYear: gh.contributionsLastYear || 0,
    });
  }
  if (p.platform === "scopecodestats") {
    Object.assign(out, {
      totalCohortsCompleted: p.totalCohortsCompleted || 0,
      totalCohortProblemsSolved: p.totalCohortProblemsSolved || 0,
      totalCohortScore: p.totalCohortScore || 0,
      lifetimeScore: p.lifetimeScore || 0,
      totalPracticeArenaContests: p.totalPracticeArenaContests || 0,
    });
  }
  return out;
};

// ── Aggregation helpers ──────────────────────────────────────────────────────

/**
 * Per-user view of all profiles, used by the leaderboard, public profile and
 * the nightly jobs.
 *
 * @param {Array<ObjectId|string>} [userIds] limit to these users; omit for all
 * @param {{full?: boolean, fields?: string}} [options] `full` returns every profile field;
 *   `fields` is a space separated list of the only fields to load (it must include
 *   `userId`, `platform`, `score` and `problemsSolved`, which the totals use)
 * @returns {Promise<Map<string, {totalScore, totalProblemsSolved, platforms}>>}
 */
ProfileSchema.statics.getSummaries = async function (userIds, { full = false, fields } = {}) {
  const query = userIds ? { userId: { $in: userIds } } : {};
  let find = this.find(query);
  if (fields) {
    find = find.select(fields);
  } else if (!full) {
    find = find.select(
      "userId platform username score problemsSolved rating maxRating rank contestsParticipated easyProblemsSolved mediumProblemsSolved hardProblemsSolved details lastUpdated lastUpdateStatus"
    );
  }
  const profiles = await find.lean();

  const summaries = new Map();
  for (const profile of profiles) {
    const key = String(profile.userId);
    let summary = summaries.get(key);
    if (!summary) {
      summary = { totalScore: 0, totalProblemsSolved: 0, platforms: {} };
      summaries.set(key, summary);
    }
    summary.platforms[profile.platform] = profile;
    summary.totalScore += profile.score || 0;
    summary.totalProblemsSolved += profile.problemsSolved || 0;
  }
  return summaries;
};

/** Summary for a user with no profiles. */
ProfileSchema.statics.emptySummary = () => ({
  totalScore: 0,
  totalProblemsSolved: 0,
  platforms: {},
});

/**
 * Aggregation stages that add `totalScore` and `totalProblemsSolved` to every
 * User document in a pipeline. Append them to a `User.aggregate([...])` after
 * the `$match`, then `$sort` / `$group` on the new fields.
 */
ProfileSchema.statics.totalsLookupStages = function () {
  return [
    {
      $lookup: {
        from: this.collection.name,
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          {
            $group: {
              _id: null,
              totalScore: { $sum: "$score" },
              totalProblemsSolved: { $sum: "$problemsSolved" },
            },
          },
        ],
        as: "_profileTotals",
      },
    },
    {
      $addFields: {
        totalScore: { $ifNull: [{ $arrayElemAt: ["$_profileTotals.totalScore", 0] }, 0] },
        totalProblemsSolved: {
          $ifNull: [{ $arrayElemAt: ["$_profileTotals.totalProblemsSolved", 0] }, 0],
        },
      },
    },
    { $project: { _profileTotals: 0 } },
  ];
};

ProfileSchema.statics.PLATFORMS = PLATFORMS;
ProfileSchema.statics.EXTERNAL_PLATFORMS = EXTERNAL_PLATFORMS;
ProfileSchema.statics.UPDATE_COOLDOWN_MS = UPDATE_COOLDOWN_MS;

module.exports = mongoose.model("Profile", ProfileSchema);
