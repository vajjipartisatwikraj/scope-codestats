/**
 * The exam gate for cohort requests.
 *
 *   blockedByExamWindow       rejects a student request when their exam attempt is not live
 *   ensureExamAttemptStarted  starts a student's attempt (the clock) the first time they open the exam
 *
 * Used by the cohort, module, question, submission and SQL controllers, so that neither
 * the joining window nor a personal deadline can be skipped by calling a route directly.
 */
const UserCohort = require("../../models/UserCohort");
const examLifecycle = require("../examLifecycleService");
const { EXAM_MODE, computeAttemptDeadline, getExamAccessDenial } = require("../../utils/examAccess");
const log = require("../../utils/logger").scope("COHORT-EXAM");

/**
 * Rejects a student request when their exam attempt is not currently live, and
 * answers the response itself.
 *
 * Every content and execution route funnels through this, so neither the joining
 * window nor a personal deadline can be bypassed by hitting a route directly.
 * Admins and teachers pass through.
 *
 * The student's enrollment carries the attempt clock, so it is loaded here unless
 * the caller already has it. That keeps every call site to a single line.
 *
 * @param {object} res
 * @param {object} cohort
 * @param {object} [options]
 * @param {boolean} [options.isPrivileged]
 * @param {boolean} [options.allowBeforeStart]
 * @param {string}  [options.userId]      required for exam cohorts unless
 *   `enrollment` is supplied
 * @param {object|null} [options.enrollment]  already-loaded UserCohort row
 * @returns {Promise<boolean>} true when the response has already been sent.
 */
async function blockedByExamWindow(res, cohort, options = {}) {
  const {
    isPrivileged = false,
    allowBeforeStart = false,
    userId = null,
    enrollment: providedEnrollment,
  } = options;

  if (isPrivileged) return false;
  if (!cohort || cohort.mode !== EXAM_MODE) return false;

  const enrollment =
    providedEnrollment !== undefined
      ? providedEnrollment
      : userId
      ? await UserCohort.findOne({ user: userId, cohort: cohort._id }).select(
          "examAttemptStartedAt examDeadlineAt examSubmittedAt examSubmitReason user"
        )
      : null;

  const denial = getExamAccessDenial(cohort, {
    enrollment,
    isPrivileged,
    allowBeforeStart,
  });
  if (!denial) return false;

  // A deadline that has passed is finalised here, so "time up" is recorded at the
  // first request after it rather than waiting for the sweeper.
  if (denial.body.reason === "exam_time_up" && enrollment) {
    await examLifecycle
      .autoSubmitIfExpired(cohort, enrollment)
      .catch((err) => log.error("Exam auto-submit failed:", err.message));
  }

  // A closed window also drops the cohort out of the active state, so listings
  // and dashboards agree with what this gate just decided. Skipped while any
  // attempt is still running, which the service checks.
  if (denial.body.reason === "exam_ended") {
    await examLifecycle
      .deactivateIfEnded(cohort)
      .catch((err) => log.error("Exam deactivation failed:", err.message));
  }

  res.status(denial.status).json(denial.body);
  return true;
}

/**
 * Starts a student's attempt if it has not begun, stamping the anchor and the
 * personal deadline.
 *
 * Idempotent, and the write is conditional on `examAttemptStartedAt` still being
 * null, so two concurrent requests cannot produce two different deadlines.
 *
 * @returns {Promise<object|null>} the enrollment, or null when not applicable
 */
async function ensureExamAttemptStarted(cohort, userId) {
  if (!cohort || cohort.mode !== EXAM_MODE) return null;

  const enrollment = await UserCohort.findOne({
    user: userId,
    cohort: cohort._id,
  });
  if (!enrollment) return null;
  if (enrollment.examSubmittedAt) return enrollment;
  if (enrollment.examAttemptStartedAt) return enrollment;

  const startedAt = new Date();
  const deadlineAt = computeAttemptDeadline(cohort, startedAt);

  const updated = await UserCohort.findOneAndUpdate(
    { _id: enrollment._id, examAttemptStartedAt: null },
    { $set: { examAttemptStartedAt: startedAt, examDeadlineAt: deadlineAt } },
    { new: true }
  );

  // A concurrent request won the race; its stamp is the one that counts.
  const result = updated || (await UserCohort.findById(enrollment._id));

  log.debug(
    `⏳ Exam attempt started for user ${userId} in cohort ${cohort._id}, ` +
      `deadline ${result?.examDeadlineAt?.toISOString?.() || "n/a"}`
  );

  return result;
}

module.exports = {
  blockedByExamWindow,
  ensureExamAttemptStarted,
};
