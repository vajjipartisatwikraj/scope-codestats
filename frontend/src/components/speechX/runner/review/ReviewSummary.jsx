import React from "react";
import { StateLegend } from "../../shared";
import StateBar from "./StateBar";
import "./review.css";

const ORDER = ["answered", "open", "later", "review"];

/**
 * Top of the review page: the h1, how many questions are answered, a bar with one segment per
 * question and a count for each state.
 */
const ReviewSummary = ({ title, states }) => {
  const counts = Object.fromEntries(ORDER.map((state) => [state, states.filter((s) => s === state).length]));

  return (
    <div className="sxr-summary">
      <div className="sxr-summary__row">
        <h1 className="sxr-summary__title">Review {title}</h1>
        <p className="sxr-summary__answered">
          <span className="sxr-num">{counts.answered}</span> of <span className="sxr-num">{states.length}</span> answered
        </p>
      </div>

      <StateBar states={states} />

      <StateLegend states={ORDER} counts={counts} label="Questions by state" className="sxr-summary__legend" />
    </div>
  );
};

export default ReviewSummary;
