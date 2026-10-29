import React, { forwardRef } from "react";
import "./answers/answers.css";

/**
 * A single word of the jumbled-sentence exercise (a 44px pill).
 *
 *   filled     the word is placed in the answer line (accent-soft with accent text)
 *   plain      the words are only shown, not pressed (a span, not a disabled button, so it is not
 *              mistaken for something unavailable)
 *   disabled   a word already placed, or the screen is busy: the high fill with a subtle label
 *   label      accessible name when the visible word alone is not enough
 */
const WordChip = forwardRef(function WordChip({ word, filled = false, plain = false, disabled, title, label, onClick }, ref) {
  if (plain) {
    return (
      <span className="sxr-chip" data-plain="true">
        {word}
      </span>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      className="sxr-chip"
      data-filled={filled ? "true" : "false"}
      title={title}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {word}
    </button>
  );
});

export default WordChip;
