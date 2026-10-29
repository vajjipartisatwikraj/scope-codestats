import React from "react";
import { formatClock } from "../../shared";
import ScoreBadge from "./ScoreBadge";

/** Top line of an open question: how long the answer was, and its overall score. */
const QuestionHeader = ({ question }) => {
  const { analysis } = question;
  return (
    <div className="sxe-qhead">
      <p className="sxe-qhead__length">
        {analysis.durationS > 0 ? `Answer length ${formatClock(analysis.durationS)}` : "Your answer"}
      </p>
      <ScoreBadge score={question.score} prefix="Overall " />
    </div>
  );
};

export default QuestionHeader;
