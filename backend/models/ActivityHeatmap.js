const mongoose = require("mongoose");

/**
 * ActivityHeatmap — sparse, problem-count based daily activity heatmap.
 *
 * Design (GitHub / LeetCode style):
 *   - One document per (user, calendar day) — sparse. Days with no activity
 *     simply have no document (the frontend renders them as empty cells).
 *   - `count` = number of problems the user solved that day.
 *   - `sources` breaks the count down by origin, for debugging / analytics:
 *       cohort     → in-app cohort problem newly solved
 *       practice   → in-app practice-arena problem newly solved
 *       leetcode / codechef / codeforces / hackerrank / github → external
 *         platform gains detected by the daily profile-sync cron.
 *
 * The day is anchored to the IST calendar (Asia/Kolkata) so it lines up with
 * the platform's midnight cron. `dateKey` is the canonical "YYYY-MM-DD" IST
 * label; `date` is that label at UTC-midnight, used only for range sorting.
 *
 * ⚠️ CASCADE DELETE: references User via `userId`. Deleted with the user via
 *    ActivityHeatmap.deleteMany({ userId }) in the User cascade middleware.
 */
const activityHeatmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // 'YYYY-MM-DD' in IST — canonical day identifier
    dateKey: {
      type: String,
      required: true,
    },
    // dateKey at UTC-midnight — used for efficient range queries / sorting
    date: {
      type: Date,
      required: true,
    },
    // Total problems solved on this day (never negative)
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Per-source breakdown (all non-negative)
    sources: {
      cohort: { type: Number, default: 0 },
      practice: { type: Number, default: 0 },
      leetcode: { type: Number, default: 0 },
      codechef: { type: Number, default: 0 },
      codeforces: { type: Number, default: 0 },
      hackerrank: { type: Number, default: 0 },
      github: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// One document per user per day (also the primary lookup path)
activityHeatmapSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
// Range scans for the rolling window read
activityHeatmapSchema.index({ userId: 1, date: 1 });

const EXTERNAL_SOURCES = [
  "leetcode",
  "codechef",
  "codeforces",
  "hackerrank",
  "github",
];
const VALID_SOURCES = ["cohort", "practice", ...EXTERNAL_SOURCES];

/**
 * Map a raw problem count to a 0-4 intensity bucket (GitHub-style).
 */
function levelForCount(count) {
  if (!count || count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

/**
 * Resolve the IST calendar day for a given instant.
 * @returns {{ dateKey: string, dateUTC: Date }}
 */
activityHeatmapSchema.statics.getISTDayInfo = function (when = new Date()) {
  // en-CA formats as YYYY-MM-DD; timeZone forces the IST calendar day.
  const dateKey = when.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const dateUTC = new Date(`${dateKey}T00:00:00.000Z`);
  return { dateKey, dateUTC };
};

/**
 * Atomically add solved-problem counts for a user on a given day.
 * Negative or zero contributions are ignored (caller must clamp deltas).
 *
 * @param {ObjectId|string} userId
 * @param {Object} sourceCounts  e.g. { cohort: 1 } or { leetcode: 3, github: 2 }
 * @param {Date}  [when]         defaults to now (IST day resolved internally)
 * @returns {Promise<Object|null>} the bulk write result, or null if nothing to add
 */
activityHeatmapSchema.statics.recordActivity = async function (
  userId,
  sourceCounts,
  when = new Date()
) {
  const inc = {};
  let total = 0;

  for (const [source, rawValue] of Object.entries(sourceCounts || {})) {
    if (!VALID_SOURCES.includes(source)) continue;
    const value = Math.floor(Number(rawValue) || 0);
    if (value > 0) {
      inc[`sources.${source}`] = value;
      total += value;
    }
  }

  if (total <= 0) return null;
  inc.count = total;

  const { dateKey, dateUTC } = this.getISTDayInfo(when);

  return this.updateOne(
    { userId, dateKey },
    {
      $inc: inc,
      $setOnInsert: { userId, dateKey, date: dateUTC },
    },
    { upsert: true }
  );
};

/**
 * Convenience wrapper: add `amount` problems from a single source.
 */
activityHeatmapSchema.statics.incrementActivity = function (
  userId,
  source,
  amount = 1,
  when = new Date()
) {
  return this.recordActivity(userId, { [source]: amount }, when);
};

/**
 * Compute safe per-platform external deltas between two profile snapshots.
 *
 * Only counts POSITIVE growth, and ONLY when the platform username is
 * unchanged. This defeats the "fake profile → real profile" swap problem:
 *   - a lower new count (fake had more) yields a negative delta → clamped to 0
 *   - a username change resets the baseline → delta skipped entirely
 *     (so a bigger real profile does NOT register as a one-day spike)
 *   - the first ever snapshot (no previous username) establishes the baseline
 *     and contributes nothing
 *
 * @param {Object} prev  map of platform → { count, username }
 * @param {Object} next  map of platform → { count, username }
 * @returns {Object} sourceCounts suitable for recordActivity (positive only)
 */
activityHeatmapSchema.statics.computeExternalDeltas = function (prev, next) {
  const deltas = {};
  for (const platform of EXTERNAL_SOURCES) {
    const before = prev?.[platform];
    const after = next?.[platform];
    if (!after) continue;

    // No prior baseline, or username changed → don't count (baseline reset).
    if (!before || before.username == null) continue;
    if (before.username !== after.username) continue;

    const delta = (after.count || 0) - (before.count || 0);
    if (delta > 0) deltas[platform] = delta;
  }
  return deltas;
};

/**
 * Read a rolling window of daily activity for the heatmap UI.
 * @param {ObjectId|string} userId
 * @param {number} [days=365]
 */
activityHeatmapSchema.statics.getHeatmap = async function (
  userId,
  days = 365
) {
  const { dateKey: todayKey } = this.getISTDayInfo();
  const start = new Date(`${todayKey}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const docs = await this.find({ userId, date: { $gte: start } })
    .select("dateKey count sources")
    .sort({ date: 1 })
    .lean();

  let totalCount = 0;
  let activeDays = 0;

  const dailyActivity = docs.map((doc) => {
    const count = doc.count || 0;
    if (count > 0) {
      activeDays += 1;
      totalCount += count;
    }
    return {
      date: doc.dateKey,
      count,
      level: levelForCount(count),
      sources: doc.sources || {},
    };
  });

  return { dailyActivity, activeDays, totalCount, days };
};

/**
 * Rebuild a user's heatmap ACCURATELY from durable in-app solve events.
 *
 * Sources (both persist real per-problem solve timestamps, unlike raw
 * Submission records which are pruned to the last 5 per question):
 *   - Cohort:   UserCohort.questionProgress[].solvedAt  (first-solve date)
 *   - Practice: PASubmission accepted programming submissions (submittedAt)
 *
 * External-platform history is intentionally NOT reconstructed here — only
 * daily snapshots ever existed for those, which is exactly what produced the
 * inflated/incorrect old heatmaps. External activity accrues going forward via
 * the live profile-sync delta trigger.
 *
 * This REPLACES all existing heatmap docs for the user (full fresh rebuild).
 *
 * @param {ObjectId|string} userId
 * @param {number} [days=365]
 */
activityHeatmapSchema.statics.rebuildFromEvents = async function (
  userId,
  days = 365
) {
  const UserCohort = require("./UserCohort");
  const PASubmission = require("./PASubmission");

  const { dateKey: todayKey } = this.getISTDayInfo();
  const windowStart = new Date(`${todayKey}T00:00:00.000Z`);
  windowStart.setUTCDate(windowStart.getUTCDate() - (days - 1));

  // dateKey -> { dateKey, dateUTC, cohort, practice }
  const dayMap = new Map();
  const bump = (when, source) => {
    if (!when) return;
    const d = new Date(when);
    if (isNaN(d.getTime())) return;
    const { dateKey, dateUTC } = this.getISTDayInfo(d);
    if (dateUTC < windowStart) return;
    let entry = dayMap.get(dateKey);
    if (!entry) {
      entry = { dateKey, dateUTC, cohort: 0, practice: 0 };
      dayMap.set(dateKey, entry);
    }
    entry[source] += 1;
  };

  // Cohort solves — one count per solved question (matches the live trigger).
  const userCohorts = await UserCohort.find({ user: userId })
    .select("questionProgress.solved questionProgress.solvedAt")
    .lean();
  for (const uc of userCohorts) {
    for (const qp of uc.questionProgress || []) {
      if (qp.solved && qp.solvedAt) bump(qp.solvedAt, "cohort");
    }
  }

  // Practice Arena solves — accepted programming submissions.
  const paSubs = await PASubmission.find({
    user: userId,
    isCorrect: true,
    submissionType: "programming",
  })
    .select("submittedAt createdAt")
    .lean();
  for (const s of paSubs) {
    bump(s.submittedAt || s.createdAt, "practice");
  }

  await this.deleteMany({ userId });
  if (dayMap.size === 0) return { inserted: 0 };

  const docs = Array.from(dayMap.values()).map((e) => ({
    userId,
    dateKey: e.dateKey,
    date: e.dateUTC,
    count: e.cohort + e.practice,
    sources: { cohort: e.cohort, practice: e.practice },
  }));

  await this.insertMany(docs, { ordered: false });
  return { inserted: docs.length };
};

activityHeatmapSchema.statics.EXTERNAL_SOURCES = EXTERNAL_SOURCES;
activityHeatmapSchema.statics.levelForCount = levelForCount;

module.exports = mongoose.model("ActivityHeatmap", activityHeatmapSchema);
