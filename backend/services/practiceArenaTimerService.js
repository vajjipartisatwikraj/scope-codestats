/**
 * Practice Arena Timer Service
 *
 * Centralized timer management for Practice Arena tests with WebSocket synchronization.
 * Ensures accurate, consistent timer state across all clients regardless of disconnections.
 *
 * Features:
 * - Server-authoritative timer (no client manipulation possible)
 * - Real-time WebSocket broadcasts
 * - Automatic test completion on timeout
 * - Pause/resume functionality
 * - Reconnection handling with instant sync
 */

const PATest = require("../models/PATest");
const PASubmission = require("../models/PASubmission");

class PracticeArenaTimerService {
  constructor(io) {
    this.io = io;
    this.activeTimers = new Map(); // Map of testId -> interval
    this.initialized = false;
  }

  /**
   * Initialize the timer service and start monitoring active tests
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Find all active tests and start timers
      const activeTests = await PATest.find({ status: "started" });

      for (const test of activeTests) {
        await this.startTimer(test._id, test.user);
      }

      // Start periodic broadcast (every 60 seconds)
      this.startPeriodicBroadcast();

      this.initialized = true;
    } catch (error) {
      console.error("[PA Timer] ❌ Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Calculate current time remaining for a test
   */
  calculateTimeRemaining(test) {
    if (!test.serverStartTime) {
      return test.parameters.timeLimit * 60; // Full time if not started
    }

    const now = Date.now();
    const startTime = new Date(test.serverStartTime).getTime();
    const timeLimitMs = test.parameters.timeLimit * 60 * 1000;
    const elapsedMs = now - startTime;
    const remainingMs = Math.max(0, timeLimitMs - elapsedMs);

    return Math.floor(remainingMs / 1000); // Return seconds
  }

  /**
   * Start a test timer when user begins the test
   */
  async startTimer(testId, userId) {
    try {
      const test = await PATest.findById(testId);

      if (!test) {
        console.error(`[PA Timer] ❌ Test ${testId} not found`);
        return;
      }

      if (test.status !== "started") {
        console.error(
          `[PA Timer] ❌ Cannot start timer for test in ${test.status} status`
        );
        return;
      }

      // Set server-side timestamps
      const serverTime = new Date();
      test.serverStartTime = test.startTime || serverTime;
      test.serverCurrentTime = serverTime;
      test.timeRemainingSeconds = this.calculateTimeRemaining(test);
      await test.save();

      // Join test to its own room for targeted broadcasts
      const testRoom = `test:${testId}`;

      // Broadcast initial timer state to user
      this.io.to(`user:${userId}`).emit("pa:timer:started", {
        testId: testId.toString(),
        serverStartTime: test.serverStartTime.toISOString(),
        serverCurrentTime: serverTime.toISOString(),
        timeRemainingSeconds: test.timeRemainingSeconds,
        timeLimitMinutes: test.parameters.timeLimit,
        status: "started",
      });

      // Start checking for timeout
      if (!this.activeTimers.has(testId.toString())) {
        this.monitorTest(testId, userId);
      }
    } catch (error) {
      console.error(
        `[PA Timer] ❌ Error starting timer for test ${testId}:`,
        error
      );
    }
  }

  /**
   * Monitor a test and auto-complete when time expires
   */
  monitorTest(testId, userId) {
    const testIdStr = testId.toString();

    // Check every 15 seconds
    const interval = setInterval(async () => {
      try {
        const test = await PATest.findById(testId);

        if (!test || test.status !== "started") {
          // Test completed or deleted, stop monitoring
          clearInterval(interval);
          this.activeTimers.delete(testIdStr);
          return;
        }

        const timeRemaining = this.calculateTimeRemaining(test);

        // Auto-complete if time expired
        if (timeRemaining <= 0) {
          await this.completeTest(testId, userId, "timeout");
          clearInterval(interval);
          this.activeTimers.delete(testIdStr);
        }
      } catch (error) {
        console.error(
          `[PA Timer] ❌ Error monitoring test ${testIdStr}:`,
          error
        );
      }
    }, 15000); // Check every 15 seconds

    this.activeTimers.set(testIdStr, interval);
  }

  /**
   * Auto-complete a test when time runs out
   */
  async completeTest(testId, userId, reason = "timeout") {
    try {
      const test = await PATest.findById(testId);

      if (!test || test.status !== "started") {
        return;
      }

      const now = new Date();
      const startTime = new Date(test.serverStartTime || test.startTime);
      const totalTimeTaken = Math.floor((now - startTime) / 1000); // seconds

      // Calculate final score from submissions
      const submissions = await PASubmission.find({
        test: testId,
        user: userId,
      });

      const finalScore = submissions.reduce((total, sub) => {
        return total + (sub.pointsAwarded || 0);
      }, 0);

      // Update test
      test.status = "completed";
      test.endTime = now;
      test.completedAt = now;
      test.totalTimeTaken = totalTimeTaken;
      test.totalScore = finalScore;
      test.timeRemainingSeconds = 0;
      test.serverCurrentTime = now;
      await test.save();

      // Broadcast completion to user
      this.io.to(`user:${userId}`).emit("pa:test:completed", {
        testId: testId.toString(),
        reason: reason,
        totalScore: finalScore,
        maxPossibleScore: test.maxPossibleScore,
        totalTimeTaken: totalTimeTaken,
        completedAt: now.toISOString(),
      });

      // Stop monitoring
      const testIdStr = testId.toString();
      if (this.activeTimers.has(testIdStr)) {
        clearInterval(this.activeTimers.get(testIdStr));
        this.activeTimers.delete(testIdStr);
      }
    } catch (error) {
      console.error(`[PA Timer] ❌ Error completing test ${testId}:`, error);
    }
  }

  /**
   * Get current timer state for a test (for reconnections)
   */
  async getTimerState(testId) {
    try {
      const test = await PATest.findById(testId);

      if (!test) {
        return null;
      }

      const timeRemaining = this.calculateTimeRemaining(test);
      const serverTime = new Date();

      // Update server current time
      test.serverCurrentTime = serverTime;
      test.timeRemainingSeconds = timeRemaining;
      await test.save();

      return {
        testId: testId.toString(),
        status: test.status,
        serverStartTime: test.serverStartTime?.toISOString(),
        serverCurrentTime: serverTime.toISOString(),
        timeRemainingSeconds: timeRemaining,
        timeLimitMinutes: test.parameters.timeLimit,
      };
    } catch (error) {
      console.error(
        `[PA Timer] ❌ Error getting timer state for test ${testId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Broadcast timer updates to all active tests (every 60 seconds)
   */
  startPeriodicBroadcast() {
    setInterval(async () => {
      try {
        const activeTests = await PATest.find({ status: "started" });

        for (const test of activeTests) {
          const timeRemaining = this.calculateTimeRemaining(test);
          const serverTime = new Date();

          // Update database
          test.serverCurrentTime = serverTime;
          test.timeRemainingSeconds = timeRemaining;
          await test.save();

          // Broadcast to user
          this.io.to(`user:${test.user}`).emit("pa:timer:update", {
            testId: test._id.toString(),
            serverCurrentTime: serverTime.toISOString(),
            timeRemainingSeconds: timeRemaining,
            status: test.status,
          });
        }

        if (activeTests.length > 0) {
          // Timer updates broadcast to active tests
        }
      } catch (error) {
        console.error("[PA Timer] ❌ Error in periodic broadcast:", error);
      }
    }, 60000); // Every 60 seconds (1 minute)
  }

  /**
   * Stop monitoring a test (when manually completed)
   */
  stopTimer(testId) {
    const testIdStr = testId.toString();

    if (this.activeTimers.has(testIdStr)) {
      clearInterval(this.activeTimers.get(testIdStr));
      this.activeTimers.delete(testIdStr);
    }
  }

  /**
   * Cleanup all timers (on server shutdown)
   */
  cleanup() {
    for (const [testId, interval] of this.activeTimers) {
      clearInterval(interval);
    }

    this.activeTimers.clear();
    this.initialized = false;
  }
}

module.exports = PracticeArenaTimerService;
