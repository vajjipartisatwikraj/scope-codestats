/**
 * Deleting everything stored about one platform of one student, when the student changes
 * the platform's username to a different account or removes the username.
 *
 *   progress history  daily snapshots of problems, rating and contests
 *   score history     that platform's score and its rank among students
 *   daily activity    the days of the combined activity heatmap that came from that platform
 *
 * Total score and the overall and department ranks stay: they were true at the time.
 */
const { clearHistory } = require("./snapshotService");
const { clearPlatformScoreHistory } = require("../rankings/scoreHistoryService");
const { clearActivity } = require("../platformActivity/activityService");

/**
 * @returns {Promise<{progress: number, scores: number, activity: number}>} how many records were
 *   deleted or changed in each history
 */
async function clearPlatformHistory(userId, platform) {
  const [progress, scores, activity] = await Promise.all([
    clearHistory(userId, platform),
    clearPlatformScoreHistory(userId, platform),
    clearActivity(userId, platform),
  ]);
  return { progress, scores, activity };
}

module.exports = { clearPlatformHistory };
