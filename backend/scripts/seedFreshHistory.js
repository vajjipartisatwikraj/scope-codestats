/**
 * A brand new year of synthetic data for ONE existing student. Nothing from the student's
 * current numbers is kept.
 *
 *   node scripts/seedFreshHistory.js <email> --dry-run   show the plan, change nothing
 *   node scripts/seedFreshHistory.js <email>             do it
 *   node scripts/seedFreshHistory.js <email> --seed=abc  another reproducible story
 *   node scripts/seedFreshHistory.js <email> --days=365  another length (30 to 730)
 *
 * What it does, in this order:
 *   1. saves everything it is about to replace to a JSON file in the temp folder,
 *   2. deletes the student's PlatformSnapshot, ScoreHistory and ActivityHeatmap documents,
 *   3. resets the statistics of every Profile of the student (score, problems solved, rating,
 *      contests, GitHub details, cohort totals ...) to newly invented numbers. The platform
 *      usernames stay, so the accounts stay linked,
 *   4. writes a year of new history that ends exactly on those new numbers,
 *   5. resets User.rankingInfo and User.weeklyActivity from the new history.
 *
 * The year is simulated FORWARD from a modest starting point (an average third year student)
 * with the same planners as seedUserHistory.js: problems solved, contests with rating moves, a
 * calendar of busy and quiet days with a few holiday gaps. Scores use the real scraper formulas
 * and ranks come from the real rank calculator against the other students. The random choices
 * come from a fixed seed, so a run is reproducible. Every history document carries the same
 * seedTag as seedUserHistory.js, so `seedUserHistory.js <email> --remove` deletes them again.
 *
 * Not touched: cohort enrolments and progress, practice arena and speech tests. They are real
 * coursework, not platform scores. Note that a profile sync recomputes the internal platform
 * from the cohorts and re-reads the external platforms from the linked usernames, so the next
 * sync can bring back numbers from those sources.
 *
 * Uses MONGODB_URI from backend/.env (or the environment).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
for (const file of require("fs").readdirSync(require("path").join(__dirname, "../models"))) {
  if (file.endsWith(".js")) require(`../models/${file}`);
}
const Profile = require("../models/Profile");
const PlatformSnapshot = require("../models/PlatformSnapshot");
const ScoreHistory = require("../models/ScoreHistory");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const { HISTORY_TIMEZONE } = require("../config/platformProgress");
const { SCORE_PLATFORMS } = require("../config/rankings");
const { dayKeyOf, addDays, listDayKeys } = require("../utils/dayKeys");
const { computeRanks, percentileOf } = require("../services/rankings/rankCalculator");
const { activeStudentFilter, toDocument, isSameState } = require("../services/rankings/scoreHistoryService");
const { updateWeeklyActivity } = require("../services/weeklyActivity/weeklyActivityService");
const { getScoreProgress } = require("../services/rankings/scoreProgressService");
const progressService = require("../services/platformProgress/progressService");
const { calculateGitHubScore } = require("../services/platformScraper/github");
const base = require("./seedUserHistory");

const { SEED_TAG, PLATFORMS, createRandom, hashSeed, planCalendar, planRated, scoreInput, metricsOf, prepare } = base;

// ─── The student the year is about ──────────────────────────────────────────

// Where each platform stands at the start of the year, and how busy the year is. `ratingC` is the
// rating in hundredths. The rest overrides the per-month defaults of seedUserHistory.js.
const FRESH = {
  leetcode: {
    start: { solved: 62, easy: 34, medium: 25, hard: 3, contests: 3, ratingC: 148000 },
    spec: {
      mix: [0.4, 0.5, 0.1],
      hardCap: 18,
      solveChance: 0.65,
      maxSolved: 230,
      contest: { weekdays: [0], chance: 0.36, max: 24, step: [8, 45], solves: [1, 2] },
    },
  },
  codeforces: {
    start: { solved: 140, easy: 70, medium: 52, hard: 18, contests: 6, ratingC: 118000 },
    spec: {
      mix: [0.3, 0.5, 0.2],
      hardCap: 70,
      solveChance: 0.42,
      maxSolved: 340,
      contest: { weekdays: [0, 2, 4, 6], chance: 0.11, max: 30, step: [5, 70], solves: [1, 3] },
    },
  },
  codechef: {
    start: { solved: 70, easy: 0, medium: 0, hard: 0, contests: 5, ratingC: 142000 },
    spec: {
      solveChance: 0.33,
      maxSolved: 140,
      contest: { weekdays: [3], chance: 0.46, max: 30, step: [8, 55], solves: [1, 3] },
    },
  },
  hackerrank: {
    start: { solved: 20, easy: 0, medium: 0, hard: 0, contests: 0, ratingC: 0 },
    spec: { solveChance: 0.3, minSolved: 20, maxSolved: 45, contest: null },
  },
};

const GITHUB_START = { repos: 8, stars: 3, commits: 190, followers: 4, following: 18 };
const COHORT_START = 180;
const COHORT_MAX_PROBLEMS = 60;

const CF_RANKS = [[2400, "international grandmaster"], [2100, "master"], [1900, "candidate master"], [1600, "expert"], [1400, "specialist"], [1200, "pupil"], [0, "newbie"]];
const cfRank = (rating) => (rating > 0 ? CF_RANKS.find(([min]) => rating >= min)[1] : "unrated");

const money = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// ─── Planning the year ──────────────────────────────────────────────────────

/** The usual calendar plus a few holiday and exam stretches of quiet days. */
function yearCalendar(eventDays, random) {
  const levels = planCalendar(eventDays, random);
  for (let gap = 0; gap < 4; gap += 1) {
    const length = random.int(4, 9);
    const first = random.int(5, Math.max(6, eventDays.length - 14 - length));
    for (let i = 0; i < length; i += 1) levels.set(eventDays[first + i], "off");
  }
  return levels;
}

function replayForward(start, plan, eventDays) {
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
  return states;
}

function planGithub(eventDays, calendar, random) {
  const pick = (count) => new Set(Array.from({ length: count }, () => eventDays[random.int(0, eventDays.length - 1)]));
  const repoDays = pick(6);
  const starDays = pick(7);
  const followDays = pick(5);
  let current = { ...GITHUB_START };
  const states = [current];
  for (const key of eventDays) {
    const level = calendar.get(key);
    const next = { ...current };
    const commitChance = level === "heavy" ? 0.8 : level === "normal" ? 0.5 : level === "light" ? 0.25 : 0;
    if (random.chance(commitChance)) next.commits += random.int(1, level === "heavy" ? 5 : 3);
    if (repoDays.has(key)) next.repos += 1;
    if (starDays.has(key)) next.stars += 1;
    if (followDays.has(key)) next.followers += 1;
    states.push(next);
    current = next;
  }
  return states;
}

/** The score on every day (index 0 is the day before the first event) and the problems solved */
function cohortTotals(plan, eventDays) {
  const scores = [COHORT_START];
  let problems = 0;
  for (const key of eventDays) {
    const { count, points } = plan.get(key);
    scores.push(scores[scores.length - 1] + points);
    problems += count;
  }
  return { scores, problems };
}

function planCohort(eventDays, calendar, random) {
  const plan = new Map();
  let problems = 0;
  for (const key of eventDays) {
    const level = calendar.get(key);
    let count = 0;
    if (level === "heavy" && random.chance(0.2)) count = random.int(1, 3);
    else if (level === "normal" && random.chance(0.08)) count = random.int(1, 2);
    else if (level === "light" && random.chance(0.02)) count = 1;
    count = Math.min(count, COHORT_MAX_PROBLEMS - problems);
    problems += count;
    let points = 0;
    for (let i = 0; i < count; i += 1) points += random.int(45, 95);
    plan.set(key, { count, points });
  }
  return { plan, ...cohortTotals(plan, eventDays) };
}

// ─── The last two weeks ─────────────────────────────────────────────────────

// How much is gained on each of the last 14 days, as a share of the best day. The dashboard draws
// these as a strip of bars, so the days are different from each other and none of them is empty:
// a student in a daily rhythm. Each day varies a little around its share from run to run.
const RECENT_SHAPE = [0.45, 0.6, 0.35, 0.7, 0.5, 0.8, 0.4, 0.6, 0.9, 0.5, 0.75, 0.45, 1, 0.55];
const BEST_DAY_POINTS = 100;
const DAILY_SOLVE_PLATFORMS = ["leetcode", "codeforces", "hackerrank"];

/**
 * Replaces what was planned for the last 14 days. Every day gets one cohort problem, worth the
 * rest of that day's points, and up to three problems on LeetCode, Codeforces or HackerRank
 * (5 points each). Contests are left out of these days, because one of them would be a spike.
 */
function shapeRecentDays(rated, cohort, eventDays, random) {
  const recentDays = eventDays.slice(-RECENT_SHAPE.length);
  const solvers = DAILY_SOLVE_PLATFORMS.filter((platform) => rated[platform]);
  const anyRated = Object.keys(rated);
  const choices = solvers.length ? solvers : anyRated;

  recentDays.forEach((key, index) => {
    const share = RECENT_SHAPE[RECENT_SHAPE.length - recentDays.length + index] * (0.92 + 0.16 * random.next());
    const target = Math.max(10, Math.round((share * BEST_DAY_POINTS) / 5) * 5);

    // Problems on the platforms: up to three, or all of the points when there is no cohort
    const solves = cohort ? (choices.length ? random.int(0, 3) : 0) : choices.length ? Math.round(target / 5) : 0;
    for (const entry of Object.values(rated)) {
      entry.plan.set(key, { easy: 0, medium: 0, hard: 0, other: 0, contest: 0, ratingC: 0 });
    }
    for (let i = 0; i < solves; i += 1) {
      const roll = random.next();
      const platform = choices[Math.min(choices.length - 1, Math.floor(roll * choices.length))];
      const event = rated[platform].plan.get(key);
      if (rated[platform].spec.difficulty) event[random.chance(0.6) ? "medium" : "easy"] += 1;
      else event.other += 1;
    }

    if (cohort) cohort.plan.set(key, { count: 1, points: Math.max(25, target - 5 * solves) });
  });

  if (cohort) Object.assign(cohort, cohortTotals(cohort.plan, eventDays));
}

async function buildPlan(user, days, seed) {
  const userId = user._id;
  const todayKey = dayKeyOf(new Date(), HISTORY_TIMEZONE);
  const startKey = addDays(todayKey, -(days - 1));
  const allDays = listDayKeys(startKey, todayKey);
  const eventDays = allDays.slice(1);

  const profiles = await Profile.find({ userId }).lean();
  if (profiles.length === 0) throw new Error("This student has no linked platforms.");
  const byPlatform = Object.fromEntries(profiles.map((profile) => [profile.platform, profile]));

  const random = createRandom(hashSeed(`${userId}:fresh:${seed}`));
  const calendar = yearCalendar(eventDays, random);

  // Platforms with problems, contests and ratings
  const rated = {};
  for (const platform of Object.keys(FRESH)) {
    if (!byPlatform[platform]) continue;
    const spec = { ...PLATFORMS[platform], ...FRESH[platform].spec };
    const start = FRESH[platform].start;
    const budgets = { ratingC: start.ratingC, contests: 99999, hard: 99999 }; // nothing is taken off a total here
    const plan = planRated(spec, budgets, eventDays, calendar, random);
    rated[platform] = { profile: byPlatform[platform], spec, start, plan };
  }

  const github = byPlatform.github ? planGithub(eventDays, calendar, random) : null;
  const cohort = byPlatform.scopecodestats ? planCohort(eventDays, calendar, random) : null;

  // The last two weeks are set after everything else, so the rest of the year is the same for a seed
  shapeRecentDays(rated, cohort, eventDays, random);
  for (const entry of Object.values(rated)) entry.states = replayForward(entry.start, entry.plan, eventDays);

  const scoreOf = (platform, index) => {
    if (rated[platform]) {
      return rated[platform].spec.score(scoreInput(rated[platform].states[index]));
    }
    if (platform === "github" && github) {
      const state = github[index];
      return calculateGitHubScore({ publicRepos: state.repos, starsReceived: state.stars });
    }
    if (platform === "scopecodestats" && cohort) return cohort.scores[index];
    return null;
  };
  const scoresOn = (index) => {
    const scores = {};
    for (const platform of SCORE_PLATFORMS) {
      if (!byPlatform[platform]) continue;
      scores[platform] = scoreOf(platform, index) ?? 0;
    }
    return scores;
  };

  // Ranks against everyone else. The other students count for the whole year: before their first
  // document they have the scores of that first document.
  const pool = await User.find(await activeStudentFilter()).select("_id department").lean();
  const peers = pool.filter((person) => String(person._id) !== String(userId));
  const peerDocs = await ScoreHistory.find({ userId: { $in: peers.map((p) => p._id) }, dateKey: { $lte: todayKey } })
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
    if (docs.length === 0) return {};
    let found = docs[0].scores || {};
    for (const doc of docs) {
      if (doc.dateKey > dateKey) break;
      found = doc.scores || {};
    }
    return found;
  };

  const userKey = String(userId);
  const scoreDocs = [];
  const daily = [];
  let previous = null;
  allDays.forEach((dateKey, index) => {
    const scores = scoresOn(index);
    const students = [
      { userId: userKey, department: user.department || "", scores },
      ...peers.map((peer) => ({ userId: String(peer._id), department: peer.department || "", scores: peerScoresOn(peer._id, dateKey) })),
    ];
    const result = computeRanks(students).get(userKey);
    const document = toDocument(userKey, dateKey, result);
    daily.push({ dateKey, totalScore: result.totalScore, overall: result.ranks.overall, department: result.ranks.department });
    if (!previous || !isSameState(document, previous)) {
      scoreDocs.push(document);
      previous = document;
    }
  });

  const snapshotDocs = [];
  for (const [platform, entry] of Object.entries(rated)) {
    const username = entry.profile.username;
    const usernameKey = String(username || "").trim().toLowerCase();
    let last = null;
    entry.states.forEach((state, index) => {
      const metrics = metricsOf(state);
      if (last && Object.keys(metrics).every((metric) => metrics[metric] === last[metric])) return;
      last = metrics;
      snapshotDocs.push({ userId, platform, dateKey: allDays[index], username, usernameKey, ...metrics });
    });
  }

  const heatmapDocs = [];
  if (cohort) {
    for (const [dateKey, { count }] of cohort.plan) {
      if (count > 0) heatmapDocs.push({ userId, dateKey, date: new Date(`${dateKey}T00:00:00.000Z`), count, sources: { cohort: count } });
    }
  }

  return { user, todayKey, startKey, allDays, byPlatform, rated, github, cohort, scoreDocs, snapshotDocs, heatmapDocs, daily, peers: peers.length };
}

// ─── The new statistics of each Profile ─────────────────────────────────────

const ZERO_STATS = {
  score: 0,
  problemsSolved: 0,
  easyProblemsSolved: 0,
  mediumProblemsSolved: 0,
  hardProblemsSolved: 0,
  rating: 0,
  maxRating: 0,
  rank: "unrated",
  globalRank: 0,
  countryRank: 0,
  instituteRank: 0,
  contestsParticipated: 0,
  contestRanking: 0,
  contestBadge: "",
  badges: 0,
  certificates: 0,
  details: null,
  totalCohortsCompleted: 0,
  totalCohortProblemsSolved: 0,
  totalCohortScore: 0,
  lifetimeScore: 0,
  lifetimeProblems: 0,
  totalPracticeArenaContests: 0,
};

/** Every statistic of the platform as it stands on the last day; everything else is zeroed. */
function profileStats(plan, platform) {
  const last = plan.allDays.length - 1;
  const stats = { ...ZERO_STATS };

  if (plan.rated[platform]) {
    const { states, spec } = plan.rated[platform];
    const end = states[last];
    Object.assign(stats, {
      score: spec.score(scoreInput(end)),
      problemsSolved: end.solved,
      easyProblemsSolved: end.easy,
      mediumProblemsSolved: end.medium,
      hardProblemsSolved: end.hard,
      rating: end.ratingC / 100,
      maxRating: Math.max(...states.map((state) => state.ratingC)) / 100,
      contestsParticipated: end.contests,
    });
    if (platform === "codeforces") stats.rank = cfRank(stats.rating);
    if (platform === "leetcode" && stats.rating >= 1850) stats.contestBadge = "Knight";
    if (platform === "hackerrank") Object.assign(stats, { badges: 4, certificates: 1 });
  } else if (platform === "github" && plan.github) {
    const end = plan.github[last];
    const start = plan.github[0];
    stats.score = calculateGitHubScore({ publicRepos: end.repos, starsReceived: end.stars });
    stats.details = {
      publicRepos: end.repos,
      totalCommits: end.commits,
      followers: end.followers,
      following: end.following,
      starsReceived: end.stars,
      contributionsLastYear: end.commits - start.commits + 24,
    };
  } else if (platform === "scopecodestats" && plan.cohort) {
    const score = plan.cohort.scores[last];
    const problems = Math.round(COHORT_START / 60) + plan.cohort.problems;
    Object.assign(stats, {
      score,
      problemsSolved: problems,
      totalCohortScore: score,
      lifetimeScore: score,
      totalCohortProblemsSolved: problems,
      lifetimeProblems: problems,
      totalCohortsCompleted: Math.floor(score / 400),
      totalPracticeArenaContests: 2,
    });
  }
  return stats;
}

// ─── Writing ────────────────────────────────────────────────────────────────

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

async function backUp(user) {
  const content = { student: user.email, savedAt: new Date().toISOString() };
  for (const [name, Model] of STORED) content[name] = await Model.collection.find({ userId: user._id }).toArray();
  content.profiles = await Profile.collection.find({ userId: user._id }).toArray();
  content.user = await User.collection.findOne({ _id: user._id }, { projection: { rankingInfo: 1, weeklyActivity: 1 } });
  const file = require("path").join(
    require("os").tmpdir(),
    `fresh-backup-${String(user.email).replace(/[^a-z0-9]+/gi, "_")}-${Date.now()}.json`
  );
  require("fs").writeFileSync(file, JSON.stringify(content, null, 2));
  return file;
}

async function apply(plan) {
  const userId = plan.user._id;
  const now = new Date();

  const deleted = {};
  for (const [name, Model] of STORED) deleted[name] = (await Model.collection.deleteMany({ userId })).deletedCount;

  const profileOps = Object.values(plan.byPlatform).map((profile) => ({
    updateOne: {
      filter: { _id: profile._id },
      update: {
        $set: {
          ...profileStats(plan, profile.platform),
          lastUpdateStatus: "success",
          lastUpdated: now,
          lastUpdateAttempt: now,
          lastUpdateError: null,
          lastErrorType: null,
          lastErrorAt: null,
          consecutiveFailures: 0,
          lastSyncSource: "system",
          updatedAt: now,
        },
      },
    },
  }));
  await Profile.collection.bulkWrite(profileOps, { ordered: true });

  const snapshots = prepare(PlatformSnapshot, plan.snapshotDocs, "00:10:00");
  const scores = prepare(ScoreHistory, plan.scoreDocs, "00:10:00");
  const heatmap = prepare(ActivityHeatmap, plan.heatmapDocs, "12:00:00");
  if (snapshots.length) await PlatformSnapshot.collection.insertMany(snapshots, { ordered: true });
  if (scores.length) await ScoreHistory.collection.insertMany(scores, { ordered: true });
  if (heatmap.length) await ActivityHeatmap.collection.insertMany(heatmap, { ordered: true });

  // User.rankingInfo, from the last two days (what a ranking run would copy there)
  const last = plan.daily[plan.daily.length - 1];
  const before = plan.daily[plan.daily.length - 2] || last;
  await User.collection.updateOne(
    { _id: userId },
    {
      $set: {
        "rankingInfo.overallRank": last.overall.rank,
        "rankingInfo.totalUsers": last.overall.of,
        "rankingInfo.percentile": percentileOf(last.overall),
        "rankingInfo.rankChange": before.overall.rank - last.overall.rank,
        "rankingInfo.departmentRank": last.department ? last.department.rank : null,
        "rankingInfo.departmentUsers": last.department ? last.department.of : 0,
        "rankingInfo.departmentRankChange": last.department && before.department ? before.department.rank - last.department.rank : 0,
        "rankingInfo.lastRankUpdate": now,
      },
    }
  );
  await updateWeeklyActivity([userId], plan.todayKey);

  return { deleted, written: { snapshots: snapshots.length, scores: scores.length, heatmapDays: heatmap.length, profiles: profileOps.length } };
}

// ─── Reporting ──────────────────────────────────────────────────────────────

function describe(plan) {
  console.log(`\nStudent: ${plan.user.name} <${plan.user.email}> (${plan.user.department || "no department"})`);
  console.log(`Period:  ${plan.startKey} to ${plan.todayKey} (${plan.allDays.length} days), ranked against ${plan.peers} other students`);
  console.log("\nNew numbers (start of the year -> today):");
  for (const [platform, entry] of Object.entries(plan.rated)) {
    const first = entry.states[0];
    const last = entry.states[entry.states.length - 1];
    const parts = [
      `solved ${first.solved} -> ${last.solved}`,
      last.ratingC > 0 ? `rating ${first.ratingC / 100} -> ${last.ratingC / 100}` : null,
      entry.spec.contest ? `contests ${first.contests} -> ${last.contests}` : null,
      `score ${money(entry.spec.score(scoreInput(first)))} -> ${money(entry.spec.score(scoreInput(last)))}`,
    ].filter(Boolean);
    console.log(`  ${platform.padEnd(15)} ${parts.join(" | ")}`);
  }
  if (plan.github) {
    const s = plan.github[0];
    const e = plan.github[plan.github.length - 1];
    console.log(`  ${"github".padEnd(15)} repos ${s.repos} -> ${e.repos} | stars ${s.stars} -> ${e.stars} | commits ${s.commits} -> ${e.commits}`);
  }
  if (plan.cohort) {
    console.log(`  ${"scopecodestats".padEnd(15)} score ${money(plan.cohort.scores[0])} -> ${money(plan.cohort.scores[plan.cohort.scores.length - 1])} (${plan.cohort.problems} cohort problems)`);
  }
  const first = plan.daily[0];
  const last = plan.daily[plan.daily.length - 1];
  const gains = plan.daily.slice(-15).map((day, i, list) => (i === 0 ? null : Math.round((day.totalScore - list[i - 1].totalScore) * 100) / 100)).slice(1);
  console.log(`\nPoints gained on each of the last ${gains.length} days: ${gains.join(", ")}`);
  console.log(`\nTotal score ${money(first.totalScore)} -> ${money(last.totalScore)}`);
  console.log(`Overall rank ${first.overall.rank}/${first.overall.of} -> ${last.overall.rank}/${last.overall.of}; best ${Math.min(...plan.daily.map((d) => d.overall.rank))}, worst ${Math.max(...plan.daily.map((d) => d.overall.rank))}`);
}

async function verify(user, days, todayKey) {
  console.log("\nRead back through the dashboard's own services:");
  for (const range of [30, 365].filter((value) => value <= Math.max(days, 30))) {
    const scores = await getScoreProgress(user._id, range);
    if (scores.state === "ok") {
      console.log(`  scores ${String(range).padStart(3)}d  ${scores.series.length} days, total ${money(scores.summary.totalScore)}, change ${money(scores.summary.scoreChange)}, rank ${scores.summary.overall.rank} of ${scores.summary.overall.of}`);
    } else {
      console.log(`  scores ${range}d  state ${scores.state}`);
    }
  }
  for (const platform of Object.keys(FRESH)) {
    const history = await progressService.getHistory(user._id, platform, 365);
    console.log(`  ${platform.padEnd(11)} state ${history.state}${history.series ? `, ${history.series.length} days, tracking since ${history.trackingSince}` : ""}`);
  }
  const updated = await User.findById(user._id).select("weeklyActivity rankingInfo").lean();
  console.log(`  weekly activity (7 days to ${todayKey}):`, JSON.stringify(updated.weeklyActivity));
  console.log("  rankingInfo:", JSON.stringify({ overallRank: updated.rankingInfo.overallRank, totalUsers: updated.rankingInfo.totalUsers, percentile: updated.rankingInfo.percentile }));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const daysArg = args.find((arg) => arg.startsWith("--days="));
  const days = daysArg ? Number(daysArg.split("=")[1]) : 365;
  const seedArg = args.find((arg) => arg.startsWith("--seed="));
  const seed = seedArg ? seedArg.split("=")[1] : "1";

  if (!email) throw new Error("Usage: node scripts/seedFreshHistory.js <email> [--days=365] [--seed=x] [--dry-run]");
  if (!Number.isInteger(days) || days < 30 || days > 730) throw new Error("--days must be a whole number from 30 to 730");
  if (process.env.NODE_ENV === "production" && !args.includes("--force")) {
    throw new Error("NODE_ENV is production. Sample data is for development; pass --force to continue.");
  }

  await connectDB();
  console.log(`Database: ${mongoose.connection.name} on ${mongoose.connection.host}`);
  await Promise.all([PlatformSnapshot.init(), ScoreHistory.init(), ActivityHeatmap.init()]);

  const matches = await User.find({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
    .select("name email department userType signupIntent")
    .lean();
  if (matches.length !== 1) throw new Error(`${matches.length} users have the email ${email}.`);
  const user = matches[0];

  // Everything is planned (read only) before anything is deleted
  const plan = await buildPlan(user, days, seed);
  describe(plan);
  console.log(
    `\nTo write: ${plan.snapshotDocs.length} snapshots, ${plan.scoreDocs.length} score documents, ${plan.heatmapDocs.length} heatmap days; ` +
      `${Object.keys(plan.byPlatform).length} profiles get new statistics`
  );
  console.log("To delete first:", JSON.stringify(await countStored(user._id)), "and the old statistics of every profile");

  if (dryRun) {
    console.log("Dry run: nothing was changed.");
    return;
  }

  const backupFile = await backUp(user);
  console.log(`Backup of everything replaced: ${backupFile}`);
  try {
    console.log("Done:", JSON.stringify(await apply(plan)));
  } catch (error) {
    console.error(`The run failed part way. The old documents are saved in ${backupFile}`);
    throw error;
  }
  await verify(user, days, plan.todayKey);
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
