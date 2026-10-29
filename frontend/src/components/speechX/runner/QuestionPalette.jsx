import React from "react";
import { ListChecksIcon } from "@phosphor-icons/react/dist/csr/ListChecks";
import { Button } from "../../ui";
import QuestionTile from "./QuestionTile";
import PaletteLegend from "./PaletteLegend";
import "./runner.css";

/**
 * Left column of the question screen (a block on top below 900px): a numbered circle per question
 * showing its state, a key, and a button that opens the review page.
 *
 * The Review button sits beside the heading in the top block and at the bottom of the column from
 * 900px. Two buttons are rendered and runner.css shows one of them (the other is display: none, so
 * it is also out of the tab order), which keeps the focus order equal to the visual order.
 *
 * `items` is [{ id, state }] in question order.
 */
const QuestionPalette = ({ items, answeredCount, disabled, onSelect, onReview }) => {
  const review = (className, fullWidth) => (
    <Button
      className={className}
      fullWidth={fullWidth}
      disabled={disabled}
      onClick={onReview}
      startIcon={<ListChecksIcon size={18} weight="regular" aria-hidden="true" />}
    >
      Review
    </Button>
  );

  return (
    <nav className="sxr-palette" aria-label="Questions">
      <div className="sxr-palette__head">
        <div>
          <h2 className="sxr-palette__title">Questions</h2>
          <p className="sxr-palette__count">
            <span className="sxr-num">{answeredCount}</span> of <span className="sxr-num">{items.length}</span> answered
          </p>
        </div>
        {review("sxr-palette__review-top", false)}
      </div>

      <div className="sxr-palette__tiles">
        {items.map((item, i) => (
          <QuestionTile key={item.id} number={i + 1} state={item.state} disabled={disabled} onClick={() => onSelect(i)} />
        ))}
      </div>

      <div className="sxr-palette__key">
        <PaletteLegend />
      </div>

      {review("sxr-palette__review-bottom", true)}
    </nav>
  );
};

export default QuestionPalette;
