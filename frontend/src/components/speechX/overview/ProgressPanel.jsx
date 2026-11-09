import React from "react";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { FlagCheckeredIcon } from "@phosphor-icons/react/dist/csr/FlagCheckered";
import { Button, StatTile } from "../../ui";
import { ProgressBar } from "../../custom-components";
import { formatClock, formatScore } from "../shared";

// Bar colours on the blue (accent) tile, from the tile's own roles
const ON_ACCENT = {
  fill: "var(--ds-on-accent)",
  track: "color-mix(in srgb, var(--ds-on-accent) 28%, var(--ds-accent))",
};

/**
 * Progress and finish controls of the side column. The blue tile is the figure the student
 * wants: sections scored while the test is under way (with a bar), the final score after it.
 * Below it the End test button (always available while the test is open; the one filled button
 * when nothing else is left to do) or, after the test, View leaderboard.
 *
 * Props: scored, total, completed, finalScore, timeUsedSeconds, canEnd, endIsNext, onEnd, onLeaderboard
 */
const ProgressPanel = ({ scored, total, completed, finalScore, timeUsedSeconds, canEnd, endIsNext, onEnd, onLeaderboard }) => {
  if (completed) {
    return (
      <div className="sxv-progress">
        <StatTile
          tone="accent"
          size="m"
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
        tone="accent"
        size="m"
        label="Your progress"
        value={`${scored} of ${total}`}
        context={
          <div className="sxv-progress__context">
            <ProgressBar value={scored} max={total} label="Sections scored" hideLabel valueLabel={null} colors={ON_ACCENT} />
            <p>
              sections scored. A section's timer runs only while you are inside it. You can start the next section without waiting for
              scores.
            </p>
          </div>
        }
      />
      <Button
        variant={endIsNext ? "primary" : "secondary"}
        fullWidth
        startIcon={<FlagCheckeredIcon size={18} aria-hidden="true" />}
        onClick={onEnd}
        disabled={!canEnd}
      >
        End test
      </Button>
    </div>
  );
};

export default ProgressPanel;
