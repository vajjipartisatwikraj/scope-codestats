/**
 * Suspending the coding accounts of a student (admin page "Suspend accounts").
 *
 * Suspending removes everything the platform holds about the student's coding accounts, so they
 * start again from nothing:
 *
 *   Profile            the linked LeetCode, Codeforces, CodeChef, HackerRank, GitHub and
 *                      Scope-CodeStats profiles (usernames, scores, problems solved, ratings)
 *   PlatformSnapshot   the daily history of problems, ratings and contests
 *   ScoreHistory       the stored scores and ranks over time
 *   ActivityHeatmap    the coding heatmap (cohort days)
 *   PlatformDailyActivity  the days of the heatmap that came from external platforms
 *   User               rankingInfo and weeklyActivity (rank, percentile, consistency index) are reset
 *
 * The student's account (name, email, roll number, department, profile details) and their
 * coursework (cohort enrolments and progress, practice arena, speech tests, resumes) are NOT
 * touched, and the student can still sign in.
 *
 * One platform at a time: suspendPlatform removes a single linked platform (for example LeetCode) with
 * its stored history, and leaves the other platforms and everything else as they are.
 *
 * Both can tell the student by email (`notify`, on by default): what was removed, what was not, what
 * happens next and who to write to. The email is recorded in the emails history. A failed email never
 * undoes a removal: the answer carries the email's status and the admin sees it in the history.
 *
 * Deleting is permanent. Nothing here can bring the data back.
 */
const mongoose = require("mongoose");
const User = require("../models/User");
const Profile = require("../models/Profile");
const PlatformSnapshot = require("../models/PlatformSnapshot");
const ScoreHistory = require("../models/ScoreHistory");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const PlatformDailyActivity = require("../models/PlatformDailyActivity");
const escapeRegex = require("../utils/escapeRegex");
const { ServiceError } = require("../utils/ServiceError");
const profileSyncService = require("./profileSyncService");
const { buildAccountRemovalEmail } = require("./emails/accountRemovalEmail");
const { sendTracked } = require("./emails/emailService");
const log = require("../utils/logger").scope("ACCOUNT-SUSPENSION");

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 25;
const MAX_SEARCH_LENGTH = 80;

const USER_FIELDS = "name email rollNumber userType department graduatingYear profilePicture";

/** What User.rankingInfo and User.weeklyActivity hold for a student who has never been ranked. */
const EMPTY_RANKING_INFO = {
  overallRank: null,
  departmentRank: null,
  yearRank: null,
  lastRankUpdate: null,
  rankChange: 0,
  departmentRankChange: 0,
  totalUsers: 0,
  departmentUsers: 0,
  percentile: 0,
};
const EMPTY_WEEKLY_ACTIVITY = { activeDays: 0, consistencyIndex: 0, scoreChange: 0, calculatedAt: null };

const toClientProfile = (profile) => ({
  platform: profile.platform,
  username: profile.username,
  score: profile.score || 0,
  problemsSolved: profile.problemsSolved || 0,
});

function assertUserId(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new ServiceError(400, "That is not a valid account id");
}

/**
 * Accounts for the page, a page at a time.
 *
 * @param {object} options
 * @param {string} [options.search]  matched (literally, any case) against name, email, roll number and department
 * @param {boolean} [options.linkedOnly]  only accounts that have at least one coding profile
 * @param {number} [options.page]  1-based
 * @param {number} [options.limit]
 * @returns {Promise<{accounts: Array, total: number, page: number, limit: number}>}
 */
async function listAccounts({ search = "", linkedOnly = false, page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit, 10) || DEFAULT_PAGE_SIZE));

  const filter = {};
  const term = String(search || "").trim().slice(0, MAX_SEARCH_LENGTH);
  if (term) {
    const pattern = new RegExp(escapeRegex(term), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { rollNumber: pattern }, { department: pattern }];
  }
  if (linkedOnly) {
    filter._id = { $in: await Profile.distinct("userId") };
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(USER_FIELDS)
      .sort({ name: 1, _id: 1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);

  const profiles = users.length
    ? await Profile.find({ userId: { $in: users.map((user) => user._id) } })
        .select("userId platform username score problemsSolved")
        .lean()
    : [];
  const byUser = new Map();
  for (const profile of profiles) {
    const key = String(profile.userId);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(toClientProfile(profile));
  }

  return {
    accounts: users.map((user) => ({ ...user, profiles: byUser.get(String(user._id)) || [] })),
    total,
    page: pageNumber,
    limit: pageSize,
  };
}

/** How much is stored about one account's coding data. */
async function countStored(userId) {
  const [profiles, snapshots, scoreHistory, cohortDays, platformDays] = await Promise.all([
    Profile.find({ userId }).select("platform username score problemsSolved").lean(),
    PlatformSnapshot.countDocuments({ userId }),
    ScoreHistory.countDocuments({ userId }),
    ActivityHeatmap.countDocuments({ userId }),
    PlatformDailyActivity.countDocuments({ userId }),
  ]);
  return {
    profiles: profiles.map(toClientProfile),
    counts: { profiles: profiles.length, snapshots, scoreHistory, heatmapDays: cohortDays + platformDays },
  };
}

/** What suspending this account would delete, for the confirmation. */
async function previewSuspension(userId) {
  assertUserId(userId);
  const user = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user) throw new ServiceError(404, "Account not found");
  return { user, ...(await countStored(user._id)) };
}

/**
 * Emails the student about a removal and gives back how it went: { status, id, to, error }. It never
 * throws, because the removal has already happened.
 */
async function notifyStudent({ user, adminId, type, scope, platforms, deleted }) {
  try {
    return await sendTracked({
      type,
      user,
      triggeredBy: adminId,
      details: { scope, platforms, deleted },
      build: (reference) => buildAccountRemovalEmail({ user, scope, platforms, deleted, reference }),
    });
  } catch (err) {
    log.error("Could not record or send the removal email:", err);
    return { status: "failed", id: null, to: user.email, error: "The email could not be prepared" };
  }
}

/**
 * Deletes the coding profiles and every stored history of the account, and resets its rank and
 * consistency index.
 *
 * @param {string} userId  the account to suspend
 * @param {string} adminId  who asked (for the log)
 * @param {{notify?: boolean}} [options]  notify: email the student about it (default true)
 * @returns {Promise<{deleted: {profiles, snapshots, scoreHistory, heatmapDays}, email: object|null}>}
 */
async function suspendAccount(userId, adminId, { notify = true } = {}) {
  assertUserId(userId);
  const user = await User.findById(userId).select("_id name email").lean();
  if (!user) throw new ServiceError(404, "Account not found");
  // Read before they are deleted: the email lists what was removed
  const removedProfiles = await Profile.find({ userId: user._id }).select("platform username").lean();

  const [profiles, snapshots, scores, heatmap, platformDays] = await Promise.all([
    Profile.deleteMany({ userId: user._id }),
    PlatformSnapshot.deleteMany({ userId: user._id }),
    ScoreHistory.deleteMany({ userId: user._id }),
    ActivityHeatmap.deleteMany({ userId: user._id }),
    PlatformDailyActivity.deleteMany({ userId: user._id }),
  ]);

  await User.updateOne(
    { _id: user._id },
    { $set: { rankingInfo: EMPTY_RANKING_INFO, weeklyActivity: EMPTY_WEEKLY_ACTIVITY } }
  );

  const deleted = {
    profiles: profiles.deletedCount,
    snapshots: snapshots.deletedCount,
    scoreHistory: scores.deletedCount,
    heatmapDays: heatmap.deletedCount + platformDays.deletedCount,
  };
  // Ids only, never emails: this is a security event
  log.info(
    `coding accounts of ${user._id} suspended by ${adminId} | profiles=${deleted.profiles} snapshots=${deleted.snapshots} ` +
      `scores=${deleted.scoreHistory} heatmapDays=${deleted.heatmapDays}`
  );
  const email = notify
    ? await notifyStudent({
        user,
        adminId,
        type: "account_removed",
        scope: "account",
        platforms: removedProfiles.map((profile) => ({ key: profile.platform, username: profile.username })),
        deleted,
      })
    : null;
  return { deleted, email };
}

/**
 * Removes one linked platform of the account: the username and its stats, the platform's daily
 * progress, its score and rank history and its days of the activity heatmap (the same removal a
 * student does when they unlink a platform, without the student's waiting time). The other
 * platforms are untouched. The account's total score and rank are worked out again at the next
 * ranking run.
 *
 * @param {string} userId  the account
 * @param {string} platform  one of the platforms the account has linked (for example "leetcode")
 * @param {string} adminId  who asked (for the log)
 * @param {{notify?: boolean}} [options]  notify: email the student about it (default true)
 * @returns {Promise<{platform: string, deleted: {snapshots: number, scoreHistory: number}, email: object|null}>}
 */
async function suspendPlatform(userId, platform, adminId, { notify = true } = {}) {
  assertUserId(userId);
  if (!Profile.PLATFORMS.includes(platform)) throw new ServiceError(400, "That is not a coding platform");
  const user = await User.findById(userId).select("_id name email").lean();
  if (!user) throw new ServiceError(404, "Account not found");
  const linked = await Profile.findOne({ userId: user._id, platform }).select("username").lean();
  if (!linked) throw new ServiceError(404, "This platform is not linked to the account");

  const { historyDeleted, scoreHistoryCleared } = await profileSyncService.removePlatform(user._id, platform);
  log.info(`${platform} of ${user._id} removed by ${adminId} | snapshots=${historyDeleted} scores=${scoreHistoryCleared}`);
  const deleted = { snapshots: historyDeleted, scoreHistory: scoreHistoryCleared };
  const email = notify
    ? await notifyStudent({ user, adminId, type: "platform_removed", scope: "platform", platforms: [{ key: platform, username: linked.username }], deleted })
    : null;
  return { platform, deleted, email };
}

module.exports = { listAccounts, previewSuspension, suspendAccount, suspendPlatform };
