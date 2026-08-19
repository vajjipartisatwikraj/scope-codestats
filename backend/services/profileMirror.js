/**
 * Copies a platform profile from the `Profile` collection onto the `User`
 * document.
 *
 * Why this exists: the dashboard writes fetched stats to `Profile`, but the
 * leaderboard reads `User.platformScores`. Without this step a username update
 * showed new stats on the dashboard while the leaderboard column stayed at 0
 * until the nightly cron happened to run.
 *
 * The entry shape matches exactly what `PUT /api/profiles/update-user/:userId`
 * (the cron sync) writes, so a manual dashboard update and a nightly sync leave
 * the User document in the same state.
 *
 * Lives in a service rather than inline in the route so it can also be used by
 * the backfill script, and so it can be tested without booting the server.
 */

const User = require("../models/User");

/**
 * Builds the `platformScores` entry for one platform.
 *
 * `platformScores` is a Map of Mixed, so every field here survives as written.
 */
function buildPlatformScoreEntry(platform, profile, platformData = {}) {
  const entry = {
    username: profile.username,
    score: profile.score || 0,
    // GitHub contributes commits, not solved problems.
    problemsSolved: platform === "github" ? 0 : profile.problemsSolved || 0,
    rating: profile.rating || 0,
    rank: profile.rank || "unrated",
    lastUpdated: profile.lastUpdated || new Date(),
  };

  if (platform === "github") {
    entry.totalCommits =
      platformData.totalCommits ?? profile.details?.totalCommits ?? 0;
    entry.publicRepos =
      platformData.publicRepos ?? profile.details?.publicRepos ?? 0;
    entry.followers = platformData.followers ?? profile.details?.followers ?? 0;
    entry.starsReceived =
      platformData.starsReceived ?? profile.details?.starsReceived ?? 0;
    return entry;
  }

  entry.contestsParticipated =
    platformData.contestsParticipated ?? profile.contestsParticipated ?? 0;
  entry.maxRating = platformData.maxRating ?? profile.maxRating ?? 0;

  const easy = platformData.easyProblemsSolved ?? profile.easyProblemsSolved;
  const medium = platformData.mediumProblemsSolved ?? profile.mediumProblemsSolved;
  const hard = platformData.hardProblemsSolved ?? profile.hardProblemsSolved;

  if (easy !== undefined) entry.easyProblemsSolved = easy || 0;
  if (medium !== undefined) entry.mediumProblemsSolved = medium || 0;
  if (hard !== undefined) entry.hardProblemsSolved = hard || 0;

  return entry;
}

/**
 * Builds the `platformData` entry for one platform.
 *
 * `platformData` is a typed subschema whose field names differ from the flat
 * Profile shape: LeetCode stores `totalSolved`/`easySolved`/`ranking`, not
 * `problemsSolved`/`easyProblemsSolved`/`globalRank`. Writing the flat names
 * there gets them silently stripped by Mongoose, so they are translated here.
 *
 * Returns null for platforms the subschema does not model, such as GitHub.
 */
function buildPlatformDataEntry(platform, profile, platformData = {}) {
  const base = {
    username: profile.username,
    score: profile.score || 0,
    rating: platformData.rating ?? profile.rating ?? 0,
    lastUpdated: profile.lastUpdated || new Date(),
  };

  switch (platform) {
    case "leetcode":
      return {
        ...base,
        ranking: platformData.ranking ?? profile.globalRank ?? 0,
        totalSolved: profile.problemsSolved || 0,
        easySolved:
          platformData.easyProblemsSolved ?? profile.easyProblemsSolved ?? 0,
        mediumSolved:
          platformData.mediumProblemsSolved ?? profile.mediumProblemsSolved ?? 0,
        hardSolved:
          platformData.hardProblemsSolved ?? profile.hardProblemsSolved ?? 0,
      };

    case "codechef":
      return {
        ...base,
        global_rank: platformData.global_rank ?? profile.globalRank ?? 0,
        country_rank: platformData.country_rank ?? profile.countryRank ?? 0,
        problemsSolved: profile.problemsSolved || 0,
        contestsParticipated:
          platformData.contestsParticipated ?? profile.contestsParticipated ?? 0,
      };

    case "codeforces":
      return {
        ...base,
        rank: profile.rank || "unrated",
        maxRating: platformData.maxRating ?? profile.maxRating ?? 0,
        problemsSolved: profile.problemsSolved || 0,
        contestsParticipated:
          platformData.contestsParticipated ?? profile.contestsParticipated ?? 0,
      };

    case "hackerrank":
      return {
        ...base,
        problemsSolved: profile.problemsSolved || 0,
        badges: platformData.badges ?? profile.badges ?? 0,
        certificates: platformData.certificates ?? profile.certificates ?? 0,
      };

    default:
      // GitHub and anything else the subschema does not define.
      return null;
  }
}

/** Reads every stored entry as a plain object, Map or legacy object alike. */
function readAllEntries(user) {
  if (!user.platformScores) return {};
  if (typeof user.platformScores.entries === "function") {
    return Object.fromEntries(user.platformScores);
  }
  return user.platformScores;
}

/**
 * Mirrors one platform onto the User document and recalculates the derived
 * totals the leaderboard reads.
 *
 * Only the platform named is touched; every other stored entry is left exactly
 * as it was, so this can never wipe data the user did not just refresh.
 *
 * @param {string} userId
 * @param {string} platform
 * @param {object} profile      the saved Profile document
 * @param {object} [platformData] the freshly fetched payload, when available
 * @returns {Promise<{ok: boolean, totalScore?: number, reason?: string}>}
 */
async function mirrorProfileToUser(userId, platform, profile, platformData = {}) {
  const user = await User.findById(userId);
  if (!user) return { ok: false, reason: "user_not_found" };

  if (!user.platformScores) user.platformScores = new Map();

  const scoreEntry = buildPlatformScoreEntry(platform, profile, platformData);

  // platformScores is a Mongoose Map, but a plain object can appear on documents
  // written before the Map type was introduced.
  if (typeof user.platformScores.set === "function") {
    user.platformScores.set(platform, scoreEntry);
  } else {
    user.platformScores[platform] = scoreEntry;
  }
  // Mixed/Map contents are not change-tracked deeply, so the path is marked
  // explicitly. Without this the write is silently dropped on save.
  user.markModified("platformScores");

  const dataEntry = buildPlatformDataEntry(platform, profile, platformData);
  if (dataEntry) {
    if (!user.platformData) user.platformData = {};
    user.platformData[platform] = dataEntry;
    user.markModified(`platformData.${platform}`);
  }

  if (platform === "github") {
    user.githubStats = {
      totalCommits: scoreEntry.totalCommits || 0,
      publicRepos: scoreEntry.publicRepos || 0,
      starsReceived: scoreEntry.starsReceived || 0,
      followers: scoreEntry.followers || 0,
      lastUpdated: new Date(),
    };
  }

  // Recompute the totals from every stored entry, not just this one, so they
  // stay internally consistent.
  const allEntries = readAllEntries(user);

  user.totalScore = Object.values(allEntries).reduce(
    (sum, data) =>
      sum +
      (typeof data?.score === "number" && !isNaN(data.score) ? data.score : 0),
    0
  );

  user.totalProblemsSolved = Object.entries(allEntries).reduce(
    (sum, [key, data]) => {
      if (key === "github") return sum; // commits are not solved problems
      if (key === "scopecodestats") {
        return sum + (data?.totalCohortProblemsolved || data?.problemsSolved || 0);
      }
      return sum + (data?.problemsSolved || 0);
    },
    0
  );

  user.lastProfileSync = new Date();

  await user.save();

  console.log(
    `[ProfileMirror] user=${userId} ${platform}: score=${scoreEntry.score}, ` +
      `solved=${scoreEntry.problemsSolved} → totalScore=${user.totalScore}`
  );

  return { ok: true, totalScore: user.totalScore };
}

/**
 * Route-friendly wrapper: never throws.
 *
 * The Profile row is already saved by the time this runs and the nightly sync
 * reconciles, so a mirroring problem must not turn a successful profile update
 * into an error for the student.
 */
async function mirrorProfileToUserSafe(userId, platform, profile, platformData) {
  try {
    return await mirrorProfileToUser(userId, platform, profile, platformData);
  } catch (err) {
    console.error(
      `[ProfileMirror] FAILED user=${userId} platform=${platform}:`,
      err.message
    );
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  buildPlatformScoreEntry,
  buildPlatformDataEntry,
  mirrorProfileToUser,
  mirrorProfileToUserSafe,
};
