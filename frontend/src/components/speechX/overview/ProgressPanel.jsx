import React from "react";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { FlagCheckeredIcon } from "@phosphor-icons/react/dist/csr/FlagCheckered";
import { Button, StatTile } from "../../ui";
import { ProgressBar } from "../../custom-components";
import { formatClock, formatScore } from "../shared";

// Bar colours on the inverted (spotlight) tile, from the tile's own roles
const ON_SPOTLIGHT = {
  fill: "var(--ds-on-spotlight)",
  track: "color-mix(in srgb, var(--ds-on-spotlight) 18%, var(--ds-spotlight))",
};

/**
 * Progress and finish controls of the side column. The spotlight tile is the figure the student
 * wants: sections scored while the test is under way (with a bar), the final score after it.
 * Below it the End test button (available once every section is scored; the one filled button
 * when nothing else is left to do) or, after the test, View leaderboard.
 *
 * Props: scored, total, completed, finalScore, timeUsedSeconds, canEnd, endIsNext, onEnd, onLeaderboard
 */
const ProgressPanel = ({ scored, total, completed, finalScore, timeUsedSeconds, canEnd, endIsNext, onEnd, onLeaderboard }) => {
  if (completed) {
    return (
      <div className="sxv-progress">
        <StatTile
          tone="spotlight"
          label="Final score"
          value={formatScore(finalScore)}
          context={
            <span>
              Average of your {total} section score{total === 1 ? "" : "s"}
              {timeUsedSeconds ? `, ${formatClock(timeUsedSeconds)} spent in sections` : ""}.
            </span>
          }
        />
        <Button variant="primary" fullWidth startIcon={<TrophyIcon size={18} aria-hidden="true" />} onClick={onLeaderboard}>
          View leaderboard
        </Button>
      </div>
    );
  }

  return (
    <div className="sxv-progress">
      <StatTile
        tone="spotlight"
        label="Your progress"
        value={`${scored} of ${total}`}
        context={
          <div className="sxv-progress__context">
            <ProgressBar value={scored} max={total} label="Sections scored" hideLabel valueLabel={null} colors={ON_SPOTLIGHT} />
            <p>
              sections scored. A section's timer runs only while you are inside it. You can start the next section without waiting for
              scores.
            </p>
          </div>
        }
      />
      <Button
        variant={canEnd && endIsNext ? "primary" : "secondary"}
        fullWidth
        startIcon={<FlagCheckeredIcon size={18} aria-hidden="true" />}
        onClick={onEnd}
        disabled={!canEnd}
        aria-describedby={canEnd ? undefined : "sxv-end-why"}
      >
        End test
      </Button>
      {!canEnd ? (
        <p className="sxv-progress__why" id="sxv-end-why">
          Available once every section is scored.
        </p>
      ) : null}
    </div>
  );
};

export default ProgressPanel;
