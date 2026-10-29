/**
 * Deleting everything stored about one platform of one student, when the student changes
 * the platform's username to a different account or removes the username.
 *
 *   progress history  daily snapshots of problems, rating and contests
 *   score history     that platform's score and its rank among students
 *
 * Total score and the overall and department ranks stay: they were true at the time.
 */
const { clearHistory } = require("./snapshotService");
const { clearPlatformScoreHistory } = require("../rankings/scoreHistoryService");

/**
 * @returns {Promise<{progress: number, scores: number}>} how many records were deleted or
 *   changed in each history
 */
async function clearPlatformHistory(userId, platform) {
  const [progress, scores] = await Promise.all([
    clearHistory(userId, platform),
    clearPlatformScoreHistory(userId, platform),
  ]);
  return { progress, scores };
}

module.exports = { clearPlatformHistory };
