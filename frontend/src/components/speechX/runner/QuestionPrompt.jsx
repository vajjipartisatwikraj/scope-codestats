import React from "react";
import { Notice } from "../../ui";
import { ANSWER_HINT, PROMPT_CUE } from "../shared";
import PromptHeading from "./PromptHeading";
import PromptText from "./PromptText";
import RepeatControls from "./RepeatControls";
import JumbledBuilder from "./JumbledBuilder";
import FillBlankAnswer from "./answers/FillBlankAnswer";
import McqAnswer from "./answers/McqAnswer";
import EmailAnswer from "./answers/EmailAnswer";
import "./runner.css";

/**
 * Everything above the recorder for one question. What it shows depends on the section type: the
 * sentence to read, a play button, scrambled words, or a question to answer. The section's own
 * instructions appear above the first question only.
 */
const QuestionPrompt = ({
  section,
  question,
  number,
  total,
  arrangement,
  answer,
  speaking,
  busy,
  onPlay,
  onArrange,
  onText,
}) => {
  const { type } = section;

  return (
    <div className="sxr-prompt-block">
      {number === 1 && section.instructions ? (
        <Notice tone="info" title="Instructions for this section" className="sxr-instructions">
          {section.instructions}
        </Notice>
      ) : null}

      <PromptHeading number={number} total={total} cue={PROMPT_CUE[type] || "Answer"} />

      {(type === "READING" || type === "QUESTION_ANSWER" || type === "STORYTELLING") && (
        <PromptText>{question.text}</PromptText>
      )}

      {type === "REPEAT" && <RepeatControls speaking={speaking} disabled={busy} onPlay={onPlay} />}

      {type === "FILL_BLANKS" && (
        <FillBlankAnswer question={question} answer={answer} disabled={busy} onChange={(text) => onText(text)} />
      )}
      {type === "MCQ" && (
        <McqAnswer
          question={question}
          answer={answer}
          disabled={busy}
          onChange={(text) => onText(text, { immediate: true })}
        />
      )}
      {type === "EMAIL_WRITING" && (
        <EmailAnswer question={question} answer={answer} disabled={busy} onChange={(text) => onText(text)} />
      )}

      {type === "JUMBLED" && (
        <JumbledBuilder
          words={question.words}
          arrangement={arrangement}
          interactive={question.mode === "ui"}
          disabled={busy}
          status={answer?.status}
          onArrange={onArrange}
        />
      )}

      {ANSWER_HINT[type] && <p className="sxr-hint">{ANSWER_HINT[type]}</p>}
    </div>
  );
};

export default QuestionPrompt;
