/**
 * Exam-mode access rules.
 *
 * A cohort in `exam` mode is visible to its eligible users the moment it is
 * published, but its content is only reachable inside
 * [examStartTime, examEndTime]. Practice cohorts are unaffected.
 *
 * This module is deliberately pure: it takes a cohort-like object and a clock
 * and returns a decision. The routes own the HTTP response, the lifecycle
 * service owns the state change, so all three can be reasoned about — and
 * tested — separately.
 *
 * The server clock is authoritative. Timings are returned to the client for
 * display only; a tampered client clock can never widen the window because
 * every protected route re-checks here.
 */

const EXAM_MODE = "exam";
const PRACTICE_MODE = "practice";

/** Window states. `practice` means the cohort is not time-boxed at all. */
const EXAM_STATE = {
  PRACTICE: "practice",
  NOT_STARTED: "not_started",
  OPEN: "open",
  ENDED: "ended",
  /** Exam mode with an incomplete window: treated as closed, never as open. */
  MISCONFIGURED: "misconfigured",
};

const isExamCohort = (cohort) => cohort?.mode === EXAM_MODE;

const toTime = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

/**
 * Resolves the current state of a cohort's exam window.
 *
 * @param {object} cohort   Cohort document or lean object.
 * @param {Date}   [now]    Injected clock, for tests.
 * @returns {{mode: string, isExam: boolean, state: string, startsAt: string|null,
 *   endsAt: string|null, msUntilStart: number|null, msRemaining: number|null,
 *   serverTime: string}}
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
      msUntilStart: null,
      msRemaining: null,
      serverTime,
    };
  }

  const startMs = toTime(cohort.examStartTime);
  const endMs = toTime(cohort.examEndTime);

  const base = {
    mode: EXAM_MODE,
    isExam: true,
    startsAt: startMs === null ? null : new Date(startMs).toISOString(),
    endsAt: endMs === null ? null : new Date(endMs).toISOString(),
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

/** True when a student may currently open the cohort's content. */
function isExamAccessOpen(cohort, now = new Date()) {
  const state = getExamWindow(cohort, now).state;
  return state === EXAM_STATE.PRACTICE || state === EXAM_STATE.OPEN;
}

/**
 * Decides whether to reject a student request on exam-window grounds.
 *
 * @param {object} cohort
 * @param {object} [options]
 * @param {boolean} [options.isPrivileged]     Admins and teachers are never blocked,
 *   so they can review an exam before it opens and after it closes.
 * @param {boolean} [options.allowBeforeStart] Lets a pre-start request through.
 *   Used for enrolment, which must succeed the instant the window opens without
 *   depending on the order in which the client fires its requests.
 * @param {Date} [options.now]
 * @returns {null|{status: number, body: object}} `null` when access is allowed.
 */
function getExamAccessDenial(cohort, options = {}) {
  const { isPrivileged = false, allowBeforeStart = false, now = new Date() } = options;

  if (isPrivileged) return null;

  const window = getExamWindow(cohort, now);
  if (window.state === EXAM_STATE.PRACTICE || window.state === EXAM_STATE.OPEN) {
    return null;
  }

  if (window.state === EXAM_STATE.NOT_STARTED) {
    if (allowBeforeStart) return null;
    return {
      status: 403,
      body: {
        message: "This exam has not started yet",
        reason: "exam_not_started",
        error: "EXAM_NOT_STARTED",
        exam: window,
      },
    };
  }

  if (window.state === EXAM_STATE.MISCONFIGURED) {
    return {
      status: 403,
      body: {
        message: "This exam is not scheduled correctly. Contact your administrator.",
        reason: "exam_misconfigured",
        error: "EXAM_MISCONFIGURED",
        exam: window,
      },
    };
  }

  return {
    status: 403,
    body: {
      message: "This exam has ended",
      reason: "exam_ended",
      error: "EXAM_ENDED",
      exam: window,
    },
  };
}

module.exports = {
  EXAM_MODE,
  PRACTICE_MODE,
  EXAM_STATE,
  isExamCohort,
  getExamWindow,
  isExamAccessOpen,
  getExamAccessDenial,
};
