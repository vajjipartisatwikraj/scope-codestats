/**
 * Exam lifecycle.
 *
 * Two jobs:
 *   1. Finalise attempts whose personal deadline has passed, so a student who
 *      walks away is submitted at their deadline rather than left open.
 *   2. Flip an exam cohort to inactive once its joining window has closed *and*
 *      no attempt is still running, so ended exams drop out of listings.
 *
 * Both run on a periodic sweeper and lazily on access, because a request that
 * arrives between sweeps must still see the correct state.
 *
 * Access control never depends on this running: every protected route evaluates
 * the attempt directly through `utils/examAccess`. This is bookkeeping.
 */

const Cohort = require("../models/Cohort");
const UserCohort = require("../models/UserCohort");
const {
  EXAM_MODE,
  EXAM_STATE,
  ATTEMPT_STATE,
  getExamWindow,
  getExamAttempt,
} = require("../utils/examAccess");

const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;

let sweepTimer = null;

/**
 * Submits every attempt whose deadline has passed.
 *
 * This is what makes "when the time ends the exam is submitted" true even for a
 * student who closed their laptop. Scores are already stored per submission, so
 * finalising is only a matter of stamping the attempt.
 *
 * @returns {Promise<number>} how many attempts were finalised
 */
async function autoSubmitExpiredAttempts(now = new Date()) {
  const result = await UserCohort.updateMany(
    {
      examAttemptStartedAt: { $ne: null },
      examSubmittedAt: null,
      examDeadlineAt: { $ne: null, $lte: now },
    },
    {
      $set: {
        examSubmittedAt: now,
        examSubmitReason: "time_up",
        status: "completed",
        completedAt: now,
        updatedAt: now,
      },
    }
  );

  const changed = result.modifiedCount ?? result.nModified ?? 0;
  if (changed > 0) {
    console.log(`⏱️  Exam sweeper: ${changed} attempt(s) auto-submitted on time up`);
  }
  return changed;
}

/**
 * Finalises a single expired attempt.
 *
 * Safe to call on any enrollment: practice cohorts, unstarted and already
 * submitted attempts are ignored. The passed document is mutated too, so the
 * caller's copy matches the database without a re-read.
 *
 * @returns {Promise<boolean>} true when this call performed the submission
 */
async function autoSubmitIfExpired(cohort, enrollment, now = new Date()) {
  if (!cohort || cohort.mode !== EXAM_MODE || !enrollment) return false;

  const attempt = getExamAttempt(cohort, enrollment, now);
  if (attempt.attemptState !== ATTEMPT_STATE.TIME_UP) return false;

  await UserCohort.updateOne(
    { _id: enrollment._id, examSubmittedAt: null },
    {
      $set: {
        examSubmittedAt: now,
        examSubmitReason: "time_up",
        status: "completed",
        completedAt: now,
        updatedAt: now,
      },
    }
  );

  enrollment.examSubmittedAt = now;
  enrollment.examSubmitReason = "time_up";

  console.log(
    `⏱️  Exam time up: attempt auto-submitted for user ${enrollment.user} ` +
      `in cohort ${cohort._id}`
  );
  return true;
}

/**
 * Deactivates exam cohorts whose joining window has closed and which have no
 * attempt still running.
 *
 * The second condition matters now that attempts can outlive the window: a
 * cohort must not be archived out from under someone who is still writing.
 *
 * @returns {Promise<number>} how many cohorts were flipped
 */
async function deactivateEndedExams(now = new Date()) {
  const candidates = await Cohort.find({
    mode: EXAM_MODE,
    isActive: true,
    examEndTime: { $ne: null, $lte: now },
  }).select("_id examStartTime examEndTime examDurationMinutes mode");

  if (candidates.length === 0) return 0;

  const candidateIds = candidates.map((c) => c._id);

  // Any attempt still inside its own deadline keeps its cohort active.
  const liveAttempts = await UserCohort.find({
    cohort: { $in: candidateIds },
    examAttemptStartedAt: { $ne: null },
    examSubmittedAt: null,
    examDeadlineAt: { $gt: now },
  })
    .select("cohort")
    .lean();

  const busyCohortIds = new Set(liveAttempts.map((a) => a.cohort.toString()));

  const closable = candidateIds.filter((id) => !busyCohortIds.has(id.toString()));
  if (closable.length === 0) return 0;

  const result = await Cohort.updateMany(
    { _id: { $in: closable }, isActive: true },
    { $set: { isActive: false, updatedAt: now } }
  );

  const changed = result.modifiedCount ?? result.nModified ?? 0;
  if (changed > 0) {
    console.log(`⏱️  Exam sweeper: ${changed} exam cohort(s) moved to inactive`);
  }
  return changed;
}

/**
 * Lazily deactivates a single cohort whose window has closed.
 *
 * Skips the flip while any attempt is still running, matching the sweeper.
 *
 * @returns {Promise<boolean>} true when this call performed the flip
 */
async function deactivateIfEnded(cohort, now = new Date()) {
  if (!cohort || cohort.mode !== EXAM_MODE || !cohort.isActive) return false;

  const window = getExamWindow(cohort, now);
  if (window.state !== EXAM_STATE.ENDED) return false;

  const liveAttempt = await UserCohort.exists({
    cohort: cohort._id,
    examAttemptStartedAt: { $ne: null },
    examSubmittedAt: null,
    examDeadlineAt: { $gt: now },
  });
  if (liveAttempt) return false;

  await Cohort.updateOne(
    { _id: cohort._id, isActive: true },
    { $set: { isActive: false, updatedAt: now } }
  );

  cohort.isActive = false;
  console.log(`⏱️  Exam ended: cohort ${cohort._id} moved to inactive`);
  return true;
}

/** One sweep: finalise expired attempts, then archive finished cohorts. */
async function runSweep() {
  // Order matters. Auto-submitting first means a cohort whose last attempt just
  // expired can be archived in the same pass.
  await autoSubmitExpiredAttempts();
  await deactivateEndedExams();
}

/** Starts the periodic sweeper. Idempotent. */
function startExamSweeper({ intervalMs = DEFAULT_SWEEP_INTERVAL_MS } = {}) {
  if (sweepTimer) return sweepTimer;

  // Run once at boot so a restart during an exam settles immediately.
  runSweep().catch((err) =>
    console.error("Exam sweeper (initial) failed:", err.message)
  );

  sweepTimer = setInterval(() => {
    runSweep().catch((err) => console.error("Exam sweeper failed:", err.message));
  }, intervalMs);

  // Never hold the event loop open for this.
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();

  console.log(`⏱️  Exam sweeper started (every ${Math.round(intervalMs / 1000)}s)`);
  return sweepTimer;
}

function stopExamSweeper() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

module.exports = {
  DEFAULT_SWEEP_INTERVAL_MS,
  autoSubmitExpiredAttempts,
  autoSubmitIfExpired,
  deactivateEndedExams,
  deactivateIfEnded,
  runSweep,
  startExamSweeper,
  stopExamSweeper,
};
