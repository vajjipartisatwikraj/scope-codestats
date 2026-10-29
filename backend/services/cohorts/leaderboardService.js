/**
 * The cohort leaderboard ranks stored on each enrollment.
 */
const UserCohort = require("../../models/UserCohort");
const log = require("../../utils/logger").scope("COHORT-LEADERBOARD");

// Helper function to update cohort leaderboard rankings
async function updateCohortLeaderboard(cohortId) {
  try {
    // Get all user cohorts for this cohort, sorted by total score, excluding admin and teacher users
    const userCohorts = await UserCohort.find({ cohort: cohortId })
      .populate({
        path: "user",
        match: { userType: { $nin: ["admin", "teacher"] } }, // Exclude admin and teacher users
        select: "userType",
      })
      .sort({ totalScore: -1 });

    // Filter out entries where user is null (admin and teacher users filtered out by populate match)
    const filteredUserCohorts = userCohorts.filter(
      (entry) => entry.user !== null
    );

    // Update ranks using bulkWrite for O(1) DB round-trips instead of N sequential saves
    if (filteredUserCohorts.length > 0) {
      const bulkOps = filteredUserCohorts.map((uc, i) => ({
        updateOne: {
          filter: { _id: uc._id },
          update: { $set: { rank: i + 1 } },
        },
      }));
      await UserCohort.bulkWrite(bulkOps);
    }
  } catch (err) {
    log.error("Error updating cohort leaderboard:", err);
  }
}

module.exports = {
  updateCohortLeaderboard,
};
