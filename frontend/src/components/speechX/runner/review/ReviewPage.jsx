import React from "react";
import RunnerStage from "../RunnerStage";
import ReviewSummary from "./ReviewSummary";
import ReviewTable from "./ReviewTable";
import ReviewActions from "./ReviewActions";
import "./review.css";

/**
 * Overview of the whole section before submitting: how many questions are in each state, a row per
 * question with a way to jump back to it, and the submit button. The page does not scroll; only the
 * rows do, if there are many.
 *
 * `items` is [{ id, state }] in question order, where state is answered | open | later | review.
 */
const ReviewPage = ({ title, items, disabled, onGoTo, onBack, onSubmit }) => {
  const states = items.map((item) => item.state);

  return (
    <RunnerStage layout="review">
      <section className="sxr-review">
        <ReviewSummary title={title} states={states} />
        <ReviewTable items={items} disabled={disabled} onGoTo={onGoTo} />
        <ReviewActions
          unanswered={states.filter((s) => s === "open").length}
          disabled={disabled}
          onBack={onBack}
          onSubmit={onSubmit}
        />
      </section>
    </RunnerStage>
  );
};

export default ReviewPage;
