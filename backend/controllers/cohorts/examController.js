/**
 * Exam attempts controller.
 *
 * A student's exam attempt: the live status and clock, proctoring events, and finishing the exam.
 *
 * Wired to URLs in routes/cohorts/exam.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const UserCohort = require("../../models/UserCohort");
const cohortProctorService = require("../../services/cohortProctorService");
const examLifecycle = require("../../services/examLifecycleService");
const { ATTEMPT_STATE, EXAM_MODE, EXAM_STATE, getExamAccessDenial, getExamAttempt } = require("../../utils/examAccess");
const { EXAM_LIST_FIELDS } = require("../../services/cohorts/examSettings");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const log = require("../../utils/logger").scope("COHORT-EXAM");

/**
 * Exam window heartbeat.
 *
 * Cheap, poll-friendly endpoint the solving screens hit on a timer so a student
 * who is already inside an exam learns that it closed without having to make a
 * content request first. The server clock is the only clock that counts, so the
 * response carries `serverTime` and the client renders its countdown from the
 * returned offsets rather than from `Date.now()`.
 *
 * Deliberately lightweight: no modules, no progress, no leaderboard.
 */
const getExamStatus = async (req, res) => {
  try {
    const cohortId = req.params.id;

    const cohort = await Cohort.findById(cohortId).select(
      `title isActive isDraft accessType eligibleUsers ${EXAM_LIST_FIELDS}`
    );

    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    const isPrivileged = isAdminOrTeacher(req.user);

    // Only eligible users learn anything about the cohort from this endpoint.
    if (!isPrivileged) {
      const isEligible = cohort.isOpenTo(req.user.id);
      if (!isEligible) {
        return res.status(403).json({
          message: "You are not eligible for this cohort",
          reason: "not_eligible",
        });
      }
    }

    // The attempt clock lives on the enrollment, so the heartbeat reports this
    // student's own deadline rather than the cohort-wide one.
    const enrollment =
      !isPrivileged && cohort.mode === EXAM_MODE
        ? await UserCohort.findOne({ user: req.user.id, cohort: cohortId })
        : null;

    // A deadline that has already passed is finalised here, so a student whose
    // tab was asleep is submitted the moment it wakes up.
    if (enrollment) {
      await examLifecycle
        .autoSubmitIfExpired(cohort, enrollment)
        .catch((err) => log.error("Exam auto-submit failed:", err.message));
    }

    const attempt = getExamAttempt(cohort, enrollment);

    // Keep the stored cohort state honest even if the sweeper has not fired yet.
    // Skipped while an attempt is still running, which the service checks.
    if (attempt.state === EXAM_STATE.ENDED) {
      await examLifecycle
        .deactivateIfEnded(cohort)
        .catch((err) => log.error("Exam deactivation failed:", err.message));
    }

    const denial = getExamAccessDenial(cohort, { enrollment, isPrivileged });

    res.json({
      cohortId,
      title: cohort.title,
      isPrivileged,
      submitted: attempt.attemptState === ATTEMPT_STATE.SUBMITTED,
      accessible: denial === null,
      reason: denial?.body.reason ?? null,
      exam: attempt,
    });
  } catch (err) {
    log.error("Error fetching exam status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * PROCTORING — record an integrity event reported by the exam tab.
 *
 * The client reports only that something happened; every counter is incremented
 * here, for the authenticated user, on an exam cohort they are enrolled in. A
 * tampered client cannot lower its own count or write someone else's.
 *
 * Practice cohorts are silently ignored so the endpoint is safe to call from any
 * cohort screen.
 */
const recordProctorEvent = async (req, res) => {
  try {
    const cohortId = req.params.id;
    const { type, detail } = req.body || {};

    const cohort = await Cohort.findById(cohortId).select(
      `accessType eligibleUsers ${EXAM_LIST_FIELDS}`
    );
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Nothing is tracked outside exam mode.
    if (cohort.mode !== EXAM_MODE) {
      return res.json({ tracked: false, reason: "not_an_exam" });
    }

    // Admins and teachers previewing an exam are not proctored.
    if (isAdminOrTeacher(req.user)) {
      return res.json({ tracked: false, reason: "privileged" });
    }

    const isEligible = cohort.isOpenTo(req.user.id);
    if (!isEligible) {
      return res
        .status(403)
        .json({ message: "You are not eligible for this cohort" });
    }

    // `session_start` marks attendance rather than logging a violation.
    if (type === "session_start") {
      await cohortProctorService.recordExamEntry(cohort, req.user.id);
      return res.json({ tracked: true, type: "session_start" });
    }

    const counters = await cohortProctorService.recordViolation(
      cohort,
      req.user.id,
      type,
      detail
    );

    res.json({ tracked: true, type, counters });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ message: err.message });
    }
    log.error("Error recording proctor event:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * END TEST — the student finishes their own exam.
 *
 * Everything they submitted is already recorded, so this only records that they
 * are done and closes the cohort for them. Idempotent: a second call reports the
 * original finish time rather than failing.
 */
const finishExam = async (req, res) => {
  try {
    const cohortId = req.params.id;
    const userId = req.user.id;

    const cohort = await Cohort.findById(cohortId).select(
      `title ${EXAM_LIST_FIELDS}`
    );
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }
    if (cohort.mode !== EXAM_MODE) {
      return res
        .status(400)
        .json({ message: "This cohort is not an exam", reason: "not_an_exam" });
    }

    const enrollment = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    });
    if (!enrollment) {
      return res
        .status(403)
        .json({ message: "Not enrolled in this cohort", reason: "not_enrolled" });
    }

    if (!enrollment.examSubmittedAt) {
      enrollment.examSubmittedAt = new Date();
      enrollment.examSubmitReason = "manual";
      enrollment.status = "completed";
      enrollment.completedAt = enrollment.examSubmittedAt;
      await enrollment.save();
      log.debug(`📕 Exam ended by user ${userId} for cohort ${cohortId}`);
    }

    // Mirror onto the proctor record so the report has the finish time and the
    // score without waiting for a recalculation.
    await cohortProctorService
      .recordExamSubmission(
        await Cohort.findById(cohortId).select(`accessType eligibleUsers ${EXAM_LIST_FIELDS}`),
        userId,
        enrollment.examSubmittedAt,
        enrollment.totalScore
      )
      .catch((err) =>
        log.error("Proctor submission mirror failed:", err.message)
      );

    res.json({
      message: "Exam submitted",
      examSubmittedAt: enrollment.examSubmittedAt,
      examSubmitReason: enrollment.examSubmitReason,
      totalScore: enrollment.totalScore,
    });
  } catch (err) {
    log.error("Error ending exam:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getExamStatus,
  recordProctorEvent,
  finishExam,
};
