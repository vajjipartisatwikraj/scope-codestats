
/**
 * Demo student with a busy activity heatmap, for screenshots of the dashboard.
 *
 * Usage:
 *   node scripts/seedDemoStudent.js           create Demo Student
 *   node scripts/seedDemoStudent.js --remove  delete Demo Student and heatmap
 *
 * Demo credentials:
 *   Email: demo.student@example.com
 *   Roll number: DEMO000001
 *
 * Database connection:
 *   Reads MONGODB_URI directly from .env
 */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const User = require("../models/User");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const Profile = require("../models/Profile");
// Deleting a user cascades to every model that references it (User.js), so all models must be registered.
for (const file of require("fs").readdirSync(require("path").join(__dirname, "../models"))) {
  if (file.endsWith(".js")) require(`../models/${file}`);
}

// A fictional student for landing-page screenshots (not a real person).
const NAME = "DHANUSH DHANUSH VARMA";
const EMAIL = "25r21a66g8@mlrit.ac.in";
const ROLL = "25R21A66G8";
const LEETCODE_USERNAME = "D_05_hanush";
const DAYS = 365;

// What the dashboard and leaderboard show for this demo student
const CODESTATS_QUESTIONS = 630; // problems solved on the Scope-CodeStats platform (the heatmap adds up to this)
const WEEKLY = { activeDays: 6, consistencyIndex: 5, scoreChange: 140 };
const RANKING = {
  overallRank: 18,
  departmentRank: 5,
  yearRank: 7,
  rankChange: 4,
  departmentRankChange: 1,
  totalUsers: 2400,
  departmentUsers: 520,
  percentile: 99.3,
};

// Reproducible random numbers
function mulberry32(seed) {
  let a = seed;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate one year of activity:
 * - Steady weekdays
 * - Lighter weekends
 * - A few quiet weeks
 * - A few high-activity weeks
 */
function buildDays(rng) {
  const rows = [];
  const today = new Date();

  for (let back = DAYS - 1; back >= 0; back--) {
    const { dateKey, dateUTC } =
      ActivityHeatmap.getISTDayInfo(
        new Date(today.getTime() - back * 86400000)
      );

    const weekday = dateUTC.getUTCDay();
    const week = Math.floor(back / 7);

    const quietWeek = week % 11 === 4;
    const burstWeek = week % 9 === 2;

    const growth =
      0.55 + 0.45 * ((DAYS - back) / DAYS);

    let chance =
      weekday === 0 || weekday === 6 ? 0.55 : 0.85;

    if (quietWeek) chance = 0.15;
    if (burstWeek) chance = 0.98;

    if (rng() > chance * (0.7 + 0.3 * growth)) {
      continue;
    }

    // Mostly 1-2 problems (lightest shade), some 3-5, rarely 6+ (darkest shades)
    let count = rng() < 0.4 ? 2 : 1;
    if (rng() < 0.14) count += 1 + Math.floor(rng() * 3);
    if (burstWeek && rng() < 0.08) count += 4 + Math.floor(rng() * 3);

    rows.push({
      userId: null,
      dateKey,
      date: dateUTC,
      count,
      sources: {
        cohort: count,
      },
    });
  }

  // Land exactly on CODESTATS_QUESTIONS by nudging random days (never below 1, never above 8)
  let total = rows.reduce((sum, row) => sum + row.count, 0);
  let guard = 100000;
  while (total !== CODESTATS_QUESTIONS && rows.length && guard-- > 0) {
    const row = rows[Math.floor(rng() * rows.length)];
    if (total > CODESTATS_QUESTIONS && row.count > 1) {
      row.count -= 1;
      total -= 1;
    } else if (total < CODESTATS_QUESTIONS && row.count < 8) {
      row.count += 1;
      total += 1;
    }
    row.sources.cohort = row.count;
  }
  if (total > CODESTATS_QUESTIONS) {
    // Too many active days for the target: drop random days
    while (total > CODESTATS_QUESTIONS) {
      const i = Math.floor(rng() * rows.length);
      total -= rows[i].count;
      rows.splice(i, 1);
      if (total < CODESTATS_QUESTIONS) {
        const row = rows[Math.floor(rng() * rows.length)];
        const add = CODESTATS_QUESTIONS - total;
        row.count += add;
        row.sources.cohort = row.count;
        total += add;
      }
    }
  }

  return rows;
}

// Remove demo student and associated heatmap
async function removeDemo() {
  const user = await User.findOne({
    email: EMAIL,
    rollNumber: ROLL,
  })
    .select("_id")
    .lean();

  if (!user) {
    console.log("No demo student found.");
    return;
  }

  const heat = await ActivityHeatmap.deleteMany({
    userId: user._id,
  });
  await Profile.deleteMany({ userId: user._id });

  await User.deleteOne({
    _id: user._id,
  });

  console.log(
    `Removed the demo student and ${heat.deletedCount} heatmap day(s).`
  );
}

// Create demo student and generate heatmap
async function createDemo() {
  const existingUser = await User.exists({
    $or: [
      { email: EMAIL },
      { rollNumber: ROLL },
    ],
  });

  if (existingUser) {
    throw new Error(
      "The demo student already exists. Run with --remove first to recreate it."
    );
  }

  const user = await User.create({
    name: NAME,
    email: EMAIL,
    rollNumber: ROLL,
    department: "CSE",
    section: "A",
    graduatingYear: new Date().getFullYear() + 2,
    userType: "user",
    signupIntent: "student",
    weeklyActivity: { ...WEEKLY, calculatedAt: new Date() },
    rankingInfo: { ...RANKING, lastRankUpdate: new Date() },
  });

  const rows = buildDays(
    mulberry32(20261101)
  ).map((row) => ({
    ...row,
    userId: user._id,
  }));

  await ActivityHeatmap.insertMany(rows);

  const total = rows.reduce(
    (sum, row) => sum + row.count,
    0
  );

  // Platform profiles: the leaderboard ranks by the sum of profile scores, so without
  // these the demo student sits at 0 at the bottom of the list.
  const now = new Date();
  const synced = { lastUpdateStatus: "success", lastUpdated: now, lastUpdateAttempt: now, lastSyncSource: "system" };
  await Profile.insertMany([
    {
      userId: user._id,
      platform: "leetcode",
      username: LEETCODE_USERNAME,
      problemsSolved: 420,
      easyProblemsSolved: 200,
      mediumProblemsSolved: 180,
      hardProblemsSolved: 40,
      rating: 1650,
      maxRating: 1680,
      contestsParticipated: 12,
      score: Math.round(420 * 5 + (1650 - 1400) ** 2 / 30 + 12 * 50),
      ...synced,
    },
    {
      userId: user._id,
      platform: "codeforces",
      username: LEETCODE_USERNAME,
      problemsSolved: 150,
      rating: 1250,
      maxRating: 1300,
      contestsParticipated: 8,
      score: Math.round(150 * 5 + (1250 - 1000) ** 2 / 30 + 8 * 50),
      ...synced,
    },
    {
      userId: user._id,
      platform: "scopecodestats",
      username: EMAIL,
      problemsSolved: total,
      totalCohortProblemsSolved: total,
      lifetimeProblems: total,
      score: total * 10,
      totalCohortScore: total * 10,
      lifetimeScore: total * 10,
      ...synced,
    },
  ]);

  console.log(
    `Created Demo Student (${EMAIL}), ${rows.length} active days, ${total} problems solved in the last ${DAYS} days.`
  );
}

// Main execution
(async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "MONGODB_URI is missing in environment variables."
    );
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(uri);

    console.log(
      `Database: ${mongoose.connection.name} on ${mongoose.connection.host}`
    );

    if (process.argv.includes("--remove")) {
      await removeDemo();
    } else {
      await createDemo();
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
})();
