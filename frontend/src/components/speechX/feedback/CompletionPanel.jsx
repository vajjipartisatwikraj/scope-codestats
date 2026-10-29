import React from "react";
import { StatTile } from "../../ui";
import { AnimatedCheck } from "../../custom-components";
import { Reveal, SpeechCard } from "../shared";

/**
 * Left side of the feedback screen: confirmation that the test is finished (the page's h1), and
 * the figure worth seeing straight away, the final score, as the one spotlight tile.
 *
 * Props: finalScore (text, "82%"), sections (text, "4 of 4 sections scored"), timeSpent (text, "38 min spent")
 */
const CompletionPanel = ({ finalScore, sections, timeSpent }) => (
  <div className="sxf-complete">
    <Reveal delay={0.05}>
      <SpeechCard as="div">
        <AnimatedCheck size={56} delay={150} label="" />
        <h1 className="sxf-title">Test completed</h1>
        <p className="sxf-lead">Thanks for finishing the speech test. Your answers are submitted.</p>
      </SpeechCard>
    </Reveal>
    <Reveal delay={0.15}>
      <StatTile
        tone="spotlight"
        label="Final score"
        value={finalScore}
        context={
          <ul className="sxf-facts">
            <li>{sections}</li>
            <li>{timeSpent}</li>
          </ul>
        }
      />
    </Reveal>
  </div>
);

export default CompletionPanel;
