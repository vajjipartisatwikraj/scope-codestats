/**
 * Recording scores and ranks (the write side of "Scores & ranks").
 *
 * `recordScoresAndRanks` is called when a profile sync run has finished (the nightly job,
 * and the admin's "run sync"), and by the admin's "recalculate ranks now". It:
 *
 *   1. loads the active students and their platform scores (Profile.score),
 *   2. ranks them (rankCalculator.js): overall, within the department, and on each platform,
 *   3. compares each student with their latest history document and writes a new one only
 *      where a score or a rank changed (the history is sparse, see models/ScoreHistory.js),
 *   4. copies the current ranks into User.rankingInfo, which the profile pages read,
 *   5. works out each student's last 7 days (consistency index and score change) from the
 *      history and saves it on User.weeklyActivity (services/weeklyActivity),
 *   6. saves a RankingRun with the counts.
 *
 * Running it again on the same day replaces that day's documents, so it is safe to repeat.
 * Only one run happens at a time in a process.
 */
const mongoose = require("mongoose");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const ScoreHistory = require("../../models/ScoreHistory");
const RankingRun = require("../../models/RankingRun");
const AcademicYearConfig = require("../../models/AcademicYearConfig");
const { SCORE_PLATFORMS, WRITE_BATCH_SIZE } = require("../../config/rankings");
const { HISTORY_TIMEZONE } = require("../../config/platformProgress");
const { dayKeyOf } = require("../../utils/dayKeys");
const { computeRanks, percentileOf } = require("./rankCalculator");
const { updateWeeklyActivity } = require("../weeklyActivity/weeklyActivityService");
const log = require("../../utils/logger").scope("RANKINGS");

let busy = false; // a run is in progress in this process

// ─── Who is ranked ──────────────────────────────────────────────────────────

/** Graduation years marked "Graduated" in the academic year config. */
async function getGraduatedYears() {
  try {
    const config = await AcademicYearConfig.getConfig();
    return config.yearMappings
      .filter((mapping) => mapping.academicYear === "Graduated")
      .map((mapping) => mapping.graduationYear);
  } catch (error) {
    log.warn("Could not load the academic year config for the graduated filter:", error.message);
    return [];
  }
}

/**
 * The students that are ranked: not admins or teachers, not people who signed in from the
 * teacher page and are waiting for approval, and not graduated.
 */
async function activeStudentFilter() {
  const filter = {
    userType: { $nin: ["admin", "teacher"] },
    signupIntent: { $ne: "teacher" },
  };
  const graduatedYears = await getGraduatedYears();
  if (graduatedYears.length > 0) {
    filter.$or = [{ graduatingYear: { $exists: false } }, { graduatingYear: { $nin: graduatedYears } }];
  }
  return filter;
}

/** Active students with their platform scores, ready for the rank calculator. */
async function loadStudents() {
  const users = await User.find(await activeStudentFilter()).select("_id department").lean();
  const byId = new Map(
    users.map((user) => [String(user._id), { userId: String(user._id), department: user.department || "", scores: {} }])
  );

  // Every platform profile is read once and the ones of students outside the ranking (admins,
  // teachers, graduated) are skipped below. A 20,000-id $in list would cost more than that.
  const cursor = Profile.find({ platform: { $in: SCORE_PLATFORMS } })
    .select("userId platform score")
    .lean()
    .cursor();
  for await (const profile of cursor) {
    const student = byId.get(String(profile.userId));
    if (student) student.scores[profile.platform] = profile.score || 0;
  }
  return [...byId.values()];
}

// ─── Comparing with the latest history ──────────────────────────────────────

/** The latest history document of every student (one index walk per student). */
async function loadLatestStates() {
  const rows = await ScoreHistory.aggregate(
    [{ $sort: { userId: 1, dateKey: -1 } }, { $group: { _id: "$userId", doc: { $first: "$$ROOT" } } }],
    { allowDiskUse: true }
  );
  return new Map(rows.map((row) => [String(row._id), row.doc]));
}

/**
 * For students whose latest document is already today's (a repeated run), the latest
 * document from before today: rank changes are measured against that, so a second run on
 * the same day does not erase the day's change. Few students have a document for today,
 * so one indexed lookup each, a chunk at a time, is cheap.
 */
async function loadPriorStates(userIds, dateKey) {
  const prior = new Map();
  const CHUNK = 100;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const rows = await Promise.all(
      userIds.slice(i, i + CHUNK).map((userId) =>
        ScoreHistory.findOne({ userId, dateKey: { $lt: dateKey } })
          .sort({ dateKey: -1 })
          .select("ranks.overall ranks.department")
          .lean()
      )
    );
    rows.forEach((row, index) => prior.set(userIds[i + index], row));
  }
  return prior;
}

const same = (a, b) => (a ?? null) === (b ?? null);

/** Whether a new reading adds anything to the latest stored one (`of` alone does not count). */
function isSameState(next, latest) {
  if (!latest) return false;
  if (!same(next.totalScore, latest.totalScore) || !same(next.department, latest.department || "")) return false;
  if (!same(next.ranks.overall?.rank, latest.ranks?.overall?.rank)) return false;
  if (!same(next.ranks.department?.rank, latest.ranks?.department?.rank)) return false;
  return SCORE_PLATFORMS.every(
    (platform) =>
      same(next.scores[platform], latest.scores?.[platform]) &&
      same(next.ranks.platforms[platform]?.rank, latest.ranks?.platforms?.[platform]?.rank)
  );
}

/** The document to store for one student. */
function toDocument(userId, dateKey, result) {
  const platforms = {};
  for (const platform of SCORE_PLATFORMS) {
    if (result.ranks.platforms[platform]) platforms[platform] = result.ranks.platforms[platform];
  }
  const ranks = { overall: result.ranks.overall, platforms };
  if (result.ranks.department) ranks.department = result.ranks.department;

  return {
    userId: new mongoose.Types.ObjectId(userId),
    dateKey,
    department: result.department,
    totalScore: result.totalScore,
    scores: result.scores,
    ranks,
  };
}

/** The part of User.rankingInfo that a ranking run fills. */
function toRankingInfo(result, latest, now) {
  const previousOverall = latest?.ranks?.overall?.rank;
  const previousDepartment = latest?.ranks?.department?.rank;
  const { overall, department } = result.ranks;
  return {
    "rankingInfo.overallRank": overall.rank,
    "rankingInfo.totalUsers": overall.of,
    "rankingInfo.percentile": percentileOf(overall),
    "rankingInfo.rankChange": previousOverall ? previousOverall - overall.rank : 0,
    "rankingInfo.departmentRank": department ? department.rank : null,
    "rankingInfo.departmentUsers": department ? department.of : 0,
    "rankingInfo.departmentRankChange": previousDepartment && department ? previousDepartment - department.rank : 0,
    "rankingInfo.lastRankUpdate": now,
  };
}

/**
 * Writes through the driver, not Mongoose: Mongoose casts every operation one by one, which
 * took about seven times longer than the writes themselves for 20,000 students. The values
 * written here are numbers, strings, dates and ObjectIds built by this service.
 */
async function writeInBatches(model, operations) {
  for (let i = 0; i < operations.length; i += WRITE_BATCH_SIZE) {
    await model.collection.bulkWrite(operations.slice(i, i + WRITE_BATCH_SIZE), { ordered: false });
  }
}

// ─── The run ────────────────────────────────────────────────────────────────

/**
 * Calculates scores and ranks for every active student and records the changes.
 *
 * @param {object} options
 * @param {"cron"|"admin"|"recompute"} options.source what started it
 * @param {{totalProfiles, updatedProfiles, failedProfiles}} [options.sync] the sync run it follows
 * @param {string} [options.triggeredBy] admin user id
 * @param {Date} [options.now]
 * @returns {Promise<object>} the saved RankingRun
 * @throws when another run is in progress, or the run fails (the failure is also saved)
 */
async function recordScoresAndRanks({ source, sync = {}, triggeredBy = null, now = new Date() }) {
  // Claimed before anything is awaited, so two calls can never both pass this check.
  if (busy) {
    const error = new Error("Scores and ranks are already being calculated.");
    error.code = "RANKING_IN_PROGRESS";
    throw error;
  }
  busy = true;

  let run = null;
  try {
    const dateKey = dayKeyOf(now, HISTORY_TIMEZONE);
    run = await RankingRun.create({
      dateKey,
      source,
      startedAt: now,
      triggeredBy,
      sync: {
        totalProfiles: sync.totalProfiles || 0,
        updatedProfiles: sync.updatedProfiles || 0,
        failedProfiles: sync.failedProfiles || 0,
      },
    });

    const students = await loadStudents();
    const results = computeRanks(students);
    const latest = await loadLatestStates();
    const prior = await loadPriorStates(
      [...latest.entries()].filter(([, doc]) => doc.dateKey === dateKey).map(([userId]) => userId),
      dateKey
    );

    const historyOps = [];
    const userOps = [];
    let unchanged = 0;
    for (const [userId, result] of results) {
      const previous = latest.get(userId);
      const document = toDocument(userId, dateKey, result);
      if (isSameState(document, previous)) {
        unchanged += 1;
      } else {
        historyOps.push({
          replaceOne: {
            filter: { userId: document.userId, dateKey },
            replacement: { ...document, createdAt: now, updatedAt: now },
            upsert: true,
          },
        });
      }
      userOps.push({
        updateOne: {
          filter: { _id: document.userId },
          update: { $set: toRankingInfo(result, previous && previous.dateKey === dateKey ? prior.get(userId) : previous, now) },
        },
      });
    }

    await writeInBatches(ScoreHistory, historyOps);
    await writeInBatches(User, userOps);
    // Today's readings are stored now, so the last 7 days can be worked out from them.
    await updateWeeklyActivity([...results.keys()], dateKey, now);

    const rankedByPlatform = {};
    for (const platform of SCORE_PLATFORMS) {
      rankedByPlatform[platform] = [...results.values()].filter((r) => r.ranks.platforms[platform]).length;
    }

    run.set({
      status: "completed",
      students: results.size,
      written: historyOps.length,
      unchanged,
      rankedByPlatform,
      finishedAt: new Date(),
      durationMs: Date.now() - now.getTime(),
    });
    await run.save();
    log.debug(`Ranked ${results.size} students, wrote ${historyOps.length}, unchanged ${unchanged}`);
    return run;
  } catch (error) {
    if (run) {
      run.set({ status: "failed", error: String(error.message).slice(0, 500), finishedAt: new Date() });
      await run.save().catch(() => {});
    }
    log.error("Scores and ranks could not be calculated:", error);
    throw error;
  } finally {
    busy = false;
  }
}

/** The platforms a score field belongs to; refuses anything else (it goes into a query). */
function assertScorePlatform(platform) {
  if (!SCORE_PLATFORMS.includes(platform)) throw new Error(`Unknown score platform: ${platform}`);
}

/**
 * Deletes one platform's scores and ranks from all of a student's history. Used when the
 * student changes or removes that platform's username. Total score and the overall and
 * department ranks stay.
 * @returns {Promise<number>} how many history documents were changed
 */
async function clearPlatformScoreHistory(userId, platform) {
  assertScorePlatform(platform);
  const scoreField = `scores.${platform}`;
  const rankField = `ranks.platforms.${platform}`;
  const { modifiedCount } = await ScoreHistory.updateMany(
    { userId, $or: [{ [scoreField]: { $exists: true } }, { [rankField]: { $exists: true } }] },
    { $unset: { [scoreField]: "", [rankField]: "" } }
  );
  if (modifiedCount) log.debug(`Cleared ${platform} score history in ${modifiedCount} document(s) for user ${userId}`);
  return modifiedCount || 0;
}

/** Whether a run is in progress in this process. */
const isRanking = () => busy;

/** The latest runs, newest first, and whether one is in progress. */
async function getStatus(limit = 10) {
  const runs = await RankingRun.find().sort({ startedAt: -1 }).limit(limit).lean();
  return { running: isRanking(), runs };
}

module.exports = {
  activeStudentFilter,
  recordScoresAndRanks,
  clearPlatformScoreHistory,
  isRanking,
  getStatus,
  // exported for tests
  isSameState,
  toDocument,
};
