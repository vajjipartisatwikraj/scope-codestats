/**
 * Platform progress controller: the data behind the dashboard Progress tab.
 *
 * Wired to URLs in routes/platformProgress.js, which applies the login, rate limit and
 * parameter checks, so `req.user` and `req.progress` ({ platform, days }) can be relied
 * on here. Only the signed-in user's own data is ever read.
 *
 * Expected situations (no username, bad username, no data yet, GitHub unavailable) are
 * answers with a `state`, not errors: the page shows them as messages.
 */
const progressService = require("../services/platformProgress/progressService");
const githubTimelineService = require("../services/platformProgress/githubTimelineService");
const Profile = require("../models/Profile");
const scoreProgressService = require("../services/rankings/scoreProgressService");
const { GITHUB } = require("../config/platformProgress");
const log = require("../utils/logger").scope("PLATFORM-PROGRESS");

/** GET /api/platform-progress/me/overview */
const getOverview = async (req, res) => {
  try {
    res.json(await progressService.getOverview(req.user.id));
  } catch (err) {
    log.error("Error reading the progress overview:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/platform-progress/me/scores?days=90 : scores and ranks over time */
const getScores = async (req, res) => {
  try {
    res.json(await scoreProgressService.getScoreProgress(req.user.id, req.progress.days));
  } catch (err) {
    log.error("Error reading score progress:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** GitHub: the linked username decides what is asked of GitHub. */
async function getGithub(userId, days) {
  const profile = await Profile.findOne({ userId, platform: GITHUB })
    .select("username lastErrorType lastUpdateError lastUpdated lastUpdateStatus")
    .lean();
  const state = progressService.resolveProfileState(profile);

  if (state === "not_linked") return { platform: GITHUB, state, username: "" };
  // The account is known not to exist: no point asking GitHub's timeline.
  if (state === "invalid_username") {
    return {
      platform: GITHUB,
      state,
      username: profile.username,
      message: profile.lastUpdateError || "That GitHub account was not found.",
    };
  }

  const timeline = await githubTimelineService.getTimeline(profile.username, days);
  return { platform: GITHUB, username: profile.username, ...timeline };
}

/** GET /api/platform-progress/me/:platform?days=90 */
const getPlatformProgress = async (req, res) => {
  try {
    const { platform, days } = req.progress;
    const answer =
      platform === GITHUB
        ? await getGithub(req.user.id, days)
        : await progressService.getHistory(req.user.id, platform, days);
    res.json(answer);
  } catch (err) {
    log.error(`Error reading ${req.progress?.platform} progress:`, err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getOverview, getScores, getPlatformProgress };
