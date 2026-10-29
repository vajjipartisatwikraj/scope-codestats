import React from "react";
import { ScoreRing } from "../../../../custom-components";
import { Reveal } from "../../../shared";
import { FEEDBACK_TONES, scoreTone } from "../../resultsMeta";

/**
 * Headline scores and the written feedback. Each score is a gauge (the custom ScoreRing, whose
 * number counts up) with its name and the one-sentence reason under it; the three sit side by side
 * (they stack on a phone). The feedback is a list where every line carries an icon and a hidden
 * word ("Good", "Needs attention") besides its colour.
 */
const OverviewTab = ({ analysis }) => (
  <div className="sxe-tab">
    {analysis.rings.length > 0 && (
      <ul className="sxe-gauges" aria-label="Scores">
        {analysis.rings.map((ring, index) => (
          <li key={ring.key} className="sxe-gauge" style={{ "--i": index }}>
            <ScoreRing value={ring.score} size={84} tone={scoreTone(ring.score)} label={`${ring.label} score`} />
            <div className="sxe-gauge__text">
              <h4 className="sxe-gauge__name">{ring.label}</h4>
              {ring.note ? <p className="sxe-gauge__note">{ring.note}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    )}

    {analysis.feedback.length > 0 && (
      <div className="sxe-feedback">
        <h4 className="sxe-tab__heading">Feedback</h4>
        <ul className="sxe-feedback__list">
          {analysis.feedback.map((item, index) => {
            const meta = FEEDBACK_TONES[item.tone] || FEEDBACK_TONES.warn;
            const Icon = meta.icon;
            return (
              <li key={index}>
                <Reveal y={8} duration={0.28} delay={0.2 + index * 0.05} className="sxe-feedback__item" data-tone={item.tone}>
                  <Icon size={20} weight="fill" aria-hidden="true" className="sxe-feedback__icon" />
                  <p>
                    <span className="sx-sr">{meta.word}: </span>
                    {item.text}
                  </p>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    )}
  </div>
);

export default OverviewTab;
