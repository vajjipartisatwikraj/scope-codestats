const mongoose = require("mongoose");

/**
 * ActivityHeatmap — sparse, problem-count based daily activity heatmap.
 *
 * Design (GitHub / LeetCode style):
 *   - One document per (user, calendar day) — sparse. Days with no activity
 *     simply have no document (the frontend renders them as empty cells).
 *   - `count` = number of cohort problems the user solved that day. Only cohort
 *     solves are counted: Practice Arena and external platforms (LeetCode,
 *     CodeChef, ...) do not contribute.
 *   - `sources.cohort` holds the same number. It stays an object so another
 *     source could be added later without changing the document shape.
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
    // Total cohort problems solved on this day (never negative)
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Per-source breakdown (all non-negative)
    sources: {
      cohort: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// One document per user per day (also the primary lookup path)
activityHeatmapSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
// Range scans for the rolling window read
activityHeatmapSchema.index({ userId: 1, date: 1 });

const VALID_SOURCES = ["cohort"];

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
 * Sources other than the valid ones are ignored.
 *
 * @param {ObjectId|string} userId
 * @param {Object} sourceCounts  e.g. { cohort: 1 }
 * @param {Date}  [when]         defaults to now (IST day resolved internally)
 * @returns {Promise<Object|null>} the write result, or null if nothing to add
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
 * Rebuild a user's heatmap from the durable cohort solve events:
 * UserCohort.questionProgress[].solvedAt (the first-solve date of each question).
 * Raw Submission records are not used because they are pruned to the last 5 per
 * question.
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

  const { dateKey: todayKey } = this.getISTDayInfo();
  const windowStart = new Date(`${todayKey}T00:00:00.000Z`);
  windowStart.setUTCDate(windowStart.getUTCDate() - (days - 1));

  // dateKey -> { dateKey, dateUTC, cohort }
  const dayMap = new Map();

  const userCohorts = await UserCohort.find({ user: userId })
    .select("questionProgress.solved questionProgress.solvedAt")
    .lean();
  for (const uc of userCohorts) {
    for (const qp of uc.questionProgress || []) {
      if (!qp.solved || !qp.solvedAt) continue;
      const when = new Date(qp.solvedAt);
      if (isNaN(when.getTime())) continue;
      const { dateKey, dateUTC } = this.getISTDayInfo(when);
      if (dateUTC < windowStart) continue;
      let entry = dayMap.get(dateKey);
      if (!entry) {
        entry = { dateKey, dateUTC, cohort: 0 };
        dayMap.set(dateKey, entry);
      }
      entry.cohort += 1;
    }
  }

  await this.deleteMany({ userId });
  if (dayMap.size === 0) return { inserted: 0 };

  const docs = Array.from(dayMap.values()).map((e) => ({
    userId,
    dateKey: e.dateKey,
    date: e.dateUTC,
    count: e.cohort,
    sources: { cohort: e.cohort },
  }));

  await this.insertMany(docs, { ordered: false });
  return { inserted: docs.length };
};

activityHeatmapSchema.statics.levelForCount = levelForCount;

module.exports = mongoose.model("ActivityHeatmap", activityHeatmapSchema);
