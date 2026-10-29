import React from "react";
import { Notice } from "../../ui";
import { Reveal, formatDateTime } from "../shared";
import TestSummaryCard from "./TestSummaryCard";
import TipsCarousel from "./TipsCarousel";
import AcknowledgeBar from "./AcknowledgeBar";
import instructionTips from "./instructionTips";

/** Why the Continue button is locked when the test is not open */
const closedReason = (state) => (state === "upcoming" ? "This test is not open yet." : "This test has ended.");

/**
 * Step 1 of the pre-test flow: what the test covers and how to prepare.
 * `animateIn` staggers the blocks on the first visit only; coming back from the next step, the
 * step transition is the only movement.
 *
 * From 900px the summary card sits beside the tips; below that the blocks stack.
 *
 * Props: test, state ('upcoming' | 'live' | 'ended'), acknowledged, onAcknowledge(bool), onContinue, animateIn
 */
const InstructionsStep = ({ test, state, acknowledged, onAcknowledge, onContinue, animateIn }) => (
  <div className="sxs-instructions">
    <Reveal delay={0.05} still={!animateIn} className="sxs-instructions__summary">
      <TestSummaryCard test={test} />
    </Reveal>

    <Reveal delay={0.18} still={!animateIn} className="sxs-instructions__main">
      <section className="sxs-tips" aria-labelledby="sxs-tips-title">
        <h2 className="sxs-section-title" id="sxs-tips-title" tabIndex={-1} data-step-heading>
          Before you begin
        </h2>
        <p className="sxs-section-text">A few things that help your recordings score well.</p>
        <TipsCarousel tips={instructionTips} />
      </section>

      <div className="sxs-ack-card">
        {test.instructions ? (
          <section className="sxs-teacher" aria-labelledby="sxs-teacher-title">
            <h3 className="sxs-teacher__title" id="sxs-teacher-title">
              From your teacher
            </h3>
            <p className="sxs-teacher__text">{test.instructions}</p>
          </section>
        ) : null}

        {state !== "live" ? (
          <Notice tone="info">
            {state === "upcoming" ? `This test opens on ${formatDateTime(test.startTime)}. You can read the instructions now.` : "This test has ended."}
          </Notice>
        ) : null}

        <AcknowledgeBar
          checked={acknowledged}
          onChange={onAcknowledge}
          label="I have read and understood the instructions"
          actionLabel="Continue"
          onAction={onContinue}
          disabled={state !== "live"}
          disabledReason={closedReason(state)}
        />
      </div>
    </Reveal>
  </div>
);

export default InstructionsStep;
