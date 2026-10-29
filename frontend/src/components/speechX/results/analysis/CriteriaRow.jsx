import React from "react";

/**
 * One scoring criterion as plain text: its name, the score out of 100, and a one-sentence note under
 * it (design/screens.md, section 11). The gauges live on the Overview tab only; the other tabs
 * state their numbers in words. Put several in a <ul className="sxe-criteria-list">.
 *
 *   label, score (0..100), note   the criterion, its score and the reason given
 *   fallback                      what to print when there is no note (nothing by default)
 *   index                         position in the list, for the stagger of the entrance
 */
const CriteriaRow = ({ label, score, note, fallback = "", index = 0 }) => {
  const text = note || fallback;
  return (
    <li className="sxe-criteria" style={{ "--i": index }}>
      <div className="sxe-criteria__head">
        <span className="sxe-criteria__name">{label}</span>
        <span className="sxe-criteria__score">
          {score}
          <span className="sxe-muted"> / 100</span>
        </span>
      </div>
      {text ? <p className="sxe-criteria__note">{text}</p> : null}
    </li>
  );
};

export default CriteriaRow;
