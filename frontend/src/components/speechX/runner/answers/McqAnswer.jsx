import React from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import PromptText from "../PromptText";
import SaveStatusLine from "./SaveStatusLine";
import "./answers.css";

/**
 * The question with each run of underscores ("______") drawn as one unbroken line, so a blank
 * reads as a long dash instead of a row of separate marks. The line grows with the run, within
 * limits, and is announced as "blank".
 */
const withBlanks = (text) =>
  String(text || "")
    .split(/(_{2,})/)
    .map((part, index) =>
      /^_{2,}$/.test(part) ? (
        <span
          key={index}
          className="sxr-gap"
          role="img"
          aria-label="blank"
          style={{ width: `${Math.min(Math.max(part.length, 4), 14) * 0.6}em` }}
        />
      ) : (
        part
      )
    );

/** The answer is stored as the chosen option ids, comma separated. */
const parseSelected = (text) => (text ? text.split(",").filter(Boolean) : []);

/**
 * A multiple-choice question: the options as a list of large buttons. One correct answer means a
 * single choice (picking another replaces it); two means the student may hold two at once. A chosen
 * option shows a check in its letter badge as well as the accent-soft tint.
 */
const McqAnswer = ({ question, answer, disabled, onChange }) => {
  const selected = parseSelected(answer?.text);
  const limit = question.selectCount || 1;

  const toggle = (id) => {
    let next;
    if (selected.includes(id)) next = selected.filter((s) => s !== id);
    else if (limit === 1) next = [id];
    else if (selected.length < limit) next = [...selected, id];
    else next = [...selected.slice(1), id]; // already holding the maximum: the oldest pick makes way
    onChange(next.join(","));
  };

  return (
    <div>
      <PromptText className="sxr-prompt--medium">{withBlanks(question.text)}</PromptText>
      <p className="sxr-hint">{limit === 1 ? "Choose one answer." : "Choose two answers."}</p>

      <div className="sxr-options" role={limit === 1 ? "radiogroup" : "group"} aria-label="Answer options">
        {question.options.map((option, i) => {
          const on = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className="sxr-option"
              role={limit === 1 ? "radio" : "checkbox"}
              aria-checked={on}
              data-on={on ? "true" : "false"}
              disabled={disabled}
              onClick={() => toggle(option.id)}
            >
              <span className="sxr-option__mark" data-shape={limit === 1 ? "round" : "square"} aria-hidden="true">
                {on ? <CheckIcon size={18} weight="bold" aria-hidden="true" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="sxr-option__text">{option.text}</span>
            </button>
          );
        })}
      </div>

      <SaveStatusLine status={answer?.status} visible={selected.length > 0} />
    </div>
  );
};

export default McqAnswer;
