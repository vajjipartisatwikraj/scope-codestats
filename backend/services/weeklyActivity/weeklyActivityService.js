/**
 * The consistency index and the score change of the last 7 days.
 *
 * Both come from one thing: how the student's TOTAL score changed over the last 7 days
 * (today and the six days before it, IST), read from the score history
 * (models/ScoreHistory.js, written after every profile sync).
 *
 *   active day    a day on which the total score differs from the previous reading
 *                 (any change counts, up or down)
 *   score change  total score now minus the total score 7 days ago
 *   consistency   from the number of active days:
 *                   6 or 7 days -> 5      5 days -> 4      4 days -> 3
 *                   3 days      -> 2      2 days -> 1      0 or 1 day -> 0
 *
 * A student's first ever reading is a starting point, not a change, so it is not an active
 * day. The result is saved on User.weeklyActivity by `updateWeeklyActivity`, which the
 * ranking run calls after each sync, so the leaderboard and profiles only read it.
 */
const mongoose = require("mongoose");
const ScoreHistory = require("../../models/ScoreHistory");
const User = require("../../models/User");
const { addDays } = require("../../utils/dayKeys");

const WINDOW_DAYS = 7;
const CHUNK = 500; // students per database query

// Same index as the score history's unique index; the queries below are hinted to it.
const SCORE_INDEX = { userId: 1, dateKey: -1 };

const round2 = (value) => Math.round(value * 100) / 100;

/** Consistency index (0-5) for a number of active days (0-7). */
function consistencyIndexFor(activeDays) {
  if (activeDays >= 6) return 5;
  if (activeDays === 5) return 4;
  if (activeDays === 4) return 3;
  if (activeDays === 3) return 2;
  if (activeDays === 2) return 1;
  return 0;
}

/**
 * The first day of the window that ends on `endKey` (7 days including it).
 * @param {string} endKey "YYYY-MM-DD"
 */
const windowStart = (endKey) => addDays(endKey, -(WINDOW_DAYS - 1));

/**
 * The 7-day activity of one student. Pure.
 *
 * @param {object} args
 * @param {number|null} args.before total score of the latest reading before the window
 *   (null if there is none)
 * @param {Array<{dateKey: string, totalScore: number}>} args.readings the readings inside
 *   the window, oldest first (one per day at most)
 * @returns {{activeDays: number, consistencyIndex: number, scoreChange: number}}
 */
function weeklyActivityOf({ before, readings }) {
  let previous = before === undefined ? null : before;
  const activeDays = new Set();
  let change = 0;
  for (const { dateKey, totalScore } of readings) {
    const total = totalScore || 0;
    if (previous !== null && total !== previous) {
      activeDays.add(dateKey);
      change += total - previous;
    }
    previous = total;
  }
  return {
    activeDays: activeDays.size,
    consistencyIndex: consistencyIndexFor(activeDays.size),
    scoreChange: round2(change),
  };
}

/**
 * Reads the history of some students and works out their 7-day activity.
 * @param {Array<ObjectId|string>} userIds
 * @param {string} endKey the last day of the window (today, IST)
 * @returns {Promise<Map<string, {activeDays, consistencyIndex, scoreChange}>>} one entry per
 *   student, also for students without any history (zeros)
 */
async function calculateWeeklyActivity(userIds, endKey) {
  const startKey = windowStart(endKey);
  const result = new Map();

  for (let i = 0; i < userIds.length; i += CHUNK) {
    const ids = userIds.slice(i, i + CHUNK).map((id) => new mongoose.Types.ObjectId(String(id)));

    const [readings, before] = await Promise.all([
      ScoreHistory.find({ userId: { $in: ids }, dateKey: { $gte: startKey, $lte: endKey } })
        .hint(SCORE_INDEX)
        .select("userId dateKey totalScore")
        .sort({ userId: 1, dateKey: 1 })
        .lean(),
      // The latest reading before the window, per student: an index walk taking one
      // document for each.
      ScoreHistory.aggregate(
        [
          { $match: { userId: { $in: ids }, dateKey: { $lt: startKey } } },
          { $sort: { userId: 1, dateKey: -1 } },
          { $group: { _id: "$userId", totalScore: { $first: "$totalScore" } } },
        ],
        { hint: SCORE_INDEX }
      ),
    ]);

    const beforeBy = new Map(before.map((row) => [String(row._id), row.totalScore || 0]));
    const readingsBy = new Map();
    for (const reading of readings) {
      const key = String(reading.userId);
      if (!readingsBy.has(key)) readingsBy.set(key, []);
      readingsBy.get(key).push(reading);
    }

    for (const id of ids) {
      const key = String(id);
      result.set(
        key,
        weeklyActivityOf({ before: beforeBy.has(key) ? beforeBy.get(key) : null, readings: readingsBy.get(key) || [] })
      );
    }
  }
  return result;
}

/**
 * Works out the 7-day activity of these students and saves it on their User documents.
 * Written through the driver (one bulk write per batch), not Mongoose, which would cast
 * every operation one by one.
 * @returns {Promise<number>} how many students were updated
 */
async function updateWeeklyActivity(userIds, endKey, now = new Date()) {
  const activity = await calculateWeeklyActivity(userIds, endKey);
  const operations = [...activity].map(([id, value]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: { $set: { weeklyActivity: { ...value, calculatedAt: now } } },
    },
  }));
  for (let i = 0; i < operations.length; i += 1000) {
    await User.collection.bulkWrite(operations.slice(i, i + 1000), { ordered: false });
  }
  return operations.length;
}

module.exports = {
  WINDOW_DAYS,
  consistencyIndexFor,
  weeklyActivityOf,
  calculateWeeklyActivity,
  updateWeeklyActivity,
};
