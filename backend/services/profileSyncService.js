/**
 * Profile sync service.
 *
 * The only place that writes platform stats. Every path that refreshes a
 * profile (student update, cohort submission, nightly cron, admin sync) goes
 * through here, so stats, timestamps and error details are recorded the same
 * way everywhere. Everything is stored on the Profile document.
 */
const Profile = require("../models/Profile");
const User = require("../models/User");
const { fetchProfile } = require("./platformScraper");
const { classifyError, ScraperError } = require("./platformScraper/errors");
const { recordSnapshot } = require("./platformProgress/snapshotService");
const { clearPlatformHistory } = require("./platformProgress/historyCleanup");
const logger = require("../utils/logger");
const log = logger.scope("PROFILE-SYNC");

const MAX_ERROR_LENGTH = 500;
const DELAY_BETWEEN_PLATFORMS_MS = 200;

// Values a profile returns to when its username changes. Stats from the old
// username must not survive onto a different account.
const STAT_DEFAULTS = {
  score: 0,
  problemsSolved: 0,
  easyProblemsSolved: 0,
  mediumProblemsSolved: 0,
  hardProblemsSolved: 0,
  rating: 0,
  maxRating: 0,
  rank: "unrated",
  globalRank: 0,
  countryRank: 0,
  instituteRank: 0,
  contestsParticipated: 0,
  contestRanking: 0,
  contestBadge: "",
  badges: 0,
  certificates: 0,
  details: null,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates the profile for (user, platform), or points an existing one at a new
 * username. A changed username wipes the old stats and the cooldown clock.
 * @returns {Promise<{profile, created: boolean, changed: boolean}>}
 */
async function setUsername(userId, platform, rawUsername) {
  const username = String(rawUsername).trim();
  let profile = await Profile.findOne({ userId, platform });

  if (!profile) {
    profile = await new Profile({ userId, platform, username }).save();
    // A new link starts with no history, whatever an earlier link left behind.
    await clearPlatformHistory(userId, platform);
    return { profile, created: true, changed: false };
  }

  if (profile.username === username) {
    return { profile, created: false, changed: false };
  }

  // A different account (not just different capitalisation of the same name) starts a
  // new history: the old numbers belong to someone else's progress.
  const isDifferentAccount = profile.username.toLowerCase() !== username.toLowerCase();

  profile.set({
    ...STAT_DEFAULTS,
    username,
    lastUpdated: null,
    lastUpdateStatus: "pending",
    lastUpdateError: null,
    lastErrorType: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
  });
  await profile.save();
  if (isDifferentAccount) await clearPlatformHistory(userId, platform);
  return { profile, created: false, changed: true };
}

/**
 * Removes a linked platform: the username, its stats and all of its stored history
 * (progress snapshots, and the platform's score and rank history).
 * @returns {Promise<{removed: boolean, historyDeleted: number, scoreHistoryCleared: number}>}
 *   removed is false when the platform was not linked
 */
async function removePlatform(userId, platform) {
  const { deletedCount } = await Profile.deleteOne({ userId, platform });
  const { progress, scores } = await clearPlatformHistory(userId, platform);
  return { removed: deletedCount > 0, historyDeleted: progress, scoreHistoryCleared: scores };
}

/**
 * Fetches fresh stats for one profile and saves either the stats or the error.
 * Never throws for a scraping failure; check `ok`.
 *
 * @param {Profile} profile mongoose document
 * @param {object} [options]
 * @param {"user"|"cron"|"admin"|"system"} [options.source]
 * @param {{fields: object, partial: boolean}} [options.prefetched] an answer already fetched
 *   from the platform for this username, used instead of fetching again
 * @returns {Promise<{ok: boolean, profile, error?: ScraperError}>}
 */
async function syncProfile(profile, { source = "system", prefetched = null } = {}) {
  const { platform } = profile;
  const identifier = platform === "scopecodestats" ? String(profile.userId) : profile.username;

  profile.lastUpdateAttempt = new Date();
  profile.updateAttempts = (profile.updateAttempts || 0) + 1;
  profile.lastSyncSource = source;

  try {
    // In a student's request the wait shows in the request block. In the batch
    // sync job it is not timed: the job reports progress and a failure summary.
    const fetching = prefetched ? Promise.resolve(prefetched) : fetchProfile(platform, identifier);
    const { fields, partial } = await (logger.requestContext.getStore() && !prefetched
      ? logger.timed(`${platform}.fetch`, fetching)
      : fetching);

    // A partial answer would overwrite good stats with zeros; keep what we have.
    if (partial && profile.score > 0) {
      const error = new Error("The platform returned incomplete data. Previous stats were kept.");
      error.partial = true;
      throw error;
    }

    profile.set(fields);
    if (platform === "scopecodestats" && fields.username) profile.username = fields.username;
    profile.set({
      lastUpdated: new Date(),
      lastUpdateStatus: "success",
      lastUpdateError: null,
      lastErrorType: null,
      lastErrorAt: null,
      consecutiveFailures: 0,
    });
    await profile.save();

    // Keep the daily history. A problem here must never fail the sync that just worked.
    await recordSnapshot(profile, { partial }).catch((historyError) =>
      log.error(`[ProfileSync] could not record ${platform} history for ${profile.userId}:`, historyError.message)
    );

    return { ok: true, profile };
  } catch (err) {
    const error = classifyError(err);
    if (err.partial) error.type = "service_unavailable";

    // Stats stay as they were. Only the status and the failure details change.
    profile.set({
      lastUpdateStatus: "error",
      lastUpdateError: error.message.slice(0, MAX_ERROR_LENGTH),
      lastErrorType: error.type,
      lastErrorAt: new Date(),
      consecutiveFailures: (profile.consecutiveFailures || 0) + 1,
    });
    await profile.save({ validateBeforeSave: false });
    return { ok: false, profile, error };
  }
}

/**
 * Student-triggered update of one platform: stores the username, then syncs.
 * @returns {Promise<{cooldownEndsAt?: Date, ok?: boolean, profile?, error?}>}
 */
async function updatePlatform(userId, platform, username) {
  const existing = await Profile.findOne({ userId, platform });
  const cooldownEndsAt = existing?.cooldownEndsAt();
  if (cooldownEndsAt) return { cooldownEndsAt };

  const cleanName = String(username).trim();
  const switchingAccount =
    existing && existing.username.trim().toLowerCase() !== cleanName.toLowerCase();

  if (!switchingAccount) {
    const { profile } = await setUsername(userId, platform, username);
    return syncProfile(profile, { source: "user" });
  }

  // Switching to a different account deletes the old account's stats and history, so the
  // new account must be confirmed to exist first. A typo then costs nothing: the old
  // account stays exactly as it was.
  if (!new Profile({ userId, platform, username: cleanName }).validateProfileFormat()) {
    return {
      ok: false,
      profile: existing,
      error: new ScraperError("invalid_username", `Invalid ${platform} username format.`),
    };
  }
  let prefetched;
  try {
    prefetched = await fetchProfile(platform, cleanName);
  } catch (err) {
    return { ok: false, profile: existing, error: classifyError(err) };
  }

  const { profile } = await setUsername(userId, platform, cleanName);
  return syncProfile(profile, { source: "user", prefetched });
}

/** Accepts "name" or a profile URL ("https://github.com/name/") and returns "name". */
function extractUsername(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w+\/(?:u\/|user\/|profile\/|users\/)?([^/?#\s]+)/i);
  return (match ? match[1] : text).trim();
}

/**
 * Saves usernames from the profile / registration forms, without fetching.
 * Blank values are ignored, so a partial form never wipes a linked platform.
 * A failure on one platform does not stop the others.
 * @param {object} usernames e.g. { leetcode: "abc", github: "https://github.com/xyz" }
 * @returns {Promise<Array<{platform: string, message: string}>>} the platforms that failed
 */
async function saveUsernames(userId, usernames = {}) {
  const failures = [];
  for (const platform of Profile.EXTERNAL_PLATFORMS) {
    const raw = usernames[platform];
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      await setUsername(userId, platform, extractUsername(raw));
    } catch (err) {
      log.error(`[ProfileSync] could not save ${platform} username for ${userId}:`, err.message);
      failures.push({ platform, message: err.message });
    }
  }
  return failures;
}

/** Recomputes the internal Scope-CodeStats profile. No network involved. */
async function refreshScopeCodestats(userId) {
  let profile = await Profile.findOne({ userId, platform: "scopecodestats" });
  if (!profile) {
    const user = await User.findById(userId).select("email").lean();
    if (!user) return { ok: false, error: new Error("User not found") };
    profile = await new Profile({
      userId,
      platform: "scopecodestats",
      username: user.email || String(userId),
    }).save();
  }
  return syncProfile(profile, { source: "system" });
}

/**
 * Refreshes every profile a user has, one platform at a time (the platforms
 * rate limit hard), then the internal platform.
 * @returns {Promise<Array<{platform, username, ok, errorType?, error?}>>}
 */
async function syncUser(userId, { source = "cron" } = {}) {
  const profiles = await Profile.find({
    userId,
    platform: { $in: Profile.EXTERNAL_PLATFORMS },
  });

  const results = [];
  for (const profile of profiles) {
    const result = await syncProfile(profile, { source });
    results.push({
      platform: profile.platform,
      username: profile.username,
      ok: result.ok,
      errorType: result.error?.type,
      error: result.error?.message,
    });
    await sleep(DELAY_BETWEEN_PLATFORMS_MS);
  }

  const internal = await refreshScopeCodestats(userId);
  results.push({
    platform: "scopecodestats",
    username: internal.profile?.username,
    ok: internal.ok,
    errorType: internal.error?.type,
    error: internal.error?.message,
  });
  return results;
}

module.exports = {
  extractUsername,
  saveUsernames,
  setUsername,
  removePlatform,
  syncProfile,
  updatePlatform,
  refreshScopeCodestats,
  syncUser,
};
