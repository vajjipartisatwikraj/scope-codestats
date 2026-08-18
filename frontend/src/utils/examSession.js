/**
 * Exam session tab helpers.
 *
 * An exam is taken in its own tab, marked by `?exam=1`. That flag tells the app
 * shell to collapse the navbar and sidebar and to show the centred countdown,
 * from the first paint, before any cohort data has loaded.
 *
 * The flag only controls chrome. It grants nothing: adding it to a practice
 * cohort's URL just hides the navigation, and every exam rule is still decided
 * by the server on each request.
 */

export const EXAM_SESSION_PARAM = "exam";

/** True when a location's query string marks this tab as an exam session. */
export const isExamSessionSearch = (search) =>
  new URLSearchParams(search || "").get(EXAM_SESSION_PARAM) === "1";

/**
 * Carries the exam flag across in-app navigation, so the countdown and the
 * collapsed chrome survive opening a question and coming back.
 */
export const withExamSession = (path, active) => {
  if (!active) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${EXAM_SESSION_PARAM}=1`;
};

/** Pulls the cohort id out of any `/cohorts/:id/...` path. */
export const cohortIdFromPath = (pathname) => {
  const match = /^\/cohorts\/([^/?]+)/.exec(pathname || "");
  return match ? match[1] : null;
};
