import React from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneRight";
import { Button } from "../../../ui";
import "./review.css";

/** Bottom bar of the review page: a reminder on the left, the two actions on the right. */
const ReviewActions = ({ unanswered, disabled, onBack, onSubmit }) => (
  <div className="sxr-actionsbar">
    <p className="sxr-actionsbar__note">
      {unanswered > 0 ? (
        <>
          <span className="sxr-num">{unanswered}</span> unanswered question{unanswered === 1 ? "" : "s"} will get no score once you submit.
        </>
      ) : (
        "All questions are answered. You cannot change them after you submit."
      )}
    </p>

    <div className="sxr-actionsbar__buttons">
      <Button disabled={disabled} onClick={onBack} startIcon={<ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />}>
        Back to questions
      </Button>
      <Button variant="primary" disabled={disabled} onClick={onSubmit} startIcon={<PaperPlaneRightIcon size={18} weight="regular" aria-hidden="true" />}>
        Submit section
      </Button>
    </div>
  </div>
);

export default ReviewActions;
