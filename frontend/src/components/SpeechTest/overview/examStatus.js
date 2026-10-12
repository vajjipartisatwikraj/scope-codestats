/**
 * The student's status for a test, in the words shown on the blue card:
 *   completed     they ended the test
 *   live          the test window is open (started or not yet)
 *   upcoming      the window has not opened
 *   not_attempted the window closed and they never started
 *   ended         the window closed while they were still mid-test (it is about to be closed for them)
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

/** Label and dot colour of each status, tuned for the blue banner. */
export const EXAM_STATUS_META = {
  live: { label: "Live", dot: "#7dffa0", pulse: true },
  completed: { label: "Completed", dot: "#ffffff", pulse: false },
  upcoming: { label: "Upcoming", dot: "#ffffff", pulse: false },
  not_attempted: { label: "Not attempted", dot: "#ffd479", pulse: false },
  ended: { label: "Ended", dot: "#ffd479", pulse: false },
};
