/**
 * Reads and shapes a user's profile for the profile pages.
 *
 * It holds the data access and the response shapes, so controllers/userController
 * only deals with the request and the response:
 *  - findUserByUsername / findUsersByScore: the queries
 *  - loadCodingProfiles / loadAchievements: the parts that live in other collections
 *  - buildDetailedProfile: the full view (the signed-in user's own account)
 *  - buildPublicProfile: the public profile page (only fields meant for anyone)
 */
const User = require("../models/User");
const Achievement = require("../models/Achievement");
const Profile = require("../models/Profile");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const { normalizeSkillSets } = require("../utils/skillSets");
const { normalizeEducation } = require("../utils/education");
const escapeRegex = require("../utils/escapeRegex");

// ─── Queries ────────────────────────────────────────────────────────────────

const MAX_LIST_SIZE = 1000;

const SCORE_LIST_FIELDS = {
  name: 1,
  email: 1,
  rollNumber: 1,
  department: 1,
  section: 1,
  graduatingYear: 1,
  profilePicture: 1,
  totalScore: 1,
};

/** Users ranked by the total score of their Profile documents, best first. */
const findUsersByScore = (match, limit) =>
  User.aggregate([
    { $match: match },
    ...Profile.totalsLookupStages(),
    { $sort: { totalScore: -1 } },
    { $limit: Math.min(parseInt(limit, 10) || MAX_LIST_SIZE, MAX_LIST_SIZE) },
    { $project: SCORE_LIST_FIELDS },
  ]);

/**
 * The username is the part of the email before the "@". It comes from the URL,
 * so it is escaped and matched literally.
 */
const findUserByUsername = (username, select) =>
  User.findOne({ email: new RegExp(`^${escapeRegex(username)}@`, "i") })
    .select(select)
    .lean();

// Fields no page needs. The unauthenticated profile route leaves them out.
const PRIVATE_USER_FIELDS = "-password -sessionToken -pushSubscriptions";

// Fields of an achievement shown on the public profile page.
const PUBLIC_ACHIEVEMENT_FIELDS =
  "title description type tags link imageUrl startDate endDate domainLink role issuer issuedDate expiryDate recognized";

const loadAchievements = (userId, select) => {
  const query = Achievement.find({ user: userId });
  return (select ? query.select(select) : query).lean();
};

// Sync bookkeeping is for the owner only; other views leave it out.
const SYNC_FIELDS = [
  "lastUpdateAttempt",
  "lastUpdateStatus",
  "lastUpdateError",
  "lastErrorType",
  "lastErrorAt",
  "cooldownEndsAt",
];

/** A user's platform stats (flat, per platform) plus the totals across them. */
async function loadCodingProfiles(userId, { includeSync = false } = {}) {
  const profiles = await Profile.find({ userId }).lean();
  const codingProfiles = {};
  let totalScore = 0;
  let totalProblemsSolved = 0;

  for (const profile of profiles) {
    const shaped = Profile.toClient(profile);
    if (!includeSync) SYNC_FIELDS.forEach((field) => delete shaped[field]);
    codingProfiles[profile.platform] = shaped;
    totalScore += profile.score || 0;
    totalProblemsSolved += profile.problemsSolved || 0;
  }
  return { codingProfiles, totalScore, totalProblemsSolved };
}

// ─── Response shapes ────────────────────────────────────────────────────────

const toAchievementSummary = (achievement) => ({
  title: achievement.title,
  description: achievement.description,
  type: achievement.type,
  tags: achievement.tags || [],
  link: achievement.link || "",
  imageUrl: achievement.imageUrl || "",
  startDate: achievement.startDate,
  endDate: achievement.endDate,
  domainLink: achievement.domainLink || "",
});

/**
 * The full view of a user: every stored field, with the lists normalized, the
 * achievements, the platform stats and the totals. The four platforms the
 * older pages read directly (leetcode, codechef, ...) are repeated at the top
 * level.
 */
function buildDetailedProfile(user, achievements, { codingProfiles, totalScore, totalProblemsSolved }) {
  return {
    ...user,
    skills: normalizeSkillSets(user.skills),
    interests: user.interests || [],
    education: normalizeEducation(user.education),
    about: user.about || "",
    linkedinUrl: user.linkedinUrl || "",
    resumeLink: user.resumeLink || "",
    graduatingYear: user.graduatingYear,
    achievements: achievements.map(toAchievementSummary),
    codingProfiles,
    totalScore,
    totalProblemsSolved,
    leetcode: codingProfiles.leetcode || { rating: 0 },
    codechef: codingProfiles.codechef || { rating: 0 },
    codeforces: codingProfiles.codeforces || { rating: 0 },
    hackerrank: codingProfiles.hackerrank || { rating: 0 },
  };
}

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

/**
 * The solved-problems-per-day calendar of the last year, for the public profile. Only the day, the
 * count and the shade are sent (no sources). A calendar that cannot be read is left out: the rest of
 * the profile must still load.
 */
async function loadPublicActivity(userId, days = 365) {
  try {
    const { dailyActivity, activeDays, totalCount } = await ActivityHeatmap.getHeatmap(userId, days);
    return {
      days,
      activeDays,
      totalCount,
      dailyActivity: dailyActivity.map(({ date, count, level }) => ({ date, count, level })),
    };
  } catch {
    return null;
  }
}

/** The public profile: an allow-list of fields, nothing else is copied over. */
function buildPublicProfile(user, achievements, { codingProfiles, totalScore, totalProblemsSolved }, activity = null) {
  return {
    _id: user._id,
    name: user.name,
    // No email or phone: the public page never shows them (design/screens.md section 7)
    department: user.department || null,
    section: user.section || null,
    rollNumber: user.rollNumber || null,
    graduatingYear: user.graduatingYear || null,
    about: user.about || null,
    linkedinUrl: user.linkedinUrl || null,
    resumeLink: user.resumeLink || null,
    profilePicture: user.profilePicture || null,
    totalScore,
    totalProblemsSolved,
    skills: normalizeSkillSets(user.skills),
    education: normalizeEducation(user.education),
    interests: user.interests || [],
    rankingInfo: user.rankingInfo || EMPTY_RANKING_INFO,
    consistencyIndex: user.weeklyActivity?.consistencyIndex || 0,
    scoreChange: user.weeklyActivity?.scoreChange || 0,
    achievements,
    codingProfiles,
    activity,
  };
}

module.exports = {
  PRIVATE_USER_FIELDS,
  PUBLIC_ACHIEVEMENT_FIELDS,
  findUsersByScore,
  findUserByUsername,
  loadAchievements,
  loadCodingProfiles,
  loadPublicActivity,
  buildDetailedProfile,
  buildPublicProfile,
};
