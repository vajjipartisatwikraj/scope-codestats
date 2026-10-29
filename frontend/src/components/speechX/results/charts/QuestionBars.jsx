import React from "react";
import { BarChart, ChartLegend } from "../../../custom-components";
import ResultCard from "../ResultCard";
import { BANDS, STAGE, bandOf, roundScore, BAND_BY_KEY } from "../resultsMeta";

const LEGEND = BANDS.map((band) => ({ key: band.key, label: band.label, color: band.color }));

/** "Average 82. Highest: Q3 (96). Lowest: Q5 (60). Q4 not answered." */
const findingOf = (questions, average) => {
  const answered = questions.filter((question) => question.answered);
  const parts = [];
  if (typeof average === "number") parts.push(`Section average ${average}`);
  if (answered.length > 1) {
    const high = answered.reduce((best, q) => (q.score > best.score ? q : best), answered[0]);
    const low = answered.reduce((worst, q) => (q.score < worst.score ? q : worst), answered[0]);
    parts.push(`Highest: Q${high.number} (${roundScore(high.score)})`, `Lowest: Q${low.number} (${roundScore(low.score)})`);
  }
  const skipped = questions.filter((question) => !question.answered).map((question) => `Q${question.number}`);
  if (skipped.length) parts.push(`${skipped.join(", ")} not answered`);
  return `${parts.join(". ")}.`;
};

/**
 * One bar per question, coloured by band, with a reference line at the section average (the
 * custom BarChart: bars rise from the baseline in a wave, then their values and the average
 * line follow). The bands are named in a legend under the chart, and every bar prints its score,
 * so colour is never the only signal. An unanswered question shows a dash and its name says
 * "not answered" for assistive technology.
 */
const QuestionBars = ({ questions, average }) => {
  const hasAverage = typeof average === "number";
  return (
    <ResultCard title="Question-wise scores" caption="Out of 100" stage={STAGE.bars}>
      <div className="sxe-qbars">
        <BarChart
          data={questions}
          getKey={(question) => question.questionId}
          getLabel={(question) =>
            question.answered ? (
              `Q${question.number}`
            ) : (
              <>
                {`Q${question.number}`}
                <span className="sx-sr"> not answered</span>
              </>
            )
          }
          getValue={(question) => (question.answered ? question.score : 0)}
          getValueLabel={(question) => (question.answered ? roundScore(question.score) : "–")}
          formatValue={(value) => roundScore(value)}
          getColor={(question) => BAND_BY_KEY[bandOf(question)].color}
          highlight="none"
          min={0}
          max={100}
          height={200}
          minColumnWidth={44}
          referenceLine={hasAverage ? { value: average, label: `Average ${average}`, gutter: 92 } : undefined}
          title="Score of each question"
          summary={findingOf(questions, average)}
          emptyMessage="No questions in this section"
        />
        <ChartLegend items={LEGEND} label="Score bands" />
      </div>
    </ResultCard>
  );
};

export default QuestionBars;
