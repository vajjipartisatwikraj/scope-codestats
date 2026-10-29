/**
 * Sample history for ONE existing student: the last N days (default 30) of platform
 * snapshots, scores, ratings, ranks and heatmap activity.
 *
 *   node scripts/seedUserHistory.js <email>             add the history
 *   node scripts/seedUserHistory.js <email> --dry-run   show what would be added, write nothing
 *   node scripts/seedUserHistory.js <email> --remove    delete what this script added (and only that)
 *   node scripts/seedUserHistory.js <email> --days=45   another length (7 to 90)
 *   node scripts/seedUserHistory.js <email> --reset     FIRST delete all stored history of the student
 *                                                       (a backup is saved to the temp folder), then
 *                                                       write a completely synthetic history that ends
 *                                                       on the numbers their profiles hold now
 *   node scripts/seedUserHistory.js <email> --seed=abc  another reproducible story
 *
 * What is written (history only, the student's profiles and account are not touched):
 *   PlatformSnapshot  problems, difficulty split, rating and contests of LeetCode, Codeforces,
 *                     CodeChef and HackerRank, on the days they changed
 *   ScoreHistory      every platform score, the total score and the ranks (overall, department
 *                     and per platform) on the days anything changed, plus a reading for today
 *                     when the ranks differ from the latest real document (see buildPlan)
 *   ActivityHeatmap   cohort problems solved per day
 *   User.weeklyActivity  recalculated from the new history (consistency index, 7 day change)
 *
 * How the numbers are made: the history is simulated BACKWARDS from what the student has now,
 * i.e. the latest snapshot and score documents. Each day's solved problems, contests and rating
 * changes are drawn first, then taken off the current numbers to find where the month started,
 * and replayed forward. So the history ends exactly on the real documents and every platform
 * score is the real scraper formula applied to that day's numbers. The ranks are worked out by
 * the real rank calculator against what the other students scored on each day. The random
 * choices come from a fixed seed derived from the student's id, so a run is reproducible.
 *
 * Safety:
 *  - Only days without a document are filled. If the student already has history inside the
 *    period the script stops instead of mixing with it.
 *  - Every document it writes carries seedTag "user-history-sample", which --remove uses, so
 *    real documents are never deleted. The tag is not part of the Mongoose schemas, so the
 *    documents are written through the driver (validated against the schemas first).
 *
 * Uses MONGODB_URI from backend/.env (or the environment).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
// Deleting or reading users touches many models, so all of them are registered, as in the server.
for (const file of require("fs").readdirSync(require("path").join(__dirname, "../models"))) {
  if (file.endsWith(".js")) require(`../models/${file}`);
}
const PlatformSnapshot = require("../models/PlatformSnapshot");
const ScoreHistory = require("../models/ScoreHistory");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const Profile = require("../models/Profile");
const { HISTORY_TIMEZONE } = require("../config/platformProgress");
const { SCORE_PLATFORMS } = require("../config/rankings");
const { dayKeyOf, addDays, daysBetween, listDayKeys } = require("../utils/dayKeys");
const { computeRanks } = require("../services/rankings/rankCalculator");
const { activeStudentFilter, toDocument, isSameState } = require("../services/rankings/scoreHistoryService");
const { updateWeeklyActivity } = require("../services/weeklyActivity/weeklyActivityService");
const { getScoreProgress } = require("../services/rankings/scoreProgressService");
const progressService = require("../services/platformProgress/progressService");
const { calculateLeetCodeScore } = require("../services/platformScraper/leetcode");
const { calculateCodeforcesScore } = require("../services/platformScraper/codeforces");
const { calculateCodeChefScore } = require("../services/platformScraper/codechef");
const { calculateHackerRankScore } = require("../services/platformScraper/hackerrank");

const SEED_TAG = "user-history-sample";
const DEFAULT_DAYS = 30;

// ─── Random numbers (reproducible) ──────────────────────────────────────────

function hashSeed(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
  };
}

const weekdayOf = (key) => new Date(`${key}T00:00:00Z`).getUTCDay();
/** When a document of that IST day was "written": just after the nightly sync. */
const stampOf = (dateKey, time = "00:10:00") => new Date(`${dateKey}T${time}+05:30`);

// ─── What each platform's activity looks like ───────────────────────────────

// `score` is the real scraper formula. `solves` is how many problems a day of each level adds
// (inclusive ranges); `contest` describes the platform's contest days and rating moves, with
// `step` the size of one rating change. Ratings are handled in hundredths so LeetCode's
// fractional ratings add up exactly.
const PLATFORMS = {
  leetcode: {
    score: (s) => calculateLeetCodeScore(s.solved, 0, s.rating, {}, s.contests),
    difficulty: true,
    mix: [0.4, 0.5, 0.1],
    hardCap: 1,
    solves: { light: [0, 1], normal: [0, 1], heavy: [1, 2] },
    maxSolved: 16,
    fractionalRating: true,
    contest: { weekdays: [0], chance: 0.7, max: 1, step: [8, 45], solves: [1, 2] },
  },
  codeforces: {
    score: (s) => calculateCodeforcesScore(s.rating, s.solved, s.contests),
    difficulty: true,
    mix: [0.2, 0.3, 0.5],
    hardCap: 25,
    solves: { light: [0, 1], normal: [1, 2], heavy: [2, 4] },
    maxSolved: 60,
    keepWeekActive: true,
    contest: { weekdays: [0, 2, 4, 6], chance: 0.4, max: 8, step: [5, 70], solves: [1, 3] },
  },
  codechef: {
    score: (s) => calculateCodeChefScore(s.rating, s.solved, 0, s.contests),
    difficulty: false,
    solves: { light: [0, 0], normal: [0, 1], heavy: [0, 2] },
    maxSolved: 18,
    contest: { weekdays: [3], chance: 0.85, max: 4, step: [8, 55], solves: [1, 3] },
  },
  hackerrank: {
    score: (s) => calculateHackerRankScore({ totalSolved: s.solved }),
    difficulty: false,
    solves: { light: [0, 0], normal: [0, 1], heavy: [0, 1] },
    solveChance: 0.12,
    minSolved: 2,
    maxSolved: 3,
    contest: null,
  },
};

// ─── The calendar: how busy each day is ─────────────────────────────────────

/** 'off' | 'light' | 'normal' | 'heavy' for every day on which something can happen. */
function planCalendar(eventDays, random) {
  const levels = new Map();
  let quietRun = 0;
  for (const key of eventDays) {
    const roll = random.next();
    let level = roll < 0.12 ? "off" : roll < 0.36 ? "light" : roll < 0.78 ? "normal" : "heavy";
    if (level === "off" && quietRun >= 1) level = "light"; // never two quiet days in a row
    quietRun = level === "off" ? quietRun + 1 : 0;
    levels.set(key, level);
  }
  // The last week reads as a student in a rhythm: at most one quiet day in the last six.
  const quiet = eventDays.slice(-6).filter((key) => levels.get(key) === "off");
  while (quiet.length > 1) levels.set(quiet.shift(), "light");
  // The last day belongs to the real reading, which only exists because something changed.
  const last = eventDays[eventDays.length - 1];
  if (levels.get(last) === "off") levels.set(last, "normal");
  return levels;
}

// ─── Platforms with problems and (mostly) contests ──────────────────────────

/** The numbers at the end of the history, read from the latest snapshot document. */
const anchorOf = (doc) => ({
  solved: doc.problemsSolved || 0,
  easy: doc.easyProblemsSolved || 0,
  medium: doc.mediumProblemsSolved || 0,
  hard: doc.hardProblemsSolved || 0,
  contests: doc.contestsParticipated || 0,
  ratingC: Math.round((doc.rating || 0) * 100),
});

/** What happens on each day: { easy, medium, hard, other, contest, ratingC } */
function planRated(spec, anchor, eventDays, calendar, random) {
  const plan = new Map();
  let used = 0;
  let hardUsed = 0;
  let contests = 0;
  const maxContests = spec.contest && anchor.ratingC > 0 ? Math.min(spec.contest.max, anchor.contests) : 0;

  const solveOne = (event) => {
    if (used >= spec.maxSolved) return;
    if (spec.difficulty) {
      const roll = random.next();
      let level = roll < spec.mix[0] ? "easy" : roll < spec.mix[0] + spec.mix[1] ? "medium" : "hard";
      if (level === "hard" && (hardUsed >= spec.hardCap || hardUsed >= anchor.hard)) level = "medium";
      if (level === "hard") hardUsed += 1;
      event[level] += 1;
    } else {
      event.other += 1;
    }
    used += 1;
  };

  for (const key of eventDays) {
    const level = calendar.get(key);
    const event = { easy: 0, medium: 0, hard: 0, other: 0, contest: 0, ratingC: 0 };

    if (level !== "off") {
      let count = 0;
      if (spec.solveChance === undefined || random.chance(spec.solveChance)) {
        const [low, high] = spec.solves[level];
        count = random.int(low, high);
      }

      const isContestDay =
        contests < maxContests && spec.contest.weekdays.includes(weekdayOf(key)) && random.chance(spec.contest.chance);
      if (isContestDay) {
        contests += 1;
        event.contest = 1;
        const [smallest, biggest] = spec.contest.step;
        const size = spec.fractionalRating ? random.int(smallest * 100, biggest * 100) : random.int(smallest, biggest) * 100;
        event.ratingC = random.chance(0.6) ? size : -size;
        count += random.int(spec.contest.solves[0], spec.contest.solves[1]);
      }

      for (let i = 0; i < count; i += 1) solveOne(event);
    }
    plan.set(key, event);
  }

  // A platform the student still uses at least a little over the period
  if (spec.minSolved) {
    const workingDays = eventDays.filter((key) => calendar.get(key) !== "off");
    for (let attempt = 0; used < spec.minSolved && workingDays.length > 0 && attempt < 50; attempt += 1) {
      solveOne(plan.get(workingDays[random.int(0, workingDays.length - 1)]));
    }
  }

  // The platform that carries the student's daily rhythm: no working day of the last week passes
  // without a solved problem. This also makes the last day a real change, which is why the real
  // document of that day exists in the first place.
  if (spec.keepWeekActive) {
    for (const key of eventDays.slice(-6)) {
      const event = plan.get(key);
      const solved = event.easy + event.medium + event.hard + event.other;
      if (calendar.get(key) !== "off" && event.contest === 0 && solved === 0) solveOne(event);
    }
  }
  return plan;
}

/** Takes the plan off the current numbers to find the start, then replays it day by day. */
function replayRated(name, anchor, plan, eventDays) {
  const sum = { easy: 0, medium: 0, hard: 0, other: 0, contest: 0, ratingC: 0 };
  for (const event of plan.values()) for (const key of Object.keys(sum)) sum[key] += event[key];

  const start = {
    solved: anchor.solved - (sum.easy + sum.medium + sum.hard + sum.other),
    easy: anchor.easy - sum.easy,
    medium: anchor.medium - sum.medium,
    hard: anchor.hard - sum.hard,
    contests: anchor.contests - sum.contest,
    ratingC: anchor.ratingC - sum.ratingC,
  };
  const negative = Object.entries(start).filter(([, value]) => value < 0);
  if (negative.length || (anchor.ratingC > 0 && start.ratingC < 50000)) {
    throw new Error(`Cannot rebuild ${name}: the month would start below zero (${JSON.stringify(start)}).`);
  }

  const states = [start];
  let current = start;
  for (const key of eventDays) {
    const event = plan.get(key);
    current = {
      solved: current.solved + event.easy + event.medium + event.hard + event.other,
      easy: current.easy + event.easy,
      medium: current.medium + event.medium,
      hard: current.hard + event.hard,
      contests: current.contests + event.contest,
      ratingC: current.ratingC + event.ratingC,
    };
    states.push(current);
  }
  for (const key of Object.keys(anchor)) {
    if (current[key] !== anchor[key]) throw new Error(`${name} did not end on its current numbers (${key}).`);
  }
  return states;
}

const scoreInput = (state) => ({ solved: state.solved, rating: state.ratingC / 100, contests: state.contests });

const metricsOf = (state) => ({
  problemsSolved: state.solved,
  easyProblemsSolved: state.easy,
  mediumProblemsSolved: state.medium,
  hardProblemsSolved: state.hard,
  rating: state.ratingC / 100,
  contestsParticipated: state.contests,
});

// ─── The internal platform: cohort problems ─────────────────────────────────

function planCohort(anchorScore, eventDays, calendar, random) {
  const MAX_PROBLEMS = 20;
  const plan = new Map();
  let problems = 0;
  let total = 0;
  for (const key of eventDays) {
    const level = calendar.get(key);
    let count = 0;
    if (level === "heavy" && random.chance(0.85)) count = random.int(1, 3);
    else if (level === "normal" && random.chance(0.6)) count = random.int(1, 2);
    else if (level === "light" && random.chance(0.25)) count = 1;
    count = Math.min(count, MAX_PROBLEMS - problems);
    problems += count;
    let points = 0;
    for (let i = 0; i < count; i += 1) points += random.int(45, 95);
    total += points;
    plan.set(key, { count, points });
  }
  if (total > anchorScore) throw new Error("The cohort score is too small to rebuild a month of cohort problems.");

  const scores = [anchorScore - total];
  for (const key of eventDays) scores.push(scores[scores.length - 1] + plan.get(key).points);
  return { plan, scores, problems };
}

// ─── Building everything ────────────────────────────────────────────────────

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findUser(email) {
  const users = await User.find({ email: new RegExp(`^${escapeRegex(email)}$`, "i") })
    .select("name email rollNumber department userType signupIntent")
    .lean();
  if (users.length === 0) throw new Error(`No user with the email ${email}.`);
  if (users.length > 1) throw new Error(`${users.length} users have the email ${email}.`);
  return users[0];
}

/**
 * @param {object} options
 * @param {boolean} options.fromProfiles  build a completely synthetic history that ends on the
 *   numbers the student's profiles hold now, with no stored document to end on (used with
 *   --reset, which deletes the stored history first). The last day gets its own documents.
 * @param {string} options.seed  another value gives another (still reproducible) story
 */
async function buildPlan(user, days, { fromProfiles = false, seed = "" } = {}) {
  const userId = user._id;
  const todayKey = dayKeyOf(new Date(), HISTORY_TIMEZONE);
  const startKey = addDays(todayKey, -(days - 1));

  let latestScore;
  let endKey;
  const anchors = {};

  if (fromProfiles) {
    const profiles = await Profile.find({ userId }).lean();
    if (profiles.length === 0) throw new Error("This student has no linked platforms to build a history from.");
    endKey = todayKey;
    const scores = {};
    for (const profile of profiles) {
      if (SCORE_PLATFORMS.includes(profile.platform)) scores[profile.platform] = profile.score || 0;
      if (PLATFORMS[profile.platform]) {
        const usernameKey = String(profile.username || "").trim().toLowerCase();
        anchors[profile.platform] = {
          doc: { username: profile.username, usernameKey },
          anchor: anchorOf(profile),
          day: endKey,
        };
      }
    }
    latestScore = { scores };
  } else {
    // The real documents the history has to end on
    latestScore = await ScoreHistory.findOne({ userId, dateKey: { $lte: todayKey } }).sort({ dateKey: -1 }).lean();
    if (!latestScore) throw new Error("This student has no score history yet. Run a profile sync or a rank calculation first.");
    endKey = latestScore.dateKey;
    if (daysBetween(startKey, endKey) < 3) {
      throw new Error(`The latest score document (${endKey}) is too close to the start of the period (${startKey}).`);
    }

    for (const platform of Object.keys(PLATFORMS)) {
      const doc = await PlatformSnapshot.findOne({ userId, platform, dateKey: { $lte: todayKey } }).sort({ dateKey: -1 }).lean();
      if (doc && doc.dateKey > startKey) anchors[platform] = { doc, anchor: anchorOf(doc), day: doc.dateKey };
    }

    // Never mix with history that exists already
    const [haveSnapshots, haveScores, haveHeat] = await Promise.all([
      PlatformSnapshot.countDocuments({ userId, dateKey: { $gte: startKey, $lt: endKey } }),
      ScoreHistory.countDocuments({ userId, dateKey: { $gte: startKey, $lt: endKey } }),
      ActivityHeatmap.countDocuments({ userId, dateKey: { $gte: startKey, $lte: endKey } }),
    ]);
    if (haveSnapshots || haveScores || haveHeat) {
      throw new Error(
        `This student already has history between ${startKey} and ${endKey} ` +
          `(${haveSnapshots} snapshots, ${haveScores} score documents, ${haveHeat} heatmap days). ` +
          "If this script added it, run it with --remove first."
      );
    }
  }

  const random = createRandom(hashSeed(seed ? `${userId}:${seed}` : String(userId)));
  const allDays = listDayKeys(startKey, endKey); // startKey is the baseline day
  const eventDays = allDays.slice(1); // days on which something can change
  const calendar = planCalendar(eventDays, random);

  // Platforms with snapshots
  const rated = {};
  for (const [platform, { doc, anchor, day }] of Object.entries(anchors)) {
    const ownDays = eventDays.filter((key) => key <= day);
    const plan = planRated(PLATFORMS[platform], anchor, ownDays, calendar, random);
    rated[platform] = { doc, anchor, day, states: replayRated(platform, anchor, plan, ownDays), plan };
  }

  // The internal platform, if the student has a score on it
  const anchorScores = latestScore.scores || {};
  let cohort = null;
  if (typeof anchorScores.scopecodestats === "number") {
    cohort = planCohort(anchorScores.scopecodestats, eventDays, calendar, random);
  }

  // The score of every platform on every day (index 0 is the baseline day)
  const scoresOn = (index) => {
    const scores = {};
    for (const platform of SCORE_PLATFORMS) {
      if (typeof anchorScores[platform] !== "number") continue; // not linked
      if (rated[platform]) {
        const { states } = rated[platform];
        scores[platform] = PLATFORMS[platform].score(scoreInput(states[Math.min(index, states.length - 1)]));
      } else if (platform === "scopecodestats" && cohort) {
        scores[platform] = cohort.scores[Math.min(index, cohort.scores.length - 1)];
      } else {
        scores[platform] = anchorScores[platform];
      }
    }
    return scores;
  };

  // How well the formulas reproduce the real last reading (a check on the whole rebuild)
  const lastIndex = allDays.length - 1;
  const rebuilt = scoresOn(lastIndex);
  const mismatches = Object.keys(rebuilt).filter((platform) => rebuilt[platform] !== anchorScores[platform]);

  // Ranks against what everyone else had on each day
  const pool = await User.find(await activeStudentFilter()).select("_id department").lean();
  const peers = pool.filter((person) => String(person._id) !== String(userId));
  const peerDocs = await ScoreHistory.find({ userId: { $in: peers.map((p) => p._id) }, dateKey: { $lte: endKey } })
    .select("userId dateKey scores")
    .sort({ userId: 1, dateKey: 1 })
    .lean();
  const historyOf = new Map();
  for (const doc of peerDocs) {
    const key = String(doc.userId);
    if (!historyOf.has(key)) historyOf.set(key, []);
    historyOf.get(key).push(doc);
  }
  const peerScoresOn = (peerId, dateKey) => {
    const docs = historyOf.get(String(peerId)) || [];
    let found = {};
    for (const doc of docs) {
      if (doc.dateKey > dateKey) break;
      found = doc.scores || {};
    }
    return found;
  };

  const userKey = String(userId);
  const scoreDocs = [];
  const dailyTotals = [];
  let previous = null;
  // The last day already has a real document, unless the whole history is synthetic
  const lastWritten = fromProfiles ? allDays.length : allDays.length - 1;
  for (let index = 0; index < lastWritten; index += 1) {
    const dateKey = allDays[index];
    const scores = scoresOn(index);
    const students = [
      { userId: userKey, department: user.department || "", scores },
      ...peers.map((peer) => ({ userId: String(peer._id), department: peer.department || "", scores: peerScoresOn(peer._id, dateKey) })),
    ];
    const result = computeRanks(students).get(userKey);
    const document = toDocument(userKey, dateKey, result);
    dailyTotals.push({ dateKey, totalScore: result.totalScore, overall: result.ranks.overall });
    if (!previous || !isSameState(document, previous)) {
      scoreDocs.push(document);
      previous = document;
    }
  }

  // Today's reading. The student's last real document was ranked when they were the only student
  // in the pool, so its ranks read "1 of 1". If anything about the ranks is different now, the
  // nightly run would store a new document for today; this does the same (the scores stay as
  // they are). The real document is not touched.
  if (todayKey > endKey) {
    const students = [
      { userId: userKey, department: user.department || "", scores: anchorScores },
      ...peers.map((peer) => ({ userId: String(peer._id), department: peer.department || "", scores: peerScoresOn(peer._id, todayKey) })),
    ];
    const document = toDocument(userKey, todayKey, computeRanks(students).get(userKey));
    if (!isSameState(document, latestScore)) scoreDocs.push(document);
  }

  // Snapshot documents: the baseline day, then the days on which a number changed
  const snapshotDocs = [];
  for (const [platform, entry] of Object.entries(rated)) {
    let last = null;
    entry.states.slice(0, daysBetween(startKey, entry.day) + (fromProfiles ? 1 : 0)).forEach((state, index) => {
      const metrics = metricsOf(state);
      const changed = !last || Object.keys(metrics).some((metric) => metrics[metric] !== last[metric]);
      if (!changed) return;
      last = metrics;
      snapshotDocs.push({
        userId,
        platform,
        dateKey: allDays[index],
        username: entry.doc.username,
        usernameKey: entry.doc.usernameKey,
        ...metrics,
      });
    });
  }

  const heatmapDocs = [];
  if (cohort) {
    for (const [dateKey, { count }] of cohort.plan) {
      if (count > 0) {
        heatmapDocs.push({ userId, dateKey, date: new Date(`${dateKey}T00:00:00.000Z`), count, sources: { cohort: count } });
      }
    }
  }

  return { user, todayKey, startKey, endKey, anchors, rated, cohort, scoreDocs, snapshotDocs, heatmapDocs, dailyTotals, mismatches, peers: peers.length };
}

// ─── Writing ────────────────────────────────────────────────────────────────

/** Checks a document against its Mongoose schema, then adds the timestamps and the tag. */
function prepare(Model, documents, stampKey) {
  return documents.map((document) => {
    const error = new Model(document).validateSync();
    if (error) throw new Error(`${Model.modelName} ${document.dateKey}: ${error.message}`);
    const stamp = stampOf(document.dateKey, stampKey);
    return { ...document, createdAt: stamp, updatedAt: stamp, __v: 0, seedTag: SEED_TAG };
  });
}

async function removeAdded(userId) {
  const filter = { userId, seedTag: SEED_TAG };
  const [snapshots, scores, heatmap] = await Promise.all([
    PlatformSnapshot.collection.deleteMany(filter),
    ScoreHistory.collection.deleteMany(filter),
    ActivityHeatmap.collection.deleteMany(filter),
  ]);
  return { snapshots: snapshots.deletedCount, scores: scores.deletedCount, heatmapDays: heatmap.deletedCount };
}

// ─── --reset: everything stored for the student, saved and then deleted ─────

const STORED = [
  ["snapshots", PlatformSnapshot],
  ["scores", ScoreHistory],
  ["heatmapDays", ActivityHeatmap],
];

async function countStored(userId) {
  const counts = {};
  for (const [name, Model] of STORED) counts[name] = await Model.collection.countDocuments({ userId });
  return counts;
}

/** Writes every stored history document of the student to a JSON file outside the project. */
async function backUpStored(user) {
  const content = { student: user.email, savedAt: new Date().toISOString() };
  for (const [name, Model] of STORED) content[name] = await Model.collection.find({ userId: user._id }).toArray();
  const file = require("path").join(
    require("os").tmpdir(),
    `history-backup-${String(user.email).replace(/[^a-z0-9]+/gi, "_")}-${Date.now()}.json`
  );
  require("fs").writeFileSync(file, JSON.stringify(content, null, 2));
  return file;
}

async function deleteStored(userId) {
  const deleted = {};
  for (const [name, Model] of STORED) deleted[name] = (await Model.collection.deleteMany({ userId })).deletedCount;
  return deleted;
}

async function write(plan) {
  const userId = plan.user._id;
  const snapshots = prepare(PlatformSnapshot, plan.snapshotDocs, "00:10:00");
  const scores = prepare(ScoreHistory, plan.scoreDocs, "00:10:00");
  const heatmap = prepare(ActivityHeatmap, plan.heatmapDocs, "12:00:00");
  try {
    if (snapshots.length) await PlatformSnapshot.collection.insertMany(snapshots, { ordered: true });
    if (scores.length) await ScoreHistory.collection.insertMany(scores, { ordered: true });
    if (heatmap.length) await ActivityHeatmap.collection.insertMany(heatmap, { ordered: true });
    // The 7 day consistency index and score change, from the history that now exists
    await updateWeeklyActivity([userId], plan.todayKey);
  } catch (error) {
    console.error("Writing failed, removing what was added:", error.message);
    await removeAdded(userId);
    await updateWeeklyActivity([userId], plan.todayKey).catch(() => {});
    throw error;
  }
  return { snapshots: snapshots.length, scores: scores.length, heatmapDays: heatmap.length };
}

// ─── Reporting ──────────────────────────────────────────────────────────────

const money = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function describe(plan) {
  console.log(`\nStudent: ${plan.user.name} <${plan.user.email}> (${plan.user.department || "no department"})`);
  console.log(`Period:  ${plan.startKey} to ${plan.endKey} (the latest real documents are from ${plan.endKey}; today is ${plan.todayKey})`);
  console.log(`Ranked against ${plan.peers} other active students`);

  console.log("\nPlatforms (start of the period -> now):");
  for (const [platform, entry] of Object.entries(plan.rated)) {
    const first = entry.states[0];
    const last = entry.states[entry.states.length - 1];
    const parts = [
      `solved ${first.solved} -> ${last.solved}`,
      last.ratingC > 0 ? `rating ${first.ratingC / 100} -> ${last.ratingC / 100}` : null,
      PLATFORMS[platform].contest ? `contests ${first.contests} -> ${last.contests}` : null,
      `score ${money(PLATFORMS[platform].score(scoreInput(first)))} -> ${money(PLATFORMS[platform].score(scoreInput(last)))}`,
    ].filter(Boolean);
    console.log(`  ${platform.padEnd(11)} ${parts.join(" | ")}`);
  }
  if (plan.cohort) {
    console.log(`  scopecodestats score ${money(plan.cohort.scores[0])} -> ${money(plan.cohort.scores[plan.cohort.scores.length - 1])} (${plan.cohort.problems} cohort problems)`);
  }
  if (plan.mismatches.length) {
    console.log(`  note: the formulas differ from the stored last reading for ${plan.mismatches.join(", ")}`);
  }

  const first = plan.dailyTotals[0];
  const last = plan.dailyTotals[plan.dailyTotals.length - 1];
  console.log(`\nTotal score ${money(first.totalScore)} on ${first.dateKey} -> ${money(last.totalScore)} on ${last.dateKey}`);
  const ranks = new Set(plan.dailyTotals.map((day) => `${day.overall.rank} of ${day.overall.of}`));
  console.log(`Overall rank during the period: ${[...ranks].join(", ")}`);
}

async function verify(user, days, todayKey) {
  console.log("\nRead back through the dashboard's own services:");
  const scores = await getScoreProgress(user._id, days);
  if (scores.state === "ok") {
    const { summary } = scores;
    const active = scores.series.filter((point) => point.hasData && point.totalChange !== 0).length;
    console.log(`  scores     state ${scores.state}, ${scores.series.length} days, total ${money(summary.totalScore)}, change ${money(summary.scoreChange)}, days with a change ${active}`);
    console.log(`             overall rank ${summary.overall.rank} of ${summary.overall.of}, platforms ${Object.keys(summary.platforms).join(", ")}`);
    const recent = scores.series
      .slice(-8)
      .map((point) => `${point.date.slice(5)} ${money(point.totalScore)} (${point.totalChange >= 0 ? "+" : ""}${money(point.totalChange)})`);
    console.log(`             last days: ${recent.join(" | ")}`);
  } else {
    console.log(`  scores     state ${scores.state}`);
  }
  for (const platform of Object.keys(PLATFORMS)) {
    const history = await progressService.getHistory(user._id, platform, days);
    if (history.state === "ok" && history.summary) {
      console.log(`  ${platform.padEnd(11)} state ok, ${history.series.length} days, tracking since ${history.trackingSince}`);
    } else {
      console.log(`  ${platform.padEnd(11)} state ${history.state}`);
    }
  }
  const updated = await User.findById(user._id).select("weeklyActivity").lean();
  console.log(`  weekly activity (7 days to ${todayKey}):`, JSON.stringify(updated.weeklyActivity));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const remove = args.includes("--remove");
  const reset = args.includes("--reset");
  const daysArg = args.find((arg) => arg.startsWith("--days="));
  const days = daysArg ? Number(daysArg.split("=")[1]) : DEFAULT_DAYS;
  const seedArg = args.find((arg) => arg.startsWith("--seed="));
  const seed = seedArg ? seedArg.split("=")[1] : "";

  if (!email) throw new Error("Usage: node scripts/seedUserHistory.js <email> [--days=30] [--dry-run] [--remove]");
  if (!Number.isInteger(days) || days < 7 || days > 90) throw new Error("--days must be a whole number from 7 to 90");
  if (process.env.NODE_ENV === "production" && !args.includes("--force")) {
    throw new Error("NODE_ENV is production. Sample data is for development; pass --force to continue.");
  }

  await connectDB();
  console.log(`Database: ${mongoose.connection.name} on ${mongoose.connection.host}`);
  await Promise.all([PlatformSnapshot.init(), ScoreHistory.init(), ActivityHeatmap.init()]);

  const user = await findUser(email);

  if (remove) {
    const removed = await removeAdded(user._id);
    await updateWeeklyActivity([user._id], dayKeyOf(new Date(), HISTORY_TIMEZONE));
    console.log(`Removed for ${user.email}:`, removed);
    return;
  }

  if (!reset) {
    const alreadyAdded =
      (await PlatformSnapshot.collection.countDocuments({ userId: user._id, seedTag: SEED_TAG })) +
      (await ScoreHistory.collection.countDocuments({ userId: user._id, seedTag: SEED_TAG })) +
      (await ActivityHeatmap.collection.countDocuments({ userId: user._id, seedTag: SEED_TAG }));
    if (alreadyAdded > 0) throw new Error(`${alreadyAdded} documents from this script exist for ${user.email}. Run with --remove first.`);
  }

  // The plan is made (read only) before anything is deleted, so a problem stops the run early
  const plan = await buildPlan(user, days, { fromProfiles: reset, seed });
  describe(plan);
  console.log(
    `\nTo write: ${plan.snapshotDocs.length} snapshots, ${plan.scoreDocs.length} score documents, ${plan.heatmapDocs.length} heatmap days`
  );

  let backupFile = null;
  if (reset) {
    const stored = await countStored(user._id);
    console.log(`To delete first (all stored history of this student): ${JSON.stringify(stored)}`);
    if (!dryRun) {
      backupFile = await backUpStored(user);
      console.log(`Backup of those documents: ${backupFile}`);
      console.log("Deleted:", await deleteStored(user._id));
    }
  }

  if (dryRun) {
    console.log("Dry run: nothing was written or deleted.");
    return;
  }

  try {
    console.log("Added:", await write(plan));
  } catch (error) {
    if (backupFile) console.error(`The old history was deleted before this failed. It is saved in ${backupFile}`);
    throw error;
  }
  await verify(user, days, plan.todayKey);
}

// The planning helpers are shared with seedFreshHistory.js
module.exports = {
  SEED_TAG,
  PLATFORMS,
  hashSeed,
  createRandom,
  weekdayOf,
  planCalendar,
  planRated,
  scoreInput,
  metricsOf,
  prepare,
};

if (require.main === module) {
  main()
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error("Failed:", error.message);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}
