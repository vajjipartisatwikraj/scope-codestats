/**
 * Scope-CodeStats (internal platform)
 *
 * Unlike the external scrapers this one reads our own database: cohort progress
 * (UserCohort) and practice arena tests (PATest). The argument is a user id,
 * not a username.
 *
 * Score and problem counts never decrease. They are the MAX of what the user's
 * active cohorts currently show and the lifetime value stored on the user's
 * scopecodestats Profile, so deleting a cohort does not take points away.
 */
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const UserCohort = require("../../models/UserCohort");
const PATest = require("../../models/PATest");

/**
 * Score = total cohort score. Practice arena contests are shown but intentionally do not
 * add to the score. (The consistency index is not part of it: the index is worked out from
 * how the total score changes, see services/weeklyActivity.)
 */
function calculateScopeCodestatsScore({ totalCohortScore = 0 }) {
  return Math.round(totalCohortScore);
}

async function fetchProfile(userId) {
  const [user, existing, userCohorts, practiceArenaContests] = await Promise.all([
    User.findById(userId).select("email").lean(),
    Profile.findOne({ userId, platform: "scopecodestats" })
      .select("lifetimeScore lifetimeProblems")
      .lean(),
    UserCohort.find({
      user: userId,
      status: { $in: ["enrolled", "completed"] },
    })
      .select("status totalScore questionProgress")
      .lean(),
    PATest.countDocuments({ user: userId, status: "completed" }),
  ]);

  if (!user) throw new Error(`User ${userId} not found`);

  let totalCohortsCompleted = 0;
  let activeCohortScore = 0;
  let activeCohortProblems = 0;
  for (const cohort of userCohorts) {
    if (cohort.status === "completed") totalCohortsCompleted++;
    activeCohortScore += cohort.totalScore || 0;
    activeCohortProblems += (cohort.questionProgress || []).filter((q) => q.solved).length;
  }

  const totalCohortScore = Math.max(existing?.lifetimeScore || 0, activeCohortScore);
  const totalCohortProblemsSolved = Math.max(
    existing?.lifetimeProblems || 0,
    activeCohortProblems
  );

  return {
    username: user.email || String(userId),
    totalCohortsCompleted,
    totalCohortProblemsSolved,
    problemsSolved: totalCohortProblemsSolved,
    totalCohortScore,
    lifetimeScore: totalCohortScore,
    lifetimeProblems: totalCohortProblemsSolved,
    totalPracticeArenaContests: practiceArenaContests,
    score: calculateScopeCodestatsScore({ totalCohortScore }),
  };
}

module.exports = { fetchProfile, calculateScopeCodestatsScore };
