import React from "react";
import { Disclosure } from "../../../ui";
import ScoreBadge from "./ScoreBadge";
import useMountedWhile from "./useMountedWhile";

/** "Q3" and the question text, as the title of a row. */
const RowTitle = ({ question }) => (
  <span className="sxe-q__title">
    <span className="sxe-q__num">Q{question.number}</span>
    <span className="sxe-q__text">{question.text}</span>
  </span>
);

/** The score of each criterion on one line: "Transcription 84 · Pronunciation 72 · Fluency 90". */
const criteriaLine = (question, columns) => {
  const scoreOf = (key) => question.analysis?.rings.find((ring) => ring.key === key)?.score;
  return columns.map((column) => `${column.label} ${scoreOf(column.key) ?? "–"}`).join(" · ");
};

/**
 * One question in the analysis list. The summary line is always visible (number, question, the
 * score of each criterion and the verdict badge); the detail (children) opens under it. An
 * expandable question is a ui Disclosure (a heading with a real button, aria-expanded,
 * aria-controls); one that was not answered, or has no analysis, is a plain row that says so.
 * The detail is mounted when the row opens and unmounted after it has closed.
 */
const QuestionRow = ({ question, columns, open, expandable, onToggle, children }) => {
  const mounted = useMountedWhile(open);

  if (!expandable) {
    return (
      <div className="sxe-q sxe-q--static">
        <RowTitle question={question} />
        <span className="sxe-q__aside">
          {question.answered ? <span className="sxe-q__hint">Detailed analysis is not available</span> : null}
          <ScoreBadge score={question.score} answered={question.answered} />
        </span>
      </div>
    );
  }

  return (
    <Disclosure
      className="sxe-q"
      level={3}
      open={open}
      onToggle={onToggle}
      title={<RowTitle question={question} />}
      description={columns.length ? criteriaLine(question, columns) : undefined}
      badge={<ScoreBadge score={question.score} answered={question.answered} />}
    >
      {mounted ? children : null}
    </Disclosure>
  );
};

export default QuestionRow;
