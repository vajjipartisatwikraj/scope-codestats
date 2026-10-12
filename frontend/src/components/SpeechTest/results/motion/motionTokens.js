/** Timing shared by the results page animations, so everything moves alike. */

/** For framer-motion (array form of the curve below). */
export const EASE_OUT = [0.22, 1, 0.36, 1];

/** For CSS transitions: a quick start that settles gently. */
export const CSS_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * When each part of the page begins to appear, in seconds. The top ribbon
 * comes first, then the three charts one after another, then the question list.
 */
export const STAGE = {
  ribbon: 0,
  summary: 0.18,
  skills: 0.3,
  bars: 0.42,
  list: 0.62,
};
