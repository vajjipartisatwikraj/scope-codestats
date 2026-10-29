/**
 * Reading scores and ranks for the dashboard "Scores & ranks" page and the score / rank
 * charts on each platform's page.
 *
 * Answers carry a `state`:
 *   not_ranked  the account is not a ranked student (admin, teacher, waiting for approval)
 *   no_history  nothing recorded yet (the first record appears after the next profile sync, or
 *               when an admin recalculates ranks)
 *   ok          data follows
 */
const User = require("../../models/User");
const ScoreHistory = require("../../models/ScoreHistory");
const RankingRun = require("../../models/RankingRun");
const { SCORE_PLATFORMS } = require("../../config/rankings");
const { HISTORY_TIMEZONE } = require("../../config/platformProgress");
const { dayKeyOf, addDays, daysBetween } = require("../../utils/dayKeys");
const { bucketize } = require("../platformProgress/seriesBuilder");
const { buildScoreSeries, summarizeScores } = require("./scoreSeriesBuilder");

const FIELDS = "dateKey department totalScore scores ranks";

/** The documents of a range, the one carried in from before it, and the very first one. */
async function loadWindow({ userId, startKey, endKey }) {
  const [records, carryIn, first] = await Promise.all([
    ScoreHistory.find({ userId, dateKey: { $gte: startKey, $lte: endKey } })
      .sort({ dateKey: 1 })
      .select(FIELDS)
      .lean(),
    ScoreHistory.findOne({ userId, dateKey: { $lt: startKey } })
      .sort({ dateKey: -1 })
      .select(FIELDS)
      .lean(),
    ScoreHistory.findOne({ userId }).sort({ dateKey: 1 }).select("dateKey").lean(),
  ]);
  return { records, carryIn, trackingSince: first?.dateKey || null };
}

/**
 * Scores and ranks over the last `days` days (IST days, ending today).
 */
async function getScoreProgress(userId, days) {
  const user = await User.findById(userId).select("userType signupIntent").lean();
  if (!user || user.userType !== "user" || user.signupIntent === "teacher") {
    return {
      state: "not_ranked",
      message: "Scores and ranks are recorded for students only.",
    };
  }

  const endKey = dayKeyOf(new Date(), HISTORY_TIMEZONE);
  const startKey = addDays(endKey, -(days - 1));

  const [window, lastRun] = await Promise.all([
    loadWindow({ userId, startKey, endKey }),
    RankingRun.findOne({ status: "completed" }).sort({ finishedAt: -1 }).select("dateKey finishedAt students").lean(),
  ]);

  if (!window.records.length && !window.carryIn) {
    return {
      state: "no_history",
      lastRankedAt: lastRun?.finishedAt || null,
      message: lastRun
        ? "You have no recorded score yet. It appears after the next profile sync."
        : "Scores and ranks have not been calculated yet. They are recorded after each profile sync.",
    };
  }

  const series = buildScoreSeries({
    records: window.records,
    carryIn: window.carryIn,
    startKey,
    endKey,
  });
  const summary = summarizeScores(series, window.carryIn);

  const presentPlatforms = SCORE_PLATFORMS.filter((platform) => summary.platforms[platform]);

  return {
    state: "ok",
    range: { start: startKey, end: endKey, days, timezone: HISTORY_TIMEZONE },
    trackingSince: window.trackingSince,
    lastRankedAt: lastRun?.finishedAt || null,
    // Whole days since ranks were last calculated for everyone (0 = today). Values are carried
    // forward from then, so a large number means they may be out of date.
    staleDays: lastRun ? Math.max(0, daysBetween(lastRun.dateKey, endKey)) : null,
    platforms: presentPlatforms,
    summary,
    series,
    buckets: bucketize(series, days, {
      sum: { scoreChange: "totalChange" },
      last: { totalScore: "totalScore", overallRank: "overallRank", departmentRank: "departmentRank" },
    }),
  };
}

module.exports = { getScoreProgress };
