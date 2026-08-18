/**
 * Exam lifecycle: flips exam cohorts to inactive once their window closes.
 *
 * Two mechanisms, on purpose:
 *   1. A periodic sweeper, so a cohort goes inactive on time even if nobody
 *      touches it. This is what makes "the exam ends by itself" true.
 *   2. A lazy check on access (`deactivateIfEnded`), so a request that arrives
 *      between sweeps still sees the correct state.
 *
 * Access control never depends on this running: every protected route also
 * evaluates the window directly through `utils/examAccess`. Deactivation is
 * bookkeeping that keeps ended exams out of listings and dashboards.
 */

const Cohort = require("../models/Cohort");
const { EXAM_MODE, EXAM_STATE, getExamWindow } = require("../utils/examAccess");

const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;

let sweepTimer = null;

/**
 * Deactivates every exam cohort whose end time has passed.
 * Uses a single bulk update so the cost does not grow with cohort count.
 *
 * @returns {Promise<number>} how many cohorts were flipped
 */
async function deactivateEndedExams(now = new Date()) {
  const result = await Cohort.updateMany(
    {
      mode: EXAM_MODE,
      isActive: true,
      examEndTime: { $ne: null, $lte: now },
    },
    { $set: { isActive: false, updatedAt: now } }
  );

  const changed = result.modifiedCount ?? result.nModified ?? 0;
  if (changed > 0) {
    console.log(`⏱️  Exam sweeper: ${changed} exam cohort(s) moved to inactive`);
  }
  return changed;
}

/**
 * Lazily deactivates a single cohort whose exam has ended.
 *
 * Safe to call on any cohort: practice cohorts and open exams are ignored. The
 * passed document is mutated too, so the caller's copy matches the database
 * without a re-read.
 *
 * @returns {Promise<boolean>} true when this call performed the flip
 */
async function deactivateIfEnded(cohort, now = new Date()) {
  if (!cohort || cohort.mode !== EXAM_MODE || !cohort.isActive) return false;

  const window = getExamWindow(cohort, now);
  if (window.state !== EXAM_STATE.ENDED) return false;

  await Cohort.updateOne(
    { _id: cohort._id, isActive: true },
    { $set: { isActive: false, updatedAt: now } }
  );

  cohort.isActive = false;
  console.log(`⏱️  Exam ended: cohort ${cohort._id} moved to inactive`);
  return true;
}

/** Starts the periodic sweeper. Idempotent. */
function startExamSweeper({ intervalMs = DEFAULT_SWEEP_INTERVAL_MS } = {}) {
  if (sweepTimer) return sweepTimer;

  // Run once at boot so a restart during an exam settles immediately.
  deactivateEndedExams().catch((err) =>
    console.error("Exam sweeper (initial) failed:", err.message)
  );

  sweepTimer = setInterval(() => {
    deactivateEndedExams().catch((err) =>
      console.error("Exam sweeper failed:", err.message)
    );
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
  deactivateEndedExams,
  deactivateIfEnded,
  startExamSweeper,
  stopExamSweeper,
};
