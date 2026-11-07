/**
 * A complete sample student, SHIVA SAI S (23R25A0403), to check every dashboard component.
 *
 *   node scripts/seedShivaSai.js --dry-run         show the plan, change nothing
 *   node scripts/seedShivaSai.js                   create the student, or refresh the sample data
 *   node scripts/seedShivaSai.js --remove          delete the student and all of the data below
 *   node scripts/seedShivaSai.js --consistency=5   consistency index of the last 7 days (0-5, default 4)
 *   node scripts/seedShivaSai.js --seed=abc        another reproducible story
 *   node scripts/seedShivaSai.js --leetcode=name --codeforces=name --codechef=name \
 *                                --hackerrank=name --github=name      use your own accounts
 *   node scripts/seedShivaSai.js --overwrite       also replace data of an account this script did not create
 *   --force                                        allow a database whose name contains "prod" (or NODE_ENV=production)
 *
 * Login: sign in with Google as 23r25a0403@mlrit.ac.in. The account already exists, so the Google
 * account is linked to it (config/passport.js) and the profile setup is skipped.
 *
 * What is written (one year, ending today, IST):
 *   User             name, email, roll number, department, graduating year, education, skills, about,
 *                    public profile address, rankingInfo (overall / department / year rank) and
 *                    weeklyActivity (consistency index, active days, 7 day score change)
 *   Profile          LeetCode, Codeforces, CodeChef, HackerRank, GitHub and Scope-CodeStats with
 *                    scores, problems solved, ratings and contests. The score of each platform is the
 *                    real scraper formula applied to its numbers
 *   ActivityHeatmap  cohort problems solved per day, with days in every one of the four shades,
 *                    quiet weeks and holiday gaps. The days add up to the Scope-CodeStats problems
 *   PlatformSnapshot daily history of the four platforms that have charts (problems, difficulty
 *                    split, rating, contests)
 *   ScoreHistory     every platform score, the total score and the ranks (overall, department,
 *                    per platform) on the days they changed
 *
 * How the numbers fit together:
 *   - The year is simulated BACKWARDS from the end numbers in TARGETS below, so every platform ends
 *     exactly on them (the same method as seedUserHistory.js).
 *   - Ranks come from the real rank calculator against the OTHER students in the database (their
 *     score history, or their current profile scores). With few other students the ranks are small
 *     numbers: the script prints how many it ranked against.
 *   - The last 7 days are shaped so User.weeklyActivity ends on the chosen consistency index:
 *     on an "active" day a cohort problem is solved and the total score moves, on a quiet day
 *     nothing changes.
 *   - The default usernames are public accounts that exist, so the profile links open real pages.
 *     Their real statistics are NOT these numbers: the next profile sync of an account (nightly job,
 *     or the refresh button after its 6 hour cooldown) replaces the sample numbers with the real
 *     ones. Use the --leetcode=... style options to point at your own accounts.
 *
 * Safety:
 *   - Everything is planned (read only) before anything is written.
 *   - The student and every document written carry seedTag "shiva-sai-sample". Re-running refreshes
 *     only that data. If an account with this email or roll number exists without the tag and has
 *     platform data, the script stops unless --overwrite is given, and then saves a backup of the
 *     replaced documents to the temp folder first.
 *   - Refuses to run with NODE_ENV=production unless --force is given.
 *
 * Uses MONGODB_URI from backend/.env (or the environment).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
// Deleting a user cascades to every model that references it (User.js), so all models are registered.
for (const file of fs.readdirSync(path.join(__dirname, "../models"))) {
  if (file.endsWith(".js")) require(`../models/${file}`);
}
const Profile = require("../models/Profile");
const PlatformSnapshot = require("../models/PlatformSnapshot");
const ScoreHistory = require("../models/ScoreHistory");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const { HISTORY_TIMEZONE } = require("../config/platformProgress");
const { SCORE_PLATFORMS } = require("../config/rankings");
const { dayKeyOf, addDays, listDayKeys } = require("../utils/dayKeys");
const { computeRanks, rankEntries, percentileOf } = require("../services/rankings/rankCalculator");
const { activeStudentFilter, toDocument, isSameState } = require("../services/rankings/scoreHistoryService");
const { updateWeeklyActivity, weeklyActivityOf } = require("../services/weeklyActivity/weeklyActivityService");
const { getScoreProgress } = require("../services/rankings/scoreProgressService");
const progressService = require("../services/platformProgress/progressService");
const { uniqueUsername } = require("../services/newAccountService");
const { calculateGitHubScore } = require("../services/platformScraper/github");
const base = require("./seedUserHistory");

const { PLATFORMS, createRandom, hashSeed, planCalendar, planRated, scoreInput, metricsOf, prepare } = base;

const SEED_TAG = "shiva-sai-sample";
const DAYS = 365;

// ─── The student ────────────────────────────────────────────────────────────

// Department: the college address of this roll number (23R25A04..) has no entry in
// services/newAccountService.DEPARTMENT_CODES, so the app itself would give a new account "CSE".
// Change it here if it should be another department. Section is a sample value.
const STUDENT = {
  name: "SHIVA SAI S",
  email: "23r25a0403@mlrit.ac.in",
  rollNumber: "23R25A0403",
  department: "CSE",
  section: "A",
  graduatingYear: 2027, // 2000 + 23 + 4, as the app derives it from the roll number
  about:
    "Hi, I'm Shiva Sai, a fourth-year Computer Science student at MLR Institute of Technology (class of 2027). " +
    "I enjoy solving problems on LeetCode, Codeforces and CodeChef, and I take part in contests whenever I can. " +
    "Outside problem solving I build full-stack web apps with React, Node.js and MongoDB. " +
    "I'm looking for a software engineering internship where I can keep learning and ship real products.",
  education: [
    {
      level: "Engineering",
      name: "MLR Institute of Technology",
      startDate: "2023-08",
      endDate: "2027-05",
      scoreType: "CGPA",
      score: 8.4,
      stream: "CSE",
    },
  ],
  skills: [
    { name: "Languages", skills: ["C", "Python", "Java", "JavaScript"] },
    { name: "Web", skills: ["HTML", "CSS", "React", "Node.js", "MongoDB"] },
    { name: "Tools", skills: ["Git", "VS Code", "Postman"] },
  ],
  interests: ["Data Structures", "Competitive Programming", "Web Development"],
};

// ─── Platform accounts ──────────────────────────────────────────────────────

// Public accounts that exist (checked), so the profile links open. Override with --leetcode=... etc.
const DEFAULT_ACCOUNTS = {
  leetcode: "lee215",
  codeforces: "tourist",
  codechef: "gennady.korotkevich",
  hackerrank: "hackerrank",
  github: "octocat",
};

const PROFILE_URL = {
  leetcode: (u) => `https://leetcode.com/u/${u}`,
  codeforces: (u) => `https://codeforces.com/profile/${u}`,
  codechef: (u) => `https://www.codechef.com/users/${u}`,
  hackerrank: (u) => `https://www.hackerrank.com/profile/${u}`,
  github: (u) => `https://github.com/${u}`,
};

// ─── Where each platform ends today, and how busy its year was ──────────────

// `end` is the state today (`ratingC` is the rating in hundredths). `spec` overrides the per-month
// defaults of seedUserHistory.js for a whole year. The year is replayed backwards from `end`.
const TARGETS = {
  leetcode: {
    end: { solved: 312, easy: 128, medium: 154, hard: 30, contests: 14, ratingC: 168743 },
    spec: {
      mix: [0.4, 0.5, 0.1],
      hardCap: 26,
      solveChance: 0.75,
      maxSolved: 255,
      contest: { weekdays: [0], chance: 0.3, max: 14, step: [8, 45], solves: [1, 2] },
    },
    extra: { globalRank: 187342, contestRanking: 96418, contestBadge: "" },
  },
  codeforces: {
    end: { solved: 186, easy: 60, medium: 88, hard: 38, contests: 17, ratingC: 143200 },
    spec: {
      mix: [0.3, 0.5, 0.2],
      hardCap: 30,
      solveChance: 0.5,
      maxSolved: 140,
      contest: { weekdays: [0, 2, 4, 6], chance: 0.1, max: 17, step: [5, 70], solves: [1, 3] },
    },
    extra: { rank: "specialist", countryRank: 6120 },
  },
  codechef: {
    end: { solved: 94, easy: 0, medium: 0, hard: 0, contests: 11, ratingC: 163400 },
    spec: {
      solveChance: 0.3,
      maxSolved: 70,
      contest: { weekdays: [3], chance: 0.3, max: 11, step: [8, 55], solves: [1, 3] },
    },
    extra: { rank: "3★", globalRank: 48213 },
  },
  hackerrank: {
    end: { solved: 58, easy: 0, medium: 0, hard: 0, contests: 0, ratingC: 0 },
    spec: { solveChance: 0.3, minSolved: 20, maxSolved: 40, contest: null },
    extra: { badges: 5, certificates: 2 },
  },
};

const GITHUB_START = { repos: 8, stars: 3 };
const GITHUB_END = { repos: 14, stars: 9 };
const GITHUB_DETAILS = { totalCommits: 412, followers: 11, following: 23, contributionsLastYear: 287 };

const COHORT = { cohortsCompleted: 2, practiceArenaContests: 3, pointsPerProblem: [8, 24] };

// Active days in the last 7 that give each consistency index (services/weeklyActivity)
const ACTIVE_DAYS_FOR_INDEX = [0, 2, 3, 4, 5, 6];

const money = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// ─── Planning ───────────────────────────────────────────────────────────────

// Calendar months (01 = January) that shape the year. Quiet months have no activity on any platform,
// busy months are one step busier than a normal month, every other month is average.
// (The last 30 days are never quiet: the consistency index is worked out from the last 7, and today's
// month is November too.)
const QUIET_MONTHS = ["11", "12", "01", "02"];
const BUSY_MONTHS = ["04", "06", "07"];
const ONE_STEP_BUSIER = { off: "light", light: "normal", normal: "heavy", heavy: "heavy" };

const isBusyMonth = (key) => BUSY_MONTHS.includes(key.slice(5, 7));

/** The usual calendar plus four holiday / exam stretches of quiet days (none in the last 30 days), then the month rules. */
function yearCalendar(eventDays, random) {
  const levels = planCalendar(eventDays, random);
  for (let gap = 0; gap < 4; gap += 1) {
    const length = random.int(4, 9);
    const first = random.int(5, Math.max(6, eventDays.length - 30 - length));
    for (let i = 0; i < length; i += 1) levels.set(eventDays[first + i], "off");
  }
  const recent = new Set(eventDays.slice(-30));
  for (const key of eventDays) {
    const month = key.slice(5, 7);
    if (QUIET_MONTHS.includes(month) && !recent.has(key)) levels.set(key, "off");
    else if (BUSY_MONTHS.includes(month)) levels.set(key, ONE_STEP_BUSIER[levels.get(key)]);
  }
  return levels;
}

/** Takes the plan off the end numbers to find the start, then replays it forward day by day. */
function replay(name, anchor, plan, eventDays) {
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
    throw Object.assign(new Error(`Cannot rebuild ${name}: the year would start below zero (${JSON.stringify(start)}).`), {
      retry: true,
    });
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
    if (current[key] !== anchor[key]) {
      throw Object.assign(new Error(`${name} did not end on its target (${key}).`), { retry: true });
    }
  }
  return states;
}

/** Cohort problems per day (the heatmap) and the points each one earned (the Scope-CodeStats score). */
function planCohort(eventDays, calendar, random) {
  const plan = new Map();
  for (const key of eventDays) {
    const level = calendar.get(key);
    let count = 0;
    if (isBusyMonth(key)) {
      // A busy month: more active days and more problems on them
      if (level === "heavy" && random.chance(0.7)) count = random.int(1, 4);
      else if (level === "normal" && random.chance(0.45)) count = random.int(1, 2);
      else if (level === "light" && random.chance(0.25)) count = 1;
    } else if (level === "heavy" && random.chance(0.5)) count = random.int(1, 3);
    else if (level === "normal" && random.chance(0.3)) count = random.int(1, 2);
    else if (level === "light" && random.chance(0.12)) count = 1;
    plan.set(key, count);
  }

  // A few big days (in the busy months) so the two darkest shades (6-9 and 10+ problems) show up
  const bursty = eventDays.slice(0, -14).filter((key) => calendar.get(key) === "heavy" && isBusyMonth(key));
  const pick = (from, to) => {
    const key = bursty.splice(random.int(0, bursty.length - 1), 1)[0];
    plan.set(key, random.int(from, to));
  };
  if (bursty.length < 4) throw Object.assign(new Error("Not enough busy days for the heatmap."), { retry: true });
  for (let i = 0; i < 3; i += 1) pick(6, 9);
  pick(10, 12);
  return plan;
}

/** Points for a day with `count` problems. */
function pointsFor(count, random) {
  let points = 0;
  for (let i = 0; i < count; i += 1) points += random.int(COHORT.pointsPerProblem[0], COHORT.pointsPerProblem[1]);
  return points;
}

/** Builds the complete year. Throws an error with `retry: true` when this seed does not fit the targets. */
function simulate(seed, attempt, consistency) {
  const todayKey = dayKeyOf(new Date(), HISTORY_TIMEZONE);
  const startKey = addDays(todayKey, -(DAYS - 1));
  const allDays = listDayKeys(startKey, todayKey); // index 0 is the baseline day
  const eventDays = allDays.slice(1);

  const random = createRandom(hashSeed(`shiva-sai:${seed}:${attempt}`));
  const calendar = yearCalendar(eventDays, random);

  // The last 7 days decide the consistency index: which of them are active
  const lastWeek = eventDays.slice(-7);
  const activeCount = ACTIVE_DAYS_FOR_INDEX[consistency];
  const quietDays = new Set();
  const quietCandidates = lastWeek.slice(0, -1); // today stays active
  while (quietDays.size < 7 - activeCount) {
    quietDays.add(quietCandidates.length ? quietCandidates.splice(random.int(0, quietCandidates.length - 1), 1)[0] : lastWeek[6]);
  }

  // Platforms with problems, contests and ratings
  const rated = {};
  for (const platform of Object.keys(TARGETS)) {
    const spec = { ...PLATFORMS[platform], ...TARGETS[platform].spec };
    const plan = planRated(spec, TARGETS[platform].end, eventDays, calendar, random);
    for (const key of quietDays) plan.set(key, { easy: 0, medium: 0, hard: 0, other: 0, contest: 0, ratingC: 0 });
    // No contests in the last week: a rating drop would turn the 7 day score change negative
    for (const key of lastWeek) {
      const event = plan.get(key);
      if (event) plan.set(key, { ...event, contest: 0, ratingC: 0 });
    }
    rated[platform] = { spec, plan, states: replay(platform, TARGETS[platform].end, plan, eventDays) };
  }

  // GitHub: repositories and stars appear on a few days, never in the last two weeks
  const githubDays = eventDays.slice(0, -14);
  const days = (count) => new Set(Array.from({ length: count }, () => githubDays[random.int(0, githubDays.length - 1)]));
  const repoDays = days(GITHUB_END.repos - GITHUB_START.repos);
  const starDays = days(GITHUB_END.stars - GITHUB_START.stars);
  const github = [{ ...GITHUB_START }];
  for (const key of eventDays) {
    const last = github[github.length - 1];
    github.push({ repos: last.repos + (repoDays.has(key) ? 1 : 0), stars: last.stars + (starDays.has(key) ? 1 : 0) });
  }
  // Two days picked above can coincide (a Set), so top up to the exact end numbers
  const lastGithub = github[github.length - 1];
  lastGithub.repos = GITHUB_END.repos;
  lastGithub.stars = GITHUB_END.stars;

  // Scope-CodeStats: cohort problems. Quiet days have none, active days of the last week at least one.
  const cohortPlan = planCohort(eventDays, calendar, random);
  for (const key of lastWeek) {
    if (quietDays.has(key)) cohortPlan.set(key, 0);
    else cohortPlan.set(key, Math.min(Math.max(cohortPlan.get(key), 1), 4));
  }
  const cohort = { plan: new Map(), scores: [0], problems: 0 };
  for (const key of eventDays) {
    const count = cohortPlan.get(key);
    const points = pointsFor(count, random);
    cohort.plan.set(key, { count, points });
    cohort.scores.push(cohort.scores[cohort.scores.length - 1] + points);
    cohort.problems += count;
  }

  const scoreOf = (platform, index) => {
    if (rated[platform]) return rated[platform].spec.score(scoreInput(rated[platform].states[index]));
    if (platform === "github") return calculateGitHubScore({ publicRepos: github[index].repos, starsReceived: github[index].stars });
    return cohort.scores[index];
  };
  const scoresOn = (index) => Object.fromEntries(SCORE_PLATFORMS.map((platform) => [platform, scoreOf(platform, index)]));

  return { todayKey, startKey, allDays, eventDays, rated, github, cohort, scoresOn, quietDays };
}

/** The simulation, retried with another draw when one does not fit the end numbers. */
function simulateYear(seed, consistency) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return { ...simulate(seed, attempt, consistency), attempt };
    } catch (error) {
      if (!error.retry) throw error;
      lastError = error;
    }
  }
  throw new Error(`No draw fitted the targets in 40 tries (${lastError.message}). Try another --seed.`);
}

/** Ranks against the other students, day by day, then everything that is written. */
async function buildPlan({ userId, accounts, seed, consistency }) {
  const year = simulateYear(seed, consistency);
  const { todayKey, allDays, rated, github, cohort, scoresOn } = year;
  const userKey = String(userId);

  // Other students: their score history, or (never ranked yet) their current profile scores
  const pool = await User.find(await activeStudentFilter()).select("_id department graduatingYear").lean();
  const peers = pool.filter((person) => String(person._id) !== userKey);
  const peerIds = new Set(peers.map((peer) => String(peer._id)));

  const currentOf = new Map();
  const cursor = Profile.find({ platform: { $in: SCORE_PLATFORMS } }).select("userId platform score").lean().cursor();
  for await (const profile of cursor) {
    const key = String(profile.userId);
    if (!peerIds.has(key)) continue;
    if (!currentOf.has(key)) currentOf.set(key, {});
    currentOf.get(key)[profile.platform] = profile.score || 0;
  }

  const historyOf = new Map();
  const peerDocs = await ScoreHistory.find({ userId: { $in: peers.map((p) => p._id) }, dateKey: { $lte: todayKey } })
    .select("userId dateKey scores")
    .sort({ userId: 1, dateKey: 1 })
    .lean();
  for (const doc of peerDocs) {
    const key = String(doc.userId);
    if (!historyOf.has(key)) historyOf.set(key, []);
    historyOf.get(key).push(doc);
  }

  // Days are asked for in order, so each peer keeps a position in their history
  const positions = new Map();
  const peerScoresOn = (peerId, dateKey) => {
    const key = String(peerId);
    if (dateKey === todayKey && currentOf.has(key)) return currentOf.get(key);
    const docs = historyOf.get(key);
    if (!docs || docs.length === 0) return currentOf.get(key) || {};
    let position = positions.get(key);
    if (!position) {
      position = { next: 0, scores: docs[0].scores || {} };
      positions.set(key, position);
    }
    while (position.next < docs.length && docs[position.next].dateKey <= dateKey) {
      position.scores = docs[position.next].scores || {};
      position.next += 1;
    }
    return position.scores;
  };

  const scoreDocs = [];
  const daily = [];
  let previous = null;
  allDays.forEach((dateKey, index) => {
    const scores = scoresOn(index);
    const students = [
      { userId: userKey, department: STUDENT.department, scores },
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

  // Rank among the students of the same graduating year, today
  const total = (scores) => Object.values(scores || {}).reduce((sum, value) => sum + (Number(value) > 0 ? Number(value) : 0), 0);
  const sameYear = peers.filter((peer) => peer.graduatingYear === STUDENT.graduatingYear);
  const yearRanks = rankEntries([
    { key: userKey, score: daily[daily.length - 1].totalScore },
    ...sameYear.map((peer) => ({ key: String(peer._id), score: total(peerScoresOn(peer._id, todayKey)) })),
  ]);

  const snapshotDocs = [];
  for (const [platform, entry] of Object.entries(rated)) {
    const username = accounts[platform];
    const usernameKey = username.trim().toLowerCase();
    let last = null;
    entry.states.forEach((state, index) => {
      const metrics = metricsOf(state);
      if (last && Object.keys(metrics).every((metric) => metrics[metric] === last[metric])) return;
      last = metrics;
      snapshotDocs.push({ userId, platform, dateKey: allDays[index], username, usernameKey, ...metrics });
    });
  }

  const heatmapDocs = [];
  for (const [dateKey, { count }] of cohort.plan) {
    if (count > 0) {
      heatmapDocs.push({ userId, dateKey, date: new Date(`${dateKey}T00:00:00.000Z`), count, sources: { cohort: count } });
    }
  }

  return {
    ...year,
    userId,
    accounts,
    consistency,
    scoreDocs,
    snapshotDocs,
    heatmapDocs,
    daily,
    peers: peers.length,
    yearRank: { ...yearRanks.get(userKey), users: sameYear.length + 1 },
  };
}

// ─── The Profile documents ──────────────────────────────────────────────────

/** Bookkeeping of a successful sync, `minutesAgo` minutes ago. */
function syncedAt(minutesAgo) {
  const when = new Date(Date.now() - minutesAgo * 60 * 1000);
  return {
    lastUpdateStatus: "success",
    lastUpdated: when,
    lastUpdateAttempt: when,
    lastUpdateError: null,
    lastErrorType: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
    updateAttempts: 6,
    lastSyncSource: "system",
  };
}

function buildProfiles(plan) {
  const last = plan.allDays.length - 1;
  const profiles = [];

  // LeetCode was refreshed 20 minutes ago, so its refresh button shows the cooldown; the others can be refreshed.
  const sync = { leetcode: 20, codeforces: 540, codechef: 560, hackerrank: 580, github: 600, scopecodestats: 620 };

  for (const [platform, entry] of Object.entries(plan.rated)) {
    const end = entry.states[last];
    profiles.push({
      userId: plan.userId,
      platform,
      username: plan.accounts[platform],
      score: entry.spec.score(scoreInput(end)),
      problemsSolved: end.solved,
      easyProblemsSolved: end.easy,
      mediumProblemsSolved: end.medium,
      hardProblemsSolved: end.hard,
      rating: end.ratingC / 100,
      maxRating: Math.max(...entry.states.map((state) => state.ratingC)) / 100,
      contestsParticipated: end.contests,
      ...TARGETS[platform].extra,
      ...syncedAt(sync[platform]),
    });
  }

  const end = plan.github[last];
  profiles.push({
    userId: plan.userId,
    platform: "github",
    username: plan.accounts.github,
    score: calculateGitHubScore({ publicRepos: end.repos, starsReceived: end.stars }),
    details: { publicRepos: end.repos, starsReceived: end.stars, ...GITHUB_DETAILS },
    ...syncedAt(sync.github),
  });

  const problems = plan.cohort.problems;
  const score = plan.cohort.scores[last];
  profiles.push({
    userId: plan.userId,
    platform: "scopecodestats",
    username: STUDENT.email,
    score,
    problemsSolved: problems,
    totalCohortProblemsSolved: problems,
    totalCohortScore: score,
    lifetimeProblems: problems,
    lifetimeScore: score,
    totalCohortsCompleted: COHORT.cohortsCompleted,
    totalPracticeArenaContests: COHORT.practiceArenaContests,
    ...syncedAt(sync.scopecodestats),
  });
  return profiles;
}

// ─── Reading and writing ────────────────────────────────────────────────────

const STORED = [
  ["profiles", Profile],
  ["snapshots", PlatformSnapshot],
  ["scores", ScoreHistory],
  ["heatmapDays", ActivityHeatmap],
];

async function countStored(userId) {
  const counts = {};
  for (const [name, Model] of STORED) counts[name] = await Model.collection.countDocuments({ userId });
  return counts;
}

async function deleteStored(userId) {
  const deleted = {};
  for (const [name, Model] of STORED) deleted[name] = (await Model.collection.deleteMany({ userId })).deletedCount;
  return deleted;
}

async function backUp(user) {
  const content = { student: user.email, savedAt: new Date().toISOString() };
  for (const [name, Model] of STORED) content[name] = await Model.collection.find({ userId: user._id }).toArray();
  content.user = await User.collection.findOne({ _id: user._id }, { projection: { rankingInfo: 1, weeklyActivity: 1 } });
  const file = path.join(os.tmpdir(), `shiva-sai-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
  return file;
}

/** The existing account for this email or roll number, if there is exactly one. */
async function findExisting() {
  const matches = await User.find({
    $or: [{ email: STUDENT.email }, { rollNumber: new RegExp(`^${STUDENT.rollNumber}$`, "i") }],
  });
  if (matches.length > 1) {
    throw new Error(
      `The email ${STUDENT.email} and the roll number ${STUDENT.rollNumber} belong to different accounts ` +
        `(${matches.map((u) => u.email).join(", ")}). Resolve that first.`
    );
  }
  if (!matches.length) return null;
  const tag = (await User.collection.findOne({ _id: matches[0]._id }, { projection: { seedTag: 1 } })).seedTag;
  return { user: matches[0], seeded: tag === SEED_TAG };
}

async function saveStudent(existing, userId) {
  const fields = {
    name: STUDENT.name,
    rollNumber: STUDENT.rollNumber,
    department: STUDENT.department,
    section: STUDENT.section,
    graduatingYear: STUDENT.graduatingYear,
    about: STUDENT.about,
    education: STUDENT.education,
    skills: STUDENT.skills,
    interests: STUDENT.interests,
    userType: "user",
    signupIntent: "student",
    newUser: false,
    profileCompleted: true,
  };
  let user;
  if (existing) {
    user = existing.user;
    user.set(fields);
    // An older account without a stored username keeps using the part of its email before the "@"
    await user.save();
  } else {
    user = await User.create({ _id: userId, email: STUDENT.email, username: await uniqueUsername(STUDENT.email), ...fields });
  }
  // seedTag is not part of the schema, so it goes through the driver
  await User.collection.updateOne({ _id: user._id }, { $set: { seedTag: SEED_TAG } });
  return user;
}

async function write(plan, existing) {
  const userId = plan.userId;
  const user = await saveStudent(existing, userId);

  const profiles = buildProfiles(plan);
  await Profile.insertMany(profiles);
  await Profile.collection.updateMany({ userId }, { $set: { seedTag: SEED_TAG } });

  const snapshots = prepare(PlatformSnapshot, plan.snapshotDocs, "00:10:00");
  const scores = prepare(ScoreHistory, plan.scoreDocs, "00:10:00");
  const heatmap = prepare(ActivityHeatmap, plan.heatmapDocs, "12:00:00");
  if (snapshots.length) await PlatformSnapshot.collection.insertMany(snapshots, { ordered: true });
  if (scores.length) await ScoreHistory.collection.insertMany(scores, { ordered: true });
  if (heatmap.length) await ActivityHeatmap.collection.insertMany(heatmap, { ordered: true });

  // User.rankingInfo, from the last two days (what a ranking run copies there)
  const now = new Date();
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
        "rankingInfo.departmentRankChange":
          last.department && before.department ? before.department.rank - last.department.rank : 0,
        "rankingInfo.yearRank": plan.yearRank.rank,
        "rankingInfo.lastRankUpdate": now,
        lastActive: now,
      },
    }
  );
  // The consistency index and the 7 day score change, from the history that now exists
  await updateWeeklyActivity([userId], plan.todayKey);

  return {
    user: user.email,
    profiles: profiles.length,
    snapshots: snapshots.length,
    scores: scores.length,
    heatmapDays: heatmap.length,
  };
}

// ─── Reporting ──────────────────────────────────────────────────────────────

function describe(plan) {
  const last = plan.allDays.length - 1;
  console.log(`\nStudent: ${STUDENT.name} <${STUDENT.email}> roll ${STUDENT.rollNumber}, ${STUDENT.department}, batch ${STUDENT.graduatingYear}`);
  console.log(`Period:  ${plan.startKey} to ${plan.todayKey} (${plan.allDays.length} days), draw ${plan.attempt}, ranked against ${plan.peers} other active students`);

  console.log("\nPlatforms (start of the year -> today):");
  for (const [platform, entry] of Object.entries(plan.rated)) {
    const first = entry.states[0];
    const end = entry.states[last];
    const parts = [
      `solved ${first.solved} -> ${end.solved}`,
      end.ratingC > 0 ? `rating ${first.ratingC / 100} -> ${end.ratingC / 100}` : null,
      entry.spec.contest ? `contests ${first.contests} -> ${end.contests}` : null,
      `score ${money(entry.spec.score(scoreInput(first)))} -> ${money(entry.spec.score(scoreInput(end)))}`,
    ].filter(Boolean);
    console.log(`  ${platform.padEnd(15)} ${parts.join(" | ")}`);
    console.log(`  ${"".padEnd(15)} ${PROFILE_URL[platform](plan.accounts[platform])}`);
  }
  const gh = plan.github;
  console.log(`  ${"github".padEnd(15)} repos ${gh[0].repos} -> ${gh[last].repos} | stars ${gh[0].stars} -> ${gh[last].stars} | score ${money(calculateGitHubScore({ publicRepos: gh[last].repos, starsReceived: gh[last].stars }))}`);
  console.log(`  ${"".padEnd(15)} ${PROFILE_URL.github(plan.accounts.github)}`);
  console.log(`  ${"scopecodestats".padEnd(15)} ${plan.cohort.problems} cohort problems | score ${money(plan.cohort.scores[last])}`);

  const first = plan.daily[0];
  const end = plan.daily[last];
  console.log(`\nTotal score ${money(first.totalScore)} -> ${money(end.totalScore)}`);
  console.log(
    `Rank today: overall ${end.overall.rank} of ${end.overall.of}` +
      (end.department ? `, ${STUDENT.department} ${end.department.rank} of ${end.department.of}` : "") +
      `, batch ${plan.yearRank.rank} of ${plan.yearRank.users}`
  );

  const window = plan.daily.slice(-8);
  const weekly = weeklyActivityOf({
    before: window[0].totalScore,
    readings: window.slice(1).map((day) => ({ dateKey: day.dateKey, totalScore: day.totalScore })),
  });
  console.log(`Last 7 days: ${weekly.activeDays} active days -> consistency index ${weekly.consistencyIndex}/5, score change ${money(weekly.scoreChange)}`);

  const shades = [0, 0, 0, 0, 0];
  for (const doc of plan.heatmapDocs) shades[ActivityHeatmap.levelForCount(doc.count)] += 1;
  console.log(`Heatmap: ${plan.heatmapDocs.length} active days; shade 1: ${shades[1]}, 2: ${shades[2]}, 3: ${shades[3]}, 4: ${shades[4]}`);
  console.log(`\nTo write: 6 profiles, ${plan.snapshotDocs.length} snapshots, ${plan.scoreDocs.length} score documents, ${plan.heatmapDocs.length} heatmap days`);
}

async function verify(userId, todayKey) {
  console.log("\nRead back through the dashboard's own services:");
  for (const range of [30, 365]) {
    const scores = await getScoreProgress(userId, range);
    if (scores.state === "ok") {
      const { summary } = scores;
      console.log(`  scores ${String(range).padStart(3)}d  ${scores.series.length} days, total ${money(summary.totalScore)}, change ${money(summary.scoreChange)}, rank ${summary.overall.rank} of ${summary.overall.of}`);
    } else {
      console.log(`  scores ${range}d  state ${scores.state}`);
    }
  }
  for (const platform of Object.keys(TARGETS)) {
    const history = await progressService.getHistory(userId, platform, 365);
    console.log(`  ${platform.padEnd(11)} state ${history.state}${history.series ? `, ${history.series.length} days, tracking since ${history.trackingSince}` : ""}`);
  }
  const heat = await ActivityHeatmap.getHeatmap(userId, 365);
  console.log(`  heatmap     ${heat.activeDays} active days, ${heat.totalCount} problems`);
  const user = await User.findById(userId).select("weeklyActivity rankingInfo username").lean();
  console.log(`  weekly activity (7 days to ${todayKey}):`, JSON.stringify(user.weeklyActivity));
  console.log("  rankingInfo:", JSON.stringify(user.rankingInfo));
  console.log(`  public profile: /public-profile/${user.username || STUDENT.email.split("@")[0]}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const option = (args, name) => {
  const found = args.find((arg) => arg.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3).trim() : "";
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const remove = args.includes("--remove");
  const overwrite = args.includes("--overwrite");
  const seed = option(args, "seed") || "1";

  const consistency = option(args, "consistency") === "" ? 4 : Number(option(args, "consistency"));
  if (!Number.isInteger(consistency) || consistency < 0 || consistency > 5) throw new Error("--consistency must be a whole number from 0 to 5");

  const accounts = { ...DEFAULT_ACCOUNTS };
  for (const platform of Object.keys(DEFAULT_ACCOUNTS)) {
    const value = option(args, platform);
    if (value) accounts[platform] = value;
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(accounts[platform])) throw new Error(`Invalid ${platform} username: ${accounts[platform]}`);
  }

  if (process.env.NODE_ENV === "production" && !args.includes("--force")) {
    throw new Error("NODE_ENV is production. Sample data is for development; pass --force to continue.");
  }

  await connectDB();
  console.log(`Database: ${mongoose.connection.name} on ${mongoose.connection.host}`);
  if (!dryRun && /prod/i.test(mongoose.connection.name) && !args.includes("--force")) {
    throw new Error(
      `The database "${mongoose.connection.name}" looks like production. Point MONGODB_URI at a development ` +
        "database, or pass --force if writing sample data here is really intended."
    );
  }
  await Promise.all([PlatformSnapshot.init(), ScoreHistory.init(), ActivityHeatmap.init(), Profile.init()]);

  const existing = await findExisting();
  if (existing && !existing.seeded) {
    const stored = await countStored(existing.user._id);
    const hasData = Object.values(stored).some((count) => count > 0);
    if (hasData && !overwrite) {
      throw new Error(
        `${STUDENT.email} already exists and was not created by this script; it has ${JSON.stringify(stored)}. ` +
          "Nothing was changed. Pass --overwrite to replace that data (a backup is saved first)."
      );
    }
    if (remove && !overwrite) throw new Error("This account was not created by this script. Pass --overwrite to delete it.");
  }

  if (remove) {
    if (!existing) {
      console.log("No such student, nothing to remove.");
      return;
    }
    if (dryRun) {
      console.log("Dry run: would delete", STUDENT.email, "and", JSON.stringify(await countStored(existing.user._id)));
      return;
    }
    const backupFile = existing.seeded ? null : await backUp(existing.user);
    if (backupFile) console.log(`Backup: ${backupFile}`);
    await User.findOneAndDelete({ _id: existing.user._id }); // cascades to every related collection
    console.log(`Removed ${STUDENT.email} and all of the data that belonged to it.`);
    return;
  }

  const userId = existing ? existing.user._id : new mongoose.Types.ObjectId();
  const plan = await buildPlan({ userId, accounts, seed, consistency });
  describe(plan);

  if (existing) console.log("\nTo replace first:", JSON.stringify(await countStored(userId)));
  if (dryRun) {
    console.log("\nDry run: nothing was written or deleted.");
    return;
  }

  let backupFile = null;
  if (existing) {
    const stored = await countStored(userId);
    if (Object.values(stored).some((count) => count > 0)) {
      backupFile = await backUp(existing.user);
      console.log(`Backup of the replaced documents: ${backupFile}`);
    }
    await deleteStored(userId);
  }

  try {
    console.log("\nWritten:", JSON.stringify(await write(plan, existing)));
  } catch (error) {
    await deleteStored(userId).catch(() => {});
    if (!existing) await User.findOneAndDelete({ _id: userId }).catch(() => {});
    if (backupFile) console.error(`The run failed after the old documents were deleted. They are saved in ${backupFile}`);
    throw error;
  }
  await verify(userId, plan.todayKey);
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
