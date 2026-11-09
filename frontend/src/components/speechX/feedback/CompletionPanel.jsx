import React from "react";
import { AnimatedCheck } from "../../custom-components";
import { Reveal } from "../shared";

/**
 * Left side of the feedback screen: confirmation that the test is finished (the page's h1) and the
 * three figures worth seeing straight away.
 *
 * Props: finalScore (text, "92.9%"), sections (text, "4 of 4"), timeSpent (text, "5 min")
 */
const CompletionPanel = ({ finalScore, sections, timeSpent }) => (
  <div className="sxf-complete">
    <Reveal delay={0.05}>
      <AnimatedCheck size={40} delay={150} label="" />
      <h1 className="sxf-title">Test completed</h1>
      <p className="sxf-lead">Thanks for finishing the VocalQ test. Your answers are submitted.</p>
    </Reveal>
    <Reveal delay={0.15}>
      <dl className="sxf-facts">
        <div className="sxf-fact">
          <dt className="sxf-fact__label">Final score</dt>
          <dd className="sxf-fact__value">{finalScore}</dd>
        </div>
        <div className="sxf-fact">
          <dt className="sxf-fact__label">Sections</dt>
          <dd className="sxf-fact__value">{sections}</dd>
        </div>
        <div className="sxf-fact">
          <dt className="sxf-fact__label">Time spent</dt>
          <dd className="sxf-fact__value">{timeSpent}</dd>
        </div>
      </dl>
    </Reveal>
  </div>
);

export default CompletionPanel;