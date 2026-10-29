/**
 * Job: update every student's coding platform profiles.
 *
 * `updateAllUserProfiles` syncs each student's linked platforms through
 * services/profileSyncService (which stores the stats or the failure on the
 * Profile) and logs statistics about the run.
 *
 * It can be started three ways:
 * 1. On a schedule: cron-jobs.js runs it every night at 12:00 AM IST
 * 2. From the command line: node scripts/updateUserProfiles.js
 * 3. From the admin dashboard (controllers/dailyCronController.js)
 *
 * When started from the admin dashboard it receives a progressState object
 * that is updated while it runs, so the dashboard can show live progress.
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const mongoose = require("mongoose");
const User = require("../models/User");
const { syncUser } = require("../services/profileSyncService");
const { recordScoresAndRanks } = require("../services/rankings/scoreHistoryService");
const connectDB = require("../config/db");
const appLogger = require("../utils/logger");

// Free-form messages (debug unless LOG_LEVEL=debug). The visible output of a run
// is the job below: start, progress at 10% steps, one green completion line.
const log = appLogger.scope("PROFILE-SYNC");

// MongoDB Connection (with fallback)
const connectToMongoDB = async () => {
  // Inside the server the connection already exists; reconnecting is pointless.
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  try {
    return await connectDB();
  } catch (error) {
    log.warn("falling back to direct MongoDB connection");
    const mongoURI = process.env.MONGODB_URI;
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    appLogger.ready("DB", "connected (fallback)");
    return conn;
  }
};

// Setup logging
const setupLogging = () => {
  // Removed: No longer create logs directory or log files
  // const logDir = path.join(__dirname, '../logs');
  // if (!fs.existsSync(logDir)) {
  //   fs.mkdirSync(logDir, { recursive: true });
  // }

  // const date = new Date().toISOString().split('T')[0];
  // const logFile = path.join(logDir, `profile-update-${date}.log`);

  // Create a write stream for logging
  // const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  // Step-by-step details. Hidden unless LOG_LEVEL=debug: failures are counted
  // and summarized by the job, so they are not printed one by one.
  const logger = {
    log: (message) => {
      log.debug(message);
    },
    error: (message, error) => {
      log.debug(message, error);
    },
    close: () => {
      // No-op - no stream to close
      // Removed: logStream.end();
    },
  };

  return logger;
};

// Platform-specific rate limiting tracker
const rateLimitingTracker = {
  lastRequest: {
    github: 0,
    leetcode: 0,
    codeforces: 0,
    codechef: 0,
    hackerrank: 0,
  },
  delays: {
    github: 1000, // 1 request per second (GitHub has strict limits)
    leetcode: 2000, // Increased: 1 request per 2 seconds (from 500ms)
    codeforces: 5000, // Increased: 1 request per 5 seconds (from 1000ms)
    codechef: 12000, // Increased: 1 request per 12 seconds (from 6000ms)
    hackerrank: 1500, // Increased: 1 request per 1.5 seconds (from 500ms)
  },
  // Track platforms currently being processed
  activeRequests: {
    github: 0,
    leetcode: 0,
    codeforces: 0,
    codechef: 0,
    hackerrank: 0,
  },
  // Maximum concurrent requests per platform
  maxConcurrent: {
    github: 1, // Only 1 GitHub request at a time
    leetcode: 1, // Reduced: Only 1 concurrent LeetCode request (from 3)
    codeforces: 1, // Reduced: Only 1 concurrent Codeforces request (from 2)
    codechef: 1, // Only 1 CodeChef request at a time
    hackerrank: 1, // Reduced: Only 1 concurrent HackerRank request (from 3)
  },
};

/**
 * Update a single user's platform profiles. The sync service fetches every
 * linked platform and stores the stats (or the failure) on the Profile.
 * @param {Object} user - User document
 * @param {Object} logger - Logger instance
 * @param {Object} stats - Statistics object
 * @param {"cron"|"admin"} source - who started the sync (stored on each Profile)
 * @param {Object} [job] - logger.job of this run; a user with failed profiles is counted once
 * @returns {Object} Updated statistics
 */
const updateUserPlatforms = async (user, logger, stats, source = "cron", job = null) => {
  const startTime = Date.now();
  try {
    logger.log(`Starting update for user ${user.name} (${user.email})`);

    const results = await syncUser(user._id, { source });
    const elapsedTime = Date.now() - startTime;

    const successfulProfiles = results.filter((r) => r.ok);
    const failedProfiles = results.filter((r) => !r.ok);

    stats.updatedProfiles += successfulProfiles.length;
    stats.failedProfiles += failedProfiles.length;
    stats.totalProfiles += results.length;
    stats.updatedUsers++;
    stats.totalTime += elapsedTime;

    // Track per-platform statistics
    successfulProfiles.forEach((profile) => {
      stats.profilesByPlatform[profile.platform] =
        (stats.profilesByPlatform[profile.platform] || 0) + 1;
    });

    logger.log(
      `Updated user ${user.name}: ${successfulProfiles.length} profiles ok, ` +
        `${failedProfiles.length} failed. Took ${elapsedTime}ms`,
    );

    failedProfiles.forEach((profile) => {
      const errorDetails = profile.error || "Unknown error";
      const errorType = profile.errorType || "unknown";

      log.debug(
        `${profile.platform} failed for ${user.name} (${profile.username}): [${errorType}] ${errorDetails}`,
      );

      stats.failuresByPlatform[profile.platform] =
        (stats.failuresByPlatform[profile.platform] || 0) + 1;
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;

      // Shown in the admin dashboard
      stats.failedProfilesList.push({
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        userDepartment: user.department || "N/A",
        userSection: user.section || "N/A",
        userYear: user.graduatingYear || "N/A",
        platform: profile.platform,
        platformUsername: profile.username,
        error: errorDetails,
        errorCode: errorType,
        timestamp: new Date().toISOString(),
      });
    });

    // The job counts the user once and groups the reasons ("github auth_failed").
    if (job && failedProfiles.length > 0) {
      const first = failedProfiles[0];
      job.fail(user.name, `${first.platform} ${first.errorType || "unknown"}`);
    }
  } catch (error) {
    stats.failedUsers++;
    job?.fail(user.name, error);
    logger.error(`Error updating user ${user.name} (${user.email})`, error);
  }

  return stats;
};
/**
 * Delay execution based on platform rate limits with exponential backoff for rate-limited platforms
 * @param {string} platform - Platform name
 * @param {boolean} wasRateLimited - Whether the previous request was rate limited
 * @returns {Promise} - Resolves when it's safe to proceed
 */
const applyRateLimit = async (platform, wasRateLimited = false) => {
  if (!rateLimitingTracker.lastRequest[platform]) {
    rateLimitingTracker.lastRequest[platform] = Date.now();
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - rateLimitingTracker.lastRequest[platform];
  let requiredDelay = rateLimitingTracker.delays[platform];

  // Apply exponential backoff for platforms that are frequently rate limited
  if (wasRateLimited) {
    // If the platform was just rate limited, use a much longer delay
    // For CodeChef and Codeforces specifically, be extra cautious
    if (platform === "codechef" || platform === "codeforces") {
      requiredDelay = requiredDelay * 5; // 5x normal delay for these platforms when rate limited
      log.debug(`rate limit backoff ${requiredDelay}ms for ${platform}`);
    } else if (platform === "leetcode") {
      requiredDelay = requiredDelay * 3; // 3x normal delay for LeetCode when rate limited
      log.debug(`rate limit backoff ${requiredDelay}ms for ${platform}`);
    } else {
      requiredDelay = requiredDelay * 2; // 2x normal delay for other platforms
    }
  }

  // Check active requests against max concurrent
  const activeRequests = rateLimitingTracker.activeRequests[platform] || 0;
  const maxConcurrent = rateLimitingTracker.maxConcurrent[platform] || 1;

  if (activeRequests >= maxConcurrent) {
    // Wait for active requests to decrease
    const concurrencyDelayMs = 1000; // Wait 1 second and check again
    log.debug(`waiting for ${platform} requests (${activeRequests}/${maxConcurrent})`);
    await new Promise((resolve) => setTimeout(resolve, concurrencyDelayMs));
    return applyRateLimit(platform, wasRateLimited); // Recursive call to check again
  }

  if (timeSinceLastRequest < requiredDelay) {
    const delayMs = requiredDelay - timeSinceLastRequest;
    if (delayMs > 1000) {
      // Only log delays longer than 1 second
      log.debug(`waiting ${(delayMs / 1000).toFixed(1)}s before next ${platform} request`);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Update the last request time and increment active requests
  rateLimitingTracker.lastRequest[platform] = Date.now();
  rateLimitingTracker.activeRequests[platform] =
    (rateLimitingTracker.activeRequests[platform] || 0) + 1;

  return () => {
    // This function should be called when the request is complete to decrement active requests
    rateLimitingTracker.activeRequests[platform] = Math.max(
      0,
      (rateLimitingTracker.activeRequests[platform] || 1) - 1,
    );
  };
};

/**
 * Main function to update all users' platform profiles
 * @param {Object} progressState - Optional object to track progress (for admin dashboard)
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise} - Resolves when update process is complete
 */
const updateAllUserProfiles = async (progressState = null, signal = null) => {
  let logger = null;
  let dbConnection = null;
  let cleanupFunctions = [];
  let job = null; // logger.job of this run, created once the user count is known

  // Helper to run cleanup functions
  const runCleanup = async () => {
    for (const cleanup of cleanupFunctions) {
      try {
        if (typeof cleanup === "function") {
          await cleanup();
        }
      } catch (cleanupError) {
        log.error("cleanup failed:", cleanupError);
      }
    }
  };

  try {
    // Setup logging
    logger = setupLogging();
    cleanupFunctions.push(() => {
      if (logger) {
        try {
          logger.close();
        } catch (e) {
          log.error("closing logger failed:", e);
        }
      }
    });

    logger.log("Starting profile update process");

    // Handle abort signal if provided
    if (signal) {
      signal.addEventListener(
        "abort",
        async () => {
          logger.log("Received abort signal - cancelling sync operation");

          // Update progress state
          if (progressState) {
            progressState.inProgress = false;
            progressState.cancelled = true;
            progressState.completedTime = Date.now();
            progressState.error = "Operation aborted by signal";
          }

          // Run cleanup functions
          await runCleanup();
        },
        { once: true },
      );
    }

    // Connect to MongoDB
    dbConnection = await connectToMongoDB();
    cleanupFunctions.push(async () => {
      try {
        // DO NOT close the main MongoDB connection - this will break other routes
        // If we're running in a test environment or standalone script, then close
        if (process.env.NODE_ENV === "test" || require.main === module) {
          if (mongoose.connection.readyState !== 0) {
            // 0 = disconnected
            await mongoose.connection.close();
            log.debug("MongoDB connection closed (test/standalone mode)");
          }
        }
      } catch (e) {
        log.error("MongoDB cleanup failed:", e);
      }
    });

    logger.log("Connected to MongoDB");

    // Check if already cancelled before starting
    if (
      progressState &&
      (progressState.cancelled ||
        !progressState.inProgress ||
        (signal && signal.aborted))
    ) {
      logger.log(
        "Sync operation was cancelled before starting user processing",
      );
      await runCleanup();
      return {
        cancelled: true,
        message: "Operation cancelled before starting",
      };
    }

    // Get academic year configuration to identify graduated users
    const AcademicYearConfig = require("../models/AcademicYearConfig");
    const academicConfig = await AcademicYearConfig.getConfig();

    // Get all graduation years that are marked as "Graduated"
    const graduatedYears = academicConfig.yearMappings
      .filter((mapping) => mapping.academicYear === "Graduated")
      .map((mapping) => mapping.graduationYear);

    // Find all users, excluding admin, teacher, and graduated users
    const users = await User.find({
      userType: { $nin: ["admin", "teacher"] },
      $or: [
        { graduatingYear: { $exists: false } },
        { graduatingYear: { $nin: graduatedYears } },
      ],
    });
    logger.log(
      `Found ${users.length} active users to process (excluding admin, teacher, and graduated)`,
    );

    job = appLogger.job("profile-sync", { total: users.length });

    // Initialize statistics
    const stats = {
      totalUsers: users.length,
      updatedUsers: 0,
      failedUsers: 0,
      totalProfiles: 0,
      updatedProfiles: 0,
      failedProfiles: 0,
      failedProfilesList: [], // Initialize empty array to store failed profile details
      totalTime: 0,
      startTime: Date.now(),
      profilesByPlatform: {},
      failuresByPlatform: {},
      errorsByType: {},
      concurrencyStats: {
        maxActiveUsers: 0,
        totalIdleTime: 0,
      },
    };

    // Update progress state if provided (for admin dashboard)
    if (progressState) {
      progressState.totalUsers = users.length;
      progressState.startTime = Date.now();
      progressState.failedProfilesList = []; // Initialize the failedProfilesList in progressState
    }

    // Process users in batches to avoid memory issues
    const BATCH_SIZE = 2; // Reduced from 5 to 2 to further lower server load and prevent rate limiting
    let processedCount = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      // Check for cancellation before each batch
      if (signal && signal.aborted) {
        logger.log("Sync operation aborted before batch processing");
        break;
      }

      if (
        progressState &&
        (progressState.cancelled || !progressState.inProgress)
      ) {
        logger.log("Sync operation cancelled before batch processing");
        break;
      }

      const batch = users.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();

      try {
        // Process batch with controlled concurrency and cancellation checks
        const batchPromises = batch.map(async (user) => {
          // Check for cancellation before each user
          if (signal && signal.aborted) {
            return; // Skip this user
          }

          if (
            progressState &&
            (progressState.cancelled || !progressState.inProgress)
          ) {
            return; // Skip this user
          }

          // Apply rate limiting with jitter
          const jitterMs = Math.floor(Math.random() * 300);
          await new Promise((resolve) => setTimeout(resolve, jitterMs));

          try {
            // Process the user
            await updateUserPlatforms(
              user,
              logger,
              stats,
              progressState ? "admin" : "cron",
              job,
            );
          } catch (userError) {
            job.fail(user.name || user.email || String(user._id), userError);
            logger.error(
              `Individual user error for ${
                user.name || user.email || user._id
              }`,
              userError,
            );
            stats.failedUsers++;

            if (progressState) {
              progressState.failedUsers = (progressState.failedUsers || 0) + 1;
            }
          } finally {
            // Increment processed count regardless of success/failure
            processedCount++;

            // Update progress
            if (progressState) {
              // Update with proper locking to avoid race conditions
              try {
                // Calculate current progress percentage
                const percent = Math.round(
                  (processedCount / users.length) * 100,
                );

                // Update all fields atomically
                progressState.processedUsers = processedCount;
                progressState.updatedProfiles = stats.updatedProfiles;
                progressState.failedProfiles = stats.failedProfiles;
                progressState.totalProfiles = stats.totalProfiles;
                progressState.failedProfilesList =
                  stats.failedProfilesList || [];

                // Add a lastUpdated timestamp to help detect stalled processes
                progressState.lastUpdated = Date.now();

                log.debug(
                  `progress state ${processedCount}/${users.length} (${percent}%), ` +
                    `updated ${stats.updatedProfiles}, failed ${stats.failedProfiles}`,
                );
              } catch (progressUpdateError) {
                log.error("updating progress state failed:", progressUpdateError);
                // Continue processing even if progress update fails
              }
            }

            // The job prints at 10% steps (or every 15 s), not for every user.
            job.progress(processedCount);
          }
        });

        // Wait for all promises with timeout protection
        await Promise.race([
          Promise.all(batchPromises),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error("Batch timeout exceeded (3 minutes)"));
            }, 180000); // 3 minutes timeout
          }),
        ]);
      } catch (batchError) {
        log.warn(
          `batch ${Math.ceil(i / BATCH_SIZE) + 1} failed: ${batchError.message}`,
        );
        logger.error(
          `Error processing batch ${Math.ceil(i / BATCH_SIZE) + 1}`,
          batchError,
        );

        // Check if we need to abort due to timeout
        if (batchError.message.includes("timeout")) {
          if (progressState) {
            progressState.error = `Batch timeout: ${batchError.message}`;
          }
          // Continue with next batch, don't abort the whole process
        }
      }

      // Check for cancellation after batch
      if (signal && signal.aborted) {
        logger.log("Sync operation aborted after batch processing");
        break;
      }

      if (
        progressState &&
        (progressState.cancelled || !progressState.inProgress)
      ) {
        logger.log("Sync operation cancelled after batch processing");
        break;
      }

      // Log batch completion
      const batchTime = Date.now() - batchStartTime;
      logger.log(
        `Batch ${Math.ceil(i / BATCH_SIZE) + 1}/${Math.ceil(
          users.length / BATCH_SIZE,
        )} completed in ${batchTime / 1000} seconds`,
      );

      // Add a small pause between batches
      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased to 3 seconds
      }
    }

    // Check if cancelled after all batches
    if (signal && signal.aborted) {
      if (progressState) {
        progressState.inProgress = false;
        progressState.completedTime = Date.now();
        progressState.cancelled = true;
      }

      logger.log("Sync operation was aborted");
      job.cancel();
      await runCleanup();

      return {
        cancelled: true,
        processedUsers: processedCount,
        totalUsers: users.length,
        ...stats,
      };
    }

    if (progressState && progressState.cancelled) {
      logger.log("Sync operation was cancelled by admin");
      job.cancel();

      // Ensure progress state is updated
      progressState.inProgress = false;
      progressState.completedTime = progressState.completedTime || Date.now();
      progressState.processedUsers = processedCount;
      progressState.updatedProfiles = stats.updatedProfiles;
      progressState.failedProfiles = stats.failedProfiles;
      progressState.totalProfiles = stats.totalProfiles;
      progressState.failedProfilesList = stats.failedProfilesList || [];

      await runCleanup();

      return {
        cancelled: true,
        processedUsers: processedCount,
        totalUsers: users.length,
        ...stats,
      };
    }

    // Calculate final statistics
    const totalTimeSeconds = (Date.now() - stats.startTime) / 1000;
    const avgProfileTime =
      stats.updatedProfiles > 0 ? stats.totalTime / stats.updatedProfiles : 0;

    // Every student's scores are final now: rank everyone and record the history. A
    // problem here is reported in the summary but never fails the sync itself.
    let rankingNote = "";
    try {
      const ranking = await recordScoresAndRanks({
        source: progressState ? "admin" : "cron",
        sync: {
          totalProfiles: stats.totalProfiles,
          updatedProfiles: stats.updatedProfiles,
          failedProfiles: stats.failedProfiles,
        },
      });
      rankingNote = ` | ranked ${ranking.students} students (${ranking.written} records)`;
      if (progressState) {
        progressState.ranking = { students: ranking.students, written: ranking.written, ok: true };
      }
    } catch (rankingError) {
      rankingNote = " | ranking FAILED";
      log.error("ranking after the sync failed:", rankingError);
      if (progressState) progressState.ranking = { ok: false, error: rankingError.message };
    }

    // One green summary line. The users counted as failed are those with at
    // least one failed profile; the profile totals are in the same line.
    job.complete(
      `profiles ${stats.updatedProfiles} ok, ${stats.failedProfiles} failed` +
        ` | avg ${Math.round(avgProfileTime)}ms/profile` +
        rankingNote,
    );

    // Update progress state for completion
    if (progressState) {
      progressState.inProgress = false;
      progressState.completedTime = Date.now();
      progressState.processedUsers = processedCount;
      progressState.updatedProfiles = stats.updatedProfiles;
      progressState.failedProfiles = stats.failedProfiles;
      progressState.totalProfiles = stats.totalProfiles;
      progressState.failedProfilesList = stats.failedProfilesList || [];
      progressState.success = true;
    }

    // Run cleanup
    await runCleanup();

    return {
      success: true,
      totalUsers: users.length,
      processedUsers: processedCount,
      updatedProfiles: stats.updatedProfiles,
      failedProfiles: stats.failedProfiles,
      totalTime: totalTimeSeconds,
    };
  } catch (error) {
    if (job) {
      job.error(error);
    } else {
      log.error("profile sync failed before it started:", error);
    }

    if (logger) {
      logger.error("Fatal error in profile update process", error);
    }

    // Update progress state with error
    if (progressState) {
      progressState.error = error.message || "Unknown fatal error";
      progressState.inProgress = false;
      progressState.completedTime = Date.now();
      progressState.success = false;
    }

    // Run cleanup
    await runCleanup();

    // Re-throw for promise rejection handling
    throw error;
  }
};

// If running as standalone script
if (require.main === module) {
  updateAllUserProfiles()
    .then(() => process.exit(0))
    .catch(() => process.exit(1)); // already reported by the job
}

module.exports = updateAllUserProfiles;
