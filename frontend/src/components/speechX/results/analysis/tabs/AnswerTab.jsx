import React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import { Badge } from "../../../../ui";

const GoodTag = ({ children }) => (
  <Badge tone="success" icon={<CheckCircleIcon size={14} weight="bold" aria-hidden="true" />}>
    {children}
  </Badge>
);
const WarnTag = ({ children }) => (
  <Badge tone="warning" icon={<XCircleIcon size={14} weight="bold" aria-hidden="true" />}>
    {children}
  </Badge>
);

/** A labelled line: the student's answer, or the expected one. */
const AnswerLine = ({ label, value, tag }) => (
  <div className="sxe-answer-line">
    <div className="sxe-answer-line__head">
      <p className="sxe-answer-line__label">{label}</p>
      {tag}
    </div>
    <p className="sxe-answer-line__value">{value || <span className="sxe-muted">Nothing entered</span>}</p>
  </div>
);

const FillBlank = ({ answer }) => (
  <div className="sxe-tab sxe-answer">
    <p className="sxe-tab__note">{answer.prompt}</p>
    <AnswerLine
      label="Your answer"
      value={answer.submitted}
      tag={answer.correct ? <GoodTag>Correct</GoodTag> : <WarnTag>Incorrect</WarnTag>}
    />
    {!answer.correct && <AnswerLine label="Expected answer" value={answer.expected} />}
    {answer.accepted.length > 0 && <p className="sxe-tab__note">Also accepted: {answer.accepted.join(", ")}</p>}
  </div>
);

const Mcq = ({ answer }) => (
  <div className="sxe-tab sxe-answer">
    <p className="sxe-tab__note">{answer.prompt}</p>
    <ol className="sxe-options">
      {answer.options.map((option, index) => {
        const right = option.isCorrect;
        const wrongPick = option.selected && !right;
        return (
          <li key={option.id} className="sxe-option" data-state={right ? "right" : wrongPick ? "wrong" : "plain"}>
            <span className="sxe-option__mark" aria-hidden="true">
              {right ? <CheckIcon size={16} weight="bold" /> : wrongPick ? <XIcon size={16} weight="bold" /> : String.fromCharCode(65 + index)}
            </span>
            <span className="sxe-option__text" data-strong={option.selected || right ? "true" : undefined}>
              {right ? <span className="sx-sr">Correct option. </span> : wrongPick ? <span className="sx-sr">Incorrect option. </span> : null}
              {option.text}
            </span>
            {option.selected && (right ? <GoodTag>Your choice</GoodTag> : <WarnTag>Your choice</WarnTag>)}
            {right && !option.selected && <GoodTag>Correct answer</GoodTag>}
          </li>
        );
      })}
    </ol>
  </div>
);

const Email = ({ answer }) => (
  <div className="sxe-tab sxe-answer">
    <p className="sxe-tab__note">{answer.prompt}</p>
    <div className="sxe-transcript sxe-transcript--scroll" tabIndex={0} role="region" aria-label="Your email">
      <p className="sxe-transcript__text sxe-pre">{answer.text || <span className="sxe-muted">No email was written.</span>}</p>
    </div>
    <p className="sxe-tab__note">{answer.words} words</p>
  </div>
);

/** What the student wrote or chose, set against the answer where one exists. */
const AnswerTab = ({ answer }) => {
  if (answer.kind === "fill_blank") return <FillBlank answer={answer} />;
  if (answer.kind === "mcq") return <Mcq answer={answer} />;
  return <Email answer={answer} />;
};

export default AnswerTab;
