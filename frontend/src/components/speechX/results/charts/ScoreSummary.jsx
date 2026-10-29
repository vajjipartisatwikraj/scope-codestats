import React from "react";
import { ScoreRing } from "../../../custom-components";
import { Reveal } from "../../shared";
import { STAGE } from "../resultsMeta";

/**
 * The one spotlight tile of the page: the section score as the figure the student came for,
 * in Numeral XL inside a ring (the custom ScoreRing, whose number counts up), with its band as a
 * word and an icon and how many questions were answered. The ring is in the accent on the
 * inverted tile; its track and text come from the spotlight roles, so it reads in both themes.
 */
const ScoreSummary = ({ questions, score }) => {
  const answered = questions.filter((question) => question.answered).length;
  const value = typeof score === "number" ? score : 0;
  const decimals = Number.isInteger(value) ? 0 : 1;

  return (
    <Reveal delay={STAGE.summary} className="sxe-slot">
      <section className="sxe-score" aria-labelledby="sxe-score-title">
        <div className="sxe-score__head">
          <h2 className="sxe-score__label" id="sxe-score-title">
            Section score
          </h2>
        </div>
        <div className="sxe-score__ring">
          <ScoreRing
            value={value}
            size={156}
            decimals={decimals}
            tone="var(--ds-accent)"
            label="Section score"
            caption="out of 100"
            thickness={10}
          />
        </div>
        <p className="sxe-score__context">
          {answered} of {questions.length} questions answered
        </p>
      </section>
    </Reveal>
  );
};

export default ScoreSummary;
