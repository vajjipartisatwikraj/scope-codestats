import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { ThumbsUpIcon } from "@phosphor-icons/react/dist/csr/ThumbsUp";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";

/**
 * Score bands and tones of the results page (replaces resultsTheme.js, which held raw hex colours).
 *
 * A band is a word, an icon and a tone of the design tokens, so a score is never told by colour
 * alone. `tone` is the name used by the custom ProgressBar / ScoreRing, `badge` the tone of the
 * ui Badge, `color` the fill for chart marks (a CSS variable of the tokens).
 */

/** In display order, for the legend and the donut. */
export const BANDS = [
  { key: "excellent", label: "Excellent 85+", short: "Excellent", tone: "success", badge: "success", color: "var(--ds-success)", icon: TrophyIcon },
  { key: "good", label: "Good 70 to 84", short: "Good", tone: "accent", badge: "info", color: "var(--ds-accent)", icon: ThumbsUpIcon },
  { key: "needs", label: "Needs work", short: "Needs work", tone: "warning", badge: "warning", color: "var(--ds-warning)", icon: WarningCircleIcon },
  { key: "none", label: "Not answered", short: "Not answered", tone: "neutral", badge: "neutral", color: "var(--ds-bar-muted)", icon: MinusCircleIcon },
];

export const BAND_BY_KEY = Object.fromEntries(BANDS.map((band) => [band.key, band]));

/** The band a 0..100 score falls in (answered questions only). */
export const bandOfScore = (score) => (score >= 85 ? "excellent" : score >= 70 ? "good" : "needs");

/** The band a question falls in. Unanswered questions have none of the scored bands. */
export const bandOf = (question) => (question.answered ? bandOfScore(question.score) : "none");

/** The tone name (ProgressBar, ScoreRing) of a 0..100 score. */
export const scoreTone = (score) => BAND_BY_KEY[bandOfScore(score)].tone;

/** Feedback and metric tones sent by the server: "good" or "warn". */
export const FEEDBACK_TONES = {
  good: { badge: "success", icon: CheckCircleIcon, word: "Good" },
  warn: { badge: "warning", icon: WarningCircleIcon, word: "Needs attention" },
};

/** When each part of the page begins to appear, in seconds (the ribbon, the tiles, then the list). */
export const STAGE = {
  ribbon: 0,
  summary: 0.06,
  bands: 0.12,
  skills: 0.18,
  bars: 0.24,
  list: 0.3,
};

/** The wait before a chart inside a card starts drawing, so the card has settled first. */
export const chartWait = (stage) => `${Math.round((stage + 0.16) * 1000)}ms`;

/** Whole numbers as the page shows scores ("84"). */
export const roundScore = (score) => Math.round(Number(score) || 0);
