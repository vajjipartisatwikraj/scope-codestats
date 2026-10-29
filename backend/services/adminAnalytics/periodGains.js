/**
 * Changes of each student's numbers over a period, worked out from the stored history.
 *
 * Both histories are sparse (a document exists only on a day when something changed), so a
 * change is measured like this for each number of each student:
 *
 *   - the starting value is the latest reading BEFORE the period (carried forward), or, for
 *     a number first recorded inside the period, its first reading (so a newly tracked
 *     number starts at its first value, not at a made-up zero);
 *   - every later reading adds its difference to the previous one, dated that day.
 *
 * The result per number is the total change and the dated differences, which the trend chart
 * adds up over students. A rating of 0 means unrated: unrated readings are skipped, so
 * getting a first rating is not a "gain".
 *
 * Documents are read as a stream in index order, so memory stays small however many exist.
 */
const PlatformSnapshot = require("../../models/PlatformSnapshot");
const ScoreHistory = require("../../models/ScoreHistory");
const { GAIN_STATS } = require("../../config/adminAnalytics");
const { SCORE_PLATFORMS } = require("../../config/rankings");

const round2 = (value) => Math.round(value * 100) / 100;

// The unique indexes of the two collections. The queries below are hinted to them: the
// planner would otherwise scan the whole collection and sort in memory when a period covers
// most of the history, and the streams rely on the index order.
const SNAPSHOT_INDEX = { userId: 1, platform: 1, dateKey: 1 };
const SCORE_INDEX = { userId: 1, dateKey: -1 };

/**
 * Change of one number.
 * @param {Array<{dateKey: string, value: number}>} points oldest first: at most one reading
 *   from before the period (first), then the readings inside it
 * @param {{skipZero?: boolean}} [options] ignore readings of 0 (unrated)
 * @returns {{gain: number, deltas: Array<{dateKey: string, delta: number}>}|null} null when
 *   there is no usable reading at all
 */
function changeOf(points, { skipZero = false } = {}) {
  let previous = null;
  const deltas = [];
  for (const { dateKey, value } of points) {
    if (skipZero && !value) continue;
    if (previous === null) {
      previous = value; // the starting value
      continue;
    }
    if (value !== previous) {
      deltas.push({ dateKey, delta: round2(value - previous) });
      previous = value;
    }
  }
  if (previous === null) return null;
  return { gain: round2(deltas.reduce((sum, d) => sum + d.delta, 0)), deltas };
}

/** The Profile-independent snapshot fields behind each kind of change. */
const SNAPSHOT_FIELDS = { problems: "problemsSolved", contests: "contestsParticipated", rating: "rating" };

const entryFor = (map, userId) => {
  let entry = map.get(userId);
  if (!entry) {
    entry = {};
    map.set(userId, entry);
  }
  return entry;
};

/**
 * Problems, contests and rating changes from the platform snapshots.
 * `usernameKeys`: "userId:platform" -> the profile's current lower-cased username. A
 * reading taken from another account (left over from a username change) is ignored.
 */
async function addPlatformChanges({ startKey, endKey, usernameKeys }, into) {
  // The latest reading before the period of every student, one pass per platform: an index
  // walk over (userId, platform, dateKey) taking one document per student.
  const carry = new Map(); // "userId:platform" -> reading
  for (const platform of GAIN_STATS.problems) {
    const rows = await PlatformSnapshot.aggregate(
      [
        { $match: { platform, dateKey: { $lt: startKey } } },
        // Newest first within each user and platform: the exact reverse of the index, so no sort.
        { $sort: { userId: -1, platform: -1, dateKey: -1 } },
        {
          $group: {
            _id: "$userId",
            dateKey: { $first: "$dateKey" },
            usernameKey: { $first: "$usernameKey" },
            problemsSolved: { $first: "$problemsSolved" },
            contestsParticipated: { $first: "$contestsParticipated" },
            rating: { $first: "$rating" },
          },
        },
      ],
      { allowDiskUse: true, hint: SNAPSHOT_INDEX }
    );
    for (const row of rows) carry.set(`${row._id}:${platform}`, row);
  }

  const belongs = (key, usernameKey) => {
    const current = usernameKeys.get(key);
    return current === undefined || current === usernameKey;
  };

  const finish = (key, carried, docs) => {
    const [userId, platform] = key.split(":");
    const entry = entryFor(into, userId);
    for (const [kind, field] of Object.entries(SNAPSHOT_FIELDS)) {
      if (!GAIN_STATS[kind].includes(platform)) continue;
      const points = [];
      if (carried) points.push({ dateKey: carried.dateKey, value: carried[field] || 0 });
      for (const doc of docs) points.push({ dateKey: doc.dateKey, value: doc[field] || 0 });
      const change = changeOf(points, { skipZero: kind === "rating" });
      if (change) entry[`${kind}.${platform}`] = change;
    }
  };

  const done = new Set();
  const cursor = PlatformSnapshot.find({ dateKey: { $gte: startKey, $lte: endKey } })
    .sort({ userId: 1, platform: 1, dateKey: 1 })
    .hint(SNAPSHOT_INDEX)
    .select("userId platform dateKey usernameKey problemsSolved contestsParticipated rating")
    .lean()
    .cursor();

  let currentKey = null;
  let docs = [];
  const flush = () => {
    if (currentKey === null) return;
    const carried = carry.get(currentKey);
    finish(currentKey, carried && belongs(currentKey, carried.usernameKey) ? carried : null, docs);
    done.add(currentKey);
    docs = [];
  };
  for await (const doc of cursor) {
    const key = `${doc.userId}:${doc.platform}`;
    if (key !== currentKey) {
      flush();
      currentKey = key;
    }
    if (belongs(key, doc.usernameKey)) docs.push(doc);
  }
  flush();

  // Accounts whose last reading is from before the period: no change inside it.
  for (const [key, carried] of carry) {
    if (done.has(key) || !belongs(key, carried.usernameKey)) continue;
    finish(key, carried, []);
  }
}

/** Total score and per-platform score changes from the score history. */
async function addScoreChanges({ startKey, endKey }, into) {
  const carry = new Map(); // userId -> latest document before the period
  const rows = await ScoreHistory.aggregate(
    [
      { $match: { dateKey: { $lt: startKey } } },
      { $sort: { userId: 1, dateKey: -1 } },
      { $group: { _id: "$userId", dateKey: { $first: "$dateKey" }, totalScore: { $first: "$totalScore" }, scores: { $first: "$scores" } } },
    ],
    { allowDiskUse: true, hint: SCORE_INDEX }
  );
  for (const row of rows) carry.set(String(row._id), row);

  const finish = (userId, carried, docs) => {
    const entry = entryFor(into, userId);
    const all = carried ? [carried, ...docs] : docs;
    const total = changeOf(all.map((d) => ({ dateKey: d.dateKey, value: d.totalScore || 0 })));
    if (total) entry.score = total;
    for (const platform of SCORE_PLATFORMS) {
      // A platform's score exists in a document only while the platform is linked.
      const points = all.filter((d) => d.scores && typeof d.scores[platform] === "number").map((d) => ({ dateKey: d.dateKey, value: d.scores[platform] }));
      const change = changeOf(points);
      if (change) entry[`score.${platform}`] = change;
    }
  };

  const done = new Set();
  const cursor = ScoreHistory.find({ dateKey: { $gte: startKey, $lte: endKey } })
    // In index order (newest first within a student); each student's list is reversed below.
    .sort({ userId: 1, dateKey: -1 })
    .hint(SCORE_INDEX)
    .select("userId dateKey totalScore scores")
    .lean()
    .cursor();

  let currentId = null;
  let docs = [];
  const flush = () => {
    if (currentId === null) return;
    finish(currentId, carry.get(currentId) || null, docs.reverse());
    done.add(currentId);
    docs = [];
  };
  for await (const doc of cursor) {
    const id = String(doc.userId);
    if (id !== currentId) {
      flush();
      currentId = id;
    }
    docs.push(doc);
  }
  flush();

  for (const [userId, carried] of carry) {
    if (!done.has(userId)) finish(userId, carried, []);
  }
}

/** The day of the first stored reading of each history (to say when tracking began). */
async function trackingSince() {
  const [platform, score] = await Promise.all([
    PlatformSnapshot.findOne().sort({ dateKey: 1 }).select("dateKey").lean(),
    ScoreHistory.findOne().sort({ dateKey: 1 }).select("dateKey").lean(),
  ]);
  return { platformHistory: platform?.dateKey || null, scoreHistory: score?.dateKey || null };
}

/**
 * Changes for every student over [startKey, endKey].
 * @returns {Promise<Map<string, Object<string, {gain: number, deltas: Array}>>>} per student
 *   id, by number: "score", "score.<platform>", "problems.<platform>", "contests.<platform>",
 *   "rating.<platform>". A number with no reading at all is absent (not zero).
 */
async function loadPeriodChanges({ startKey, endKey, usernameKeys = new Map() }) {
  const changes = new Map();
  await Promise.all([
    addPlatformChanges({ startKey, endKey, usernameKeys }, changes),
    addScoreChanges({ startKey, endKey }, changes),
  ]);
  return changes;
}

module.exports = { changeOf, loadPeriodChanges, trackingSince };
