import React from "react";
import { PieChart } from "../../../custom-components";
import ResultCard from "../ResultCard";
import { BANDS, STAGE, bandOf } from "../resultsMeta";

/**
 * How many questions fell in each score band: a donut (the custom PieChart) of the answered
 * questions, with the number answered in the middle and no labels under it. The counts of every band
 * (the text equivalent, and the table for assistive technology) come from the PieChart.
 */
const Donut = ({ questions }) => {
  const counts = {};
  questions.forEach((question) => {
    const band = bandOf(question);
    counts[band] = (counts[band] || 0) + 1;
  });

  const scored = BANDS.filter((band) => band.key !== "none").map((band) => ({
    key: band.key,
    label: band.label,
    value: counts[band.key] || 0,
    color: band.color,
  }));
  const answered = scored.reduce((sum, item) => sum + item.value, 0);
  const summary = `${answered} of ${questions.length} questions answered. ${BANDS.map(
    (band) => `${band.label}: ${counts[band.key] || 0}`
  ).join(", ")}.`;

  return (
    <ResultCard title="Score summary" caption="Questions by band" stage={STAGE.bands}>
      <div className="sxe-bands">
        <PieChart
          data={scored}
          getColor={(item) => item.color}
          legend="none"
          size={156}
          totalLabel="Answered"
          title="Questions by score band"
          summary={summary}
          emptyMessage="No answered questions yet"
        />
      </div>
    </ResultCard>
  );
};

export default Donut;
