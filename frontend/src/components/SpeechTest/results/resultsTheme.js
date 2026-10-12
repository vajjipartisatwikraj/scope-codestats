/** Score bands and colours shared by the results page components. */

export const BAND_COLORS = {
  excellent: "#4caf50",
  good: "#0585E0",
  needs: "#e5a21d",
};

/** In display order, for the legend and the donut. */
export const BANDS = [
  { key: "excellent", label: "Excellent 85+", color: BAND_COLORS.excellent },
  { key: "good", label: "Good 70 to 84", color: BAND_COLORS.good },
  { key: "needs", label: "Needs work", color: BAND_COLORS.needs },
  { key: "none", label: "Not answered", color: null },
];

/** The band a question falls in. Unanswered questions have none of the scored bands. */
export const bandOf = (question) => {
  if (!question.answered) return "none";
  if (question.score >= 85) return "excellent";
  if (question.score >= 70) return "good";
  return "needs";
};

/** A ring or bar colour for a 0..100 score. */
export const scoreColor = (score) =>
  score >= 85 ? BAND_COLORS.excellent : score >= 70 ? BAND_COLORS.good : BAND_COLORS.needs;

/** Background of the cards and question rows on the results page, in dark mode. */
export const DARK_CARD = "#0A0A0A";

/** Tone colours used by feedback dots, metric badges and result tags. */
export const TONE_COLORS = { good: "#4caf50", warn: "#e5a21d" };
