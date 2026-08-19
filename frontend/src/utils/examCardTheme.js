/**
 * Colour accents for exam-mode cohorts in the student panel.
 *
 * A scheduled or running exam reads red — it is a locked, timed assessment. Once
 * the window has closed the exam is done, so it turns green. Practice cohorts
 * get no accent at all and keep the default blue styling.
 *
 * Shared by the list card and the detail panel so the two sides always agree.
 */

/** Red: exam scheduled, live, or misconfigured. */
export const EXAM_ACCENT_RED = {
  tone: "red",
  solid: "#D64545",
  solidHover: "#B93A3A",
  solidBorder: "#C03A3A",
  fillDark: "rgba(244, 67, 54, 0.12)",
  fillLight: "rgba(244, 67, 54, 0.07)",
  hoverDark: "rgba(244, 67, 54, 0.18)",
  hoverLight: "rgba(244, 67, 54, 0.12)",
  border: "rgba(244, 67, 54, 0.40)",
  borderHover: "rgba(244, 67, 54, 0.65)",
  glow: "rgba(169, 30, 30, 0.65)",
  glowHex: "#A91E1E",
};

/** Green: the exam window has closed. */
export const EXAM_ACCENT_GREEN = {
  tone: "green",
  solid: "#2E7D32",
  solidHover: "#1B5E20",
  solidBorder: "#256428",
  fillDark: "rgba(76, 175, 80, 0.12)",
  fillLight: "rgba(76, 175, 80, 0.07)",
  hoverDark: "rgba(76, 175, 80, 0.18)",
  hoverLight: "rgba(76, 175, 80, 0.12)",
  border: "rgba(76, 175, 80, 0.40)",
  borderHover: "rgba(76, 175, 80, 0.65)",
  glow: "rgba(27, 94, 32, 0.65)",
  glowHex: "#1B5E20",
};

/**
 * Resolves the accent for a cohort.
 *
 * Prefers the server-evaluated `examWindow`; falls back to comparing the stored
 * exam times against the browser clock for payloads that omit it. Colour is
 * cosmetic, so a skewed client clock is harmless here — access is decided
 * server-side.
 *
 * @param {object} cohort
 * @returns {object|null} accent palette, or null for practice cohorts
 */
export const getExamAccent = (cohort) => {
  if (!cohort) return null;

  const window = cohort.examWindow;
  const isExam = Boolean(window?.isExam || cohort.mode === "exam");
  if (!isExam) return null;

  // Finishing — by hand or by running out of time — completes the exam for this
  // student, so their card turns green even while others are still working.
  if (
    cohort.examSubmitted ||
    window?.attemptState === "submitted" ||
    window?.attemptState === "time_up"
  ) {
    return EXAM_ACCENT_GREEN;
  }

  // An attempt still running stays red, even after joining has closed.
  if (window?.attemptState === "in_progress") return EXAM_ACCENT_RED;

  if (window?.state) {
    return window.state === "ended" ? EXAM_ACCENT_GREEN : EXAM_ACCENT_RED;
  }

  // Fallback when only the raw times are available.
  const endsAt = cohort.examEndTime ? new Date(cohort.examEndTime).getTime() : null;
  const ended = endsAt !== null && Number.isFinite(endsAt) && Date.now() >= endsAt;
  return ended ? EXAM_ACCENT_GREEN : EXAM_ACCENT_RED;
};

export default getExamAccent;
