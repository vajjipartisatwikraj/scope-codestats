import React from "react";
import { Reveal, SpeechCard } from "../shared";
import { chartWait } from "./resultsMeta";

/**
 * Surface used by the panels of the results page: a flat SpeechCard whose heading is one line, the
 * title at the left and the caption at the right (no icon, no divider), that fades in at `stage`
 * seconds. The charts inside start drawing a little after the card has settled (`--cc-wait`), so a
 * card never shows a half drawn chart while it is still arriving.
 *
 *   title, caption   the heading line
 *   stage            seconds before the card appears (see STAGE in resultsMeta.js)
 *   className        added to the card
 */
const ResultCard = ({ title, caption, stage = 0, className, children }) => (
  <Reveal delay={stage} className="sxe-slot">
    <SpeechCard fill className={className ? `sxe-card ${className}` : "sxe-card"} style={{ "--cc-wait": chartWait(stage) }}>
      <div className="sxe-card__head">
        <h2 className="sxe-card__title">{title}</h2>
        {caption ? <p className="sxe-card__caption">{caption}</p> : null}
      </div>
      <div className="sxe-card__content">{children}</div>
    </SpeechCard>
  </Reveal>
);

export default ResultCard;
