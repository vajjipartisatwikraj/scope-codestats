import React from "react";
import "./runner.css";

/** The line above a question: "Question 4 of 10 · Read this aloud" (sentence case, in the accent text colour). */
const PromptHeading = ({ number, total, cue }) => (
  <p className="sxr-cue">
    <span className="sxr-num">
      Question {number} of {total}
    </span>{" "}
    · {cue}
  </p>
);

export default PromptHeading;
