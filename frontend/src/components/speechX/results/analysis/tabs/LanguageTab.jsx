import React from "react";
import CriteriaRow from "../CriteriaRow";

/** The language rubric: each criterion with its score and the reason given. */
const LanguageTab = ({ language }) => (
  <div className="sxe-tab">
    <p className="sxe-tab__note">Your answer was scored on these criteria, each out of 100.</p>
    <ul className="sxe-criteria-list" aria-label="Language criteria">
      {language.dimensions.map((dimension, index) => (
        <CriteriaRow
          key={dimension.key}
          label={dimension.label}
          score={dimension.score}
          note={dimension.justification}
          fallback="–"
          index={index}
        />
      ))}
    </ul>
  </div>
);

export default LanguageTab;
