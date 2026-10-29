import React from "react";
import { STATE_LABEL } from "../../shared";
import "./review.css";

const WORD = (state) => (STATE_LABEL[state] || state).toLowerCase();

/**
 * One thin segment per question, tinted by its state. It is a picture of the counts printed under
 * it, so it is announced as one image with the whole breakdown as its name.
 */
const StateBar = ({ states }) => {
  const counts = states.reduce((all, state) => ({ ...all, [state]: (all[state] || 0) + 1 }), {});
  const summary = Object.entries(counts)
    .map(([state, n]) => `${n} ${WORD(state)}`)
    .join(", ");

  return (
    <div className="sxr-statebar" role="img" aria-label={`Question states: ${summary}`}>
      {states.map((state, i) => (
        <span key={i} className="sxr-statebar__segment" data-state={state} />
      ))}
    </div>
  );
};

export default StateBar;
