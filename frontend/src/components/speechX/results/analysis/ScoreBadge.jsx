import React from "react";
import { Badge } from "../../../ui";
import { BAND_BY_KEY, bandOfScore, roundScore } from "../resultsMeta";

/**
 * A score as a verdict badge: an icon, the whole-number score and the band's word ("92 · Excellent").
 * An unanswered question gets the neutral "Not answered" badge. `prefix` goes before the number
 * ("Overall "). `showScore={false}` leaves only the icon and the word (where the number is printed
 * next to it). The band is never told by colour alone.
 */
const ScoreBadge = ({ score, answered = true, prefix = "", showScore = true, className }) => {
  const band = BAND_BY_KEY[answered ? bandOfScore(score) : "none"];
  const Icon = band.icon;
  return (
    <Badge tone={band.badge} className={className} icon={<Icon size={14} weight="bold" aria-hidden="true" />}>
      {answered && showScore ? `${prefix}${roundScore(score)} · ${band.short}` : band.short}
    </Badge>
  );
};

export default ScoreBadge;
