import React from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { ListChecksIcon } from "@phosphor-icons/react/dist/csr/ListChecks";
import { Button } from "../../ui";
import MarkButton from "./MarkButton";
import "./runner.css";

/**
 * Bottom row of the question card: Previous on the left, the two bookmark toggles in the middle,
 * Next on the right (Review on the last question). Below 600px the marks drop to their own row.
 *
 * `emphasis` says whether Next/Review is the accent (primary) button. A view has one primary
 * button, so when the recorder's own button holds it, Next is a secondary button.
 */
const RunnerFooterNav = ({ isFirst, isLast, mark, disabled, emphasis = true, onPrevious, onNext, onReview, onToggleMark }) => {
  const variant = emphasis ? "primary" : "secondary";

  return (
    <div className="sxr-footer">
      <Button
        className="sxr-footer__prev"
        startIcon={<ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />}
        disabled={isFirst || disabled}
        onClick={onPrevious}
      >
        Previous
      </Button>

      <div className="sxr-footer__marks" role="group" aria-label="Mark this question">
        <MarkButton
          active={mark === "later"}
          state="later"
          icon={ClockCounterClockwiseIcon}
          disabled={disabled}
          onClick={() => onToggleMark("later")}
        >
          Visit later
        </MarkButton>
        <MarkButton
          active={mark === "review"}
          state="review"
          icon={BookmarkSimpleIcon}
          disabled={disabled}
          onClick={() => onToggleMark("review")}
        >
          Mark for review
        </MarkButton>
      </div>

      {isLast ? (
        <Button
          className="sxr-footer__next"
          variant={variant}
          disabled={disabled}
          onClick={onReview}
          startIcon={<ListChecksIcon size={18} weight="regular" aria-hidden="true" />}
        >
          Review
        </Button>
      ) : (
        <Button
          className="sxr-footer__next"
          variant={variant}
          endIcon={<ArrowRightIcon size={18} weight="regular" aria-hidden="true" />}
          disabled={disabled}
          onClick={onNext}
        >
          Next
        </Button>
      )}
    </div>
  );
};

export default RunnerFooterNav;
