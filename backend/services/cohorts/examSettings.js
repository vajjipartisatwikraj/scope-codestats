/**
 * Exam settings of a cohort: the fields the client needs to draw exam state, and the
 * validation of the exam window an admin enters.
 */
const { EXAM_MODE } = require("../../utils/examAccess");

/**
 * Fields the client needs to render exam state on cards and banners.
 */
const EXAM_LIST_FIELDS = "mode examStartTime examEndTime examDurationMinutes";

/**
 * Attempt fields needed to evaluate a student's personal clock.
 */
const ATTEMPT_FIELDS =
  "examAttemptStartedAt examDeadlineAt examSubmittedAt examSubmitReason";

/**
 * Parses the optional per-student exam duration.
 *
 * @returns {{value?: number|null, error?: object}}
 */
function parseExamDuration(raw) {
  if (raw === undefined || raw === null || raw === "") return { value: null };

  const minutes = Number(raw);
  if (!Number.isInteger(minutes) || minutes < 1) {
    return {
      error: {
        message: "Exam duration must be a whole number of minutes, at least 1",
        field: "examDurationMinutes",
      },
    };
  }
  if (minutes > 1440) {
    return {
      error: {
        message: "Exam duration cannot exceed 24 hours",
        field: "examDurationMinutes",
      },
    };
  }
  return { value: minutes };
}

/**
 * Validates the admin-supplied delivery mode and exam window.
 *
 * Returns `{ values }` to spread onto the cohort, or `{ error }` to send back as
 * a 400. Switching to practice clears the window so an exam cohort demoted to
 * practice cannot keep a stale schedule.
 *
 * @param {{mode?: string, examStartTime?: any, examEndTime?: any}} input
 */
function parseExamModeInput(input = {}) {
  const { mode, examStartTime, examEndTime, examDurationMinutes } = input;

  if (mode === undefined) return { values: {} };

  const normalized = String(mode).toLowerCase();
  if (!["practice", "exam"].includes(normalized)) {
    return {
      error: {
        message: 'Invalid mode: expected "practice" or "exam"',
        field: "mode",
      },
    };
  }

  if (normalized !== EXAM_MODE) {
    return {
      values: {
        mode: "practice",
        examStartTime: null,
        examEndTime: null,
        examDurationMinutes: null,
      },
    };
  }

  const start = examStartTime ? new Date(examStartTime) : null;
  const end = examEndTime ? new Date(examEndTime) : null;

  if (!start || Number.isNaN(start.getTime())) {
    return {
      error: {
        message: "Exam cohorts require a valid exam start time",
        field: "examStartTime",
      },
    };
  }
  if (!end || Number.isNaN(end.getTime())) {
    return {
      error: {
        message: "Exam cohorts require a valid exam end time",
        field: "examEndTime",
      },
    };
  }
  if (end <= start) {
    return {
      error: {
        message: "Exam end time must be after the exam start time",
        field: "examEndTime",
      },
    };
  }

  const duration = parseExamDuration(examDurationMinutes);
  if (duration.error) return { error: duration.error };

  // A duration longer than the window itself would mean nobody could ever use it
  // all, which is almost always a typo.
  const windowMinutes = Math.floor((end - start) / 60000);
  if (duration.value !== null && duration.value > windowMinutes) {
    return {
      error: {
        message:
          `Exam duration (${duration.value} min) cannot exceed the exam window ` +
          `(${windowMinutes} min). Widen the window or shorten the duration.`,
        field: "examDurationMinutes",
      },
    };
  }

  return {
    values: {
      mode: EXAM_MODE,
      examStartTime: start,
      examEndTime: end,
      examDurationMinutes: duration.value,
    },
  };
}

module.exports = {
  EXAM_LIST_FIELDS,
  ATTEMPT_FIELDS,
  parseExamModeInput,
};
