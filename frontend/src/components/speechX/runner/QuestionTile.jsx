import React from "react";
import { STATE_ICON, STATE_LABEL } from "../shared";
import "./runner.css";

/**
 * One numbered circle of the question palette (44px or more, so a finger can press it).
 * `state` is current | review | later | answered | open (the caller picks it, first match wins).
 *
 * The state is a tint (speechX.css `[data-state]`), a small icon badge on the corner and a word in
 * the accessible name ("Question 3, Answered"), so it never depends on colour.
 */
const QuestionTile = ({ number, state, disabled, onClick }) => {
  const key = STATE_ICON[state] ? state : "open";
  const Icon = STATE_ICON[key];
  const current = key === "current";

  return (
    <button
      type="button"
      className="sxr-tile sx-state"
      data-state={key}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Question ${number}, ${STATE_LABEL[key]}`}
      aria-current={current ? "step" : undefined}
    >
      <span className="sxr-tile__number" aria-hidden="true">
        {number}
      </span>
      <span className="sx-state-dot__badge" aria-hidden="true">
        <Icon size={12} weight="bold" aria-hidden="true" />
      </span>
    </button>
  );
};

export default QuestionTile;
