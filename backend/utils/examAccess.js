/**
 * Exam-mode access rules.
 *
 * A cohort in `exam` mode is visible to its eligible users the moment it is
 * published, but its content is only reachable while that student's attempt is
 * live. Practice cohorts are unaffected.
 *
 * Two shapes of exam:
 *
 *   Shared clock (`examDurationMinutes` unset — the original behaviour)
 *     Everyone works inside [examStartTime, examEndTime] and stops together.
 *
 *   Per-student clock (`examDurationMinutes` set)
 *     [examStartTime, examEndTime] becomes a *joining* window. A student may
 *     begin at any point inside it and then gets their own duration. Their
 *     personal deadline may fall after `examEndTime`: someone who starts fifteen
 *     minutes before the window shuts still gets their full time. Once the
 *     window closes nobody new may start, but attempts already running continue
 *     until their own deadline.
 *
 * This module is deliberately pure: it takes a cohort, an enrollment and a
 * clock, and returns a decision. The routes own the HTTP response, the lifecycle
 * service owns the state changes, so all three can be reasoned about — and
 * tested — separately.
 *
 * The server clock is authoritative. Timings are returned to the client for
 * display only; a tampered client clock can never widen the window, because
 * every protected route re-checks here.
 */

const EXAM_MODE = "exam";
const PRACTICE_MODE = "practice";

/** State of the cohort-wide joining window. */
const EXAM_STATE = {
  PRACTICE: "practice",
  /** Before `examStartTime`: nobody may start yet. */
  NOT_STARTED: "not_started",
  /** Inside the window: students may start. */
  OPEN: "open",
  /** After `examEndTime`: no new starts, but running attempts continue. */
  ENDED: "ended",
  /** Exam mode with an incomplete window: treated as closed, never as open. */
  MISCONFIGURED: "misconfigured",
};

/** State of one student's attempt. */
const ATTEMPT_STATE = {
  /** Not an exam, so there is no attempt to speak of. */
  NONE: "none",
  /** Eligible but has not opened the exam yet. */
  NOT_STARTED: "not_started",
  /** Clock running. */
  IN_PROGRESS: "in_progress",
  /** Personal deadline passed without an explicit submit. */
  TIME_UP: "time_up",
  /** Finished, by the student or by the clock. */
  SUBMITTED: "submitted",
};

const isExamCohort = (cohort) => cohort?.mode === EXAM_MODE;

const toTime = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

/**
 * Resolves the state of a cohort's joining window.
 *
 * @param {object} cohort   Cohort document or lean object.
 * @param {Date}   [now]    Injected clock, for tests.
 */
function getExamWindow(cohort, now = new Date()) {
  const nowMs = now.getTime();
  const serverTime = new Date(nowMs).toISOString();

  if (!isExamCohort(cohort)) {
    return {
      mode: cohort?.mode || PRACTICE_MODE,
      isExam: false,
      state: EXAM_STATE.PRACTICE,
      startsAt: null,
      endsAt: null,
      durationMinutes: null,
      msUntilStart: null,
      msRemaining: null,
      serverTime,
    };
  }

  const startMs = toTime(cohort.examStartTime);
  const endMs = toTime(cohort.examEndTime);
  const durationMinutes =
    Number.isInteger(cohort.examDurationMinutes) && cohort.examDurationMinutes > 0
      ? cohort.examDurationMinutes
      : null;

  const base = {
    mode: EXAM_MODE,
    isExam: true,
    startsAt: startMs === null ? null : new Date(startMs).toISOString(),
    endsAt: endMs === null ? null : new Date(endMs).toISOString(),
    durationMinutes,
    serverTime,
  };

  // An exam without a usable window stays shut. Failing open here would turn a
  // data-entry mistake into an unrestricted exam.
  if (startMs === null || endMs === null || endMs <= startMs) {
    return {
      ...base,
      state: EXAM_STATE.MISCONFIGURED,
      msUntilStart: null,
      msRemaining: null,
    };
  }

  if (nowMs < startMs) {
    return {
      ...base,
      state: EXAM_STATE.NOT_STARTED,
      msUntilStart: startMs - nowMs,
      msRemaining: endMs - nowMs,
    };
  }

  if (nowMs >= endMs) {
    return {
      ...base,
      state: EXAM_STATE.ENDED,
      msUntilStart: 0,
      msRemaining: 0,
    };
  }

  return {
    ...base,
    state: EXAM_STATE.OPEN,
    msUntilStart: 0,
    msRemaining: endMs - nowMs,
  };
}

/**
 * The deadline a fresh attempt started at `startedAt` would carry.
 *
 * With a duration configured this is `startedAt + duration`, which may land after
 * the cohort's `examEndTime` by design. Without one it is `examEndTime`, so the
 * whole group stops together.
 *
 * @returns {Date|null} null when the cohort has no usable window
 */
function computeAttemptDeadline(cohort, startedAt) {
  const endMs = toTime(cohort?.examEndTime);
  if (endMs === null) return null;

  const durationMinutes = cohort?.examDurationMinutes;
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return new Date(endMs);
  }

  const startMs = toTime(startedAt);
  if (startMs === null) return new Date(endMs);

  return new Date(startMs + durationMinutes * 60 * 1000);
}

/**
 * Resolves one student's attempt against the cohort.
 *
 * @param {object} cohort
 * @param {object|null} enrollment  UserCohort document or lean object.
 * @param {Date} [now]
 */
function getExamAttempt(cohort, enrollment, now = new Date()) {
  const window = getExamWindow(cohort, now);

  if (!window.isExam) {
    return {
      ...window,
      attemptState: ATTEMPT_STATE.NONE,
      attemptStartedAt: null,
      deadlineAt: null,
      submittedAt: null,
      submitReason: null,
      canStart: true,
      canContinue: true,
      msRemaining: null,
    };
  }

  const nowMs = now.getTime();
  const startedAt = enrollment?.examAttemptStartedAt || null;
  const submittedAt = enrollment?.examSubmittedAt || null;

  // The stored deadline wins so that editing the cohort's duration mid-exam
  // cannot move a deadline that a student is already working against.
  const storedDeadline = enrollment?.examDeadlineAt || null;
  const deadline = startedAt
    ? storedDeadline || computeAttemptDeadline(cohort, startedAt)
    : null;
  const deadlineMs = toTime(deadline);

  const joinOpen = window.state === EXAM_STATE.OPEN;

  if (submittedAt) {
    return {
      ...window,
      attemptState: ATTEMPT_STATE.SUBMITTED,
      attemptStartedAt: startedAt ? new Date(startedAt).toISOString() : null,
      deadlineAt: deadline ? new Date(deadline).toISOString() : null,
      submittedAt: new Date(submittedAt).toISOString(),
      submitReason: enrollment?.examSubmitReason || null,
      canStart: false,
      canContinue: false,
      msRemaining: 0,
    };
  }

  if (!startedAt) {
    // Not begun: whether they may is purely the joining window's business. A
    // preview of the deadline they would get helps the client show "you will get
    // N minutes".
    const previewDeadline = computeAttemptDeadline(cohort, now);
    return {
      ...window,
      attemptState: ATTEMPT_STATE.NOT_STARTED,
      attemptStartedAt: null,
      deadlineAt: null,
      previewDeadlineAt: previewDeadline
        ? new Date(previewDeadline).toISOString()
        : null,
      submittedAt: null,
      submitReason: null,
      canStart: joinOpen,
      canContinue: false,
      msRemaining: window.durationMinutes
        ? window.durationMinutes * 60 * 1000
        : window.msRemaining,
    };
  }

  // Running or expired. Note this deliberately ignores `examEndTime`: an attempt
  // that began inside the window runs to its own deadline even after the window
  // has closed.
  const expired = deadlineMs !== null && nowMs >= deadlineMs;

  return {
    ...window,
    attemptState: expired ? ATTEMPT_STATE.TIME_UP : ATTEMPT_STATE.IN_PROGRESS,
    attemptStartedAt: new Date(startedAt).toISOString(),
    deadlineAt: deadline ? new Date(deadline).toISOString() : null,
    submittedAt: null,
    submitReason: null,
    canStart: false,
    canContinue: !expired,
    msRemaining: expired ? 0 : Math.max(deadlineMs - nowMs, 0),
  };
}

/** True when this student may currently work on the exam. */
function isExamAccessOpen(cohort, enrollment, now = new Date()) {
  const attempt = getExamAttempt(cohort, enrollment, now);
  if (!attempt.isExam) return true;
  return attempt.canContinue || attempt.canStart;
}

/**
 * Decides whether to reject a student request on exam grounds.
 *
 * @param {object} cohort
 * @param {object} [options]
 * @param {object|null} [options.enrollment]  The student's UserCohort row.
 * @param {boolean} [options.isPrivileged]    Admins and teachers are never blocked,
 *   so they can review an exam before it opens and after it closes.
 * @param {boolean} [options.allowBeforeStart] Lets a pre-window request through.
 *   Used for enrolment, which must succeed the instant the window opens without
 *   depending on the order in which the client fires its requests.
 * @param {Date} [options.now]
 * @returns {null|{status:number, body:object}} `null` when access is allowed.
 */
function getExamAccessDenial(cohort, options = {}) {
  const {
    enrollment = null,
    isPrivileged = false,
    allowBeforeStart = false,
    now = new Date(),
  } = options;

  if (isPrivileged) return null;

  const attempt = getExamAttempt(cohort, enrollment, now);
  if (!attempt.isExam) return null;

  // Already finished, by hand or by the clock.
  if (attempt.attemptState === ATTEMPT_STATE.SUBMITTED) {
    return {
      status: 403,
      body: {
        message:
          attempt.submitReason === "time_up"
            ? "Your exam time is over and the exam has been submitted"
            : "You have already ended this exam",
        reason:
          attempt.submitReason === "time_up" ? "exam_time_up" : "exam_submitted",
        error:
          attempt.submitReason === "time_up" ? "EXAM_TIME_UP" : "EXAM_SUBMITTED",
        exam: attempt,
      },
    };
  }

  // Ran out of time; the caller is expected to finalise the attempt.
  if (attempt.attemptState === ATTEMPT_STATE.TIME_UP) {
    return {
      status: 403,
      body: {
        message: "Your exam time is over",
        reason: "exam_time_up",
        error: "EXAM_TIME_UP",
        exam: attempt,
      },
    };
  }

  // An attempt under way is always allowed to continue, even past examEndTime.
  if (attempt.attemptState === ATTEMPT_STATE.IN_PROGRESS) return null;

  // Not started: the joining window decides.
  if (attempt.state === EXAM_STATE.OPEN) return null;

  if (attempt.state === EXAM_STATE.NOT_STARTED) {
    if (allowBeforeStart) return null;
    return {
      status: 403,
      body: {
        message: "This exam has not started yet",
        reason: "exam_not_started",
        error: "EXAM_NOT_STARTED",
        exam: attempt,
      },
    };
  }

  if (attempt.state === EXAM_STATE.MISCONFIGURED) {
    return {
      status: 403,
      body: {
        message: "This exam is not scheduled correctly. Contact your administrator.",
        reason: "exam_misconfigured",
        error: "EXAM_MISCONFIGURED",
        exam: attempt,
      },
    };
  }

  // Window closed and they never started.
  return {
    status: 403,
    body: {
      message: "This exam has ended",
      reason: "exam_ended",
      error: "EXAM_ENDED",
      exam: attempt,
    },
  };
}

module.exports = {
  EXAM_MODE,
  PRACTICE_MODE,
  EXAM_STATE,
  ATTEMPT_STATE,
  isExamCohort,
  getExamWindow,
  computeAttemptDeadline,
  getExamAttempt,
  isExamAccessOpen,
  getExamAccessDenial,
};
