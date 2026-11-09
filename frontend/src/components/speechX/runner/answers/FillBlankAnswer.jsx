import React from "react";
import PromptText from "../PromptText";
import SaveStatusLine from "./SaveStatusLine";
import "./answers.css";

const GAP = /_{2,}/;

/**
 * The sentence with its gap turned into a text box. If the teacher did not mark a gap with
 * underscores, the sentence is shown as it is and the box goes below.
 *
 * `onChange` runs on every keystroke (the text is kept and drafted on this device); `onCommit` runs
 * when the student leaves the box, which is when the answer is saved to the server.
 */
const FillBlankAnswer = ({ question, answer, disabled, onChange, onCommit }) => {
  const value = answer?.text || "";
  const maxChars = question.maxChars || 500;

  const match = GAP.exec(question.text);
  const before = match ? question.text.slice(0, match.index) : question.text;
  const after = match ? question.text.slice(match.index + match[0].length) : "";

  const input = (
    <input
      type="text"
      className="sxr-blank"
      data-inline={match ? "true" : "false"}
      value={value}
      disabled={disabled}
      maxLength={maxChars}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => onCommit?.()}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Your answer for the blank"
      placeholder="Type here"
      // Grows with what is typed, between a sensible minimum and the line width.
      style={{ width: `${Math.min(Math.max(value.length + 2, 10), 40)}ch` }}
    />
  );

  return (
    <div>
      {match ? (
        <PromptText className="sxr-prompt--medium">
          {before}
          {input}
          {after}
        </PromptText>
      ) : (
        <>
          <PromptText className="sxr-prompt--medium">{question.text}</PromptText>
          <div className="sxr-prompt-gap">{input}</div>
        </>
      )}
      <p className="sxr-hint">Type the missing word or words.</p>
      <SaveStatusLine status={answer?.status} visible={value.length > 0} />
    </div>
  );
};

export default FillBlankAnswer;
