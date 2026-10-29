import React from "react";
import { ProgressBar } from "../../custom-components";
import { CRITERIA } from "../feedback/feedbackMeta";

/** Average score, out of 5, for each part of the test students were asked to rate. */
const CriteriaAverages = ({ criteria }) => (
  <div className="sxl-criteria">
    {CRITERIA.map((item) => {
      const average = criteria[item.key];
      return (
        <ProgressBar
          key={item.key}
          label={item.label}
          value={average || 0}
          max={5}
          valueLabel={`${average ?? "\u2013"} / 5`}
          size="sm"
        />
      );
    })}
  </div>
);

export default CriteriaAverages;
