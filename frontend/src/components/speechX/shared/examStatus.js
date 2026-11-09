/**
 * The student's status for a test:
 *   completed     they ended the test
 *   live          the test window is open (started or not yet)
 *   upcoming      the window has not opened
 *   not_attempted the window closed and they never started
 *   ended         the window closed while they were still mid-test (it is about to be closed for them)
 *   closed        the window is over (staff lists, where there is no single student's attempt)
 *
 * Logic copied from SpeechTest/overview/examStatus.js. The old `dot` hex colours are gone: the
 * look (tone and icon) now lives in ExamStatusBadge.jsx; `tone` here is a ui Badge tone.
 *
 * @param {"upcoming"|"live"|"ended"|null} windowState  follows the server clock
 * @param {object|null} attempt  the student's attempt, if any
 */
export const examStatusOf = (windowState, attempt) => {
  if (attempt?.status === "completed") return "completed";
  if (windowState === "live") return "live";
  if (windowState === "upcoming") return "upcoming";
  return attempt ? "ended" : "not_attempted";
};

/** Word, badge tone and whether the indicator pulses, for each exam status. */
export const EXAM_STATUS_META = {
  live: { label: "Live", tone: "success", pulse: true },
  completed: { label: "Completed", tone: "neutral", pulse: false },
  upcoming: { label: "Upcoming", tone: "info", pulse: false },
  not_attempted: { label: "Not attempted", tone: "warning", pulse: false },
  ended: { label: "Ended", tone: "neutral", pulse: false },
  closed: { label: "Closed", tone: "neutral", pulse: false },
};

/** Word, badge tone and pulse for each status of one section of a test. */
export const SECTION_STATUS_BADGE_META = {
  not_started: { label: "Not started", tone: "neutral", pulse: false },
  in_progress: { label: "In progress", tone: "info", pulse: false },
  queued: { label: "Waiting for score", tone: "warning", pulse: true },
  scoring: { label: "Waiting for score", tone: "warning", pulse: true },
  scored: { label: "Score ready", tone: "success", pulse: false },
  failed: { label: "Scoring failed", tone: "danger", pulse: false },
  unscored: { label: "Not scored", tone: "neutral", pulse: false },
};
