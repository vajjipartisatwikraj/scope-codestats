import React from "react";
import { FocusHeader } from "../shared";
import { SegmentedProgress } from "../../custom-components";
import TimerPill from "./TimerPill";
import "./runner.css";

/**
 * Fixed top bar of the question screen: the brand (plain text, not a link), where the student is in
 * the test with the section title, one progress segment per question, the time left, and the
 * connection, theme and profile tools that FocusHeader carries.
 *
 * The brand is not a link here, so the only ways out of a running section are the submit and
 * leave dialogs.
 *
 * `segments` is one of "active" | "done" | "idle" per question (the screen's own words); they are
 * mapped to the progress component's current | done | todo.
 */
const STATE_OF = { active: "current", done: "done", idle: "todo" };

const RunnerNavbar = ({ label, title, segments, progressLabel, remainingMs }) => {
  const list = segments.map((segment, index) => ({
    key: index,
    state: STATE_OF[segment] || "todo",
    label: `Question ${index + 1}`,
  }));
  // Many questions: thinner gaps and segments so the row never overflows the bar.
  const crowded = list.length > 20;

  return (
    <FocusHeader subtitle="Speech Judge" locked compact>
      <div className="sxr-bar">
        <span className="sxr-bar__divider sx-hide-narrow" aria-hidden="true" />

        <div className="sxr-bar__title sx-hide-phone">
          <p className="sxr-bar__label">{label}</p>
          <p className="sxr-bar__name" title={title}>
            {title}
          </p>
        </div>

        <div className="sxr-bar__progress sx-hide-narrow" role="group" aria-label={progressLabel}>
          <SegmentedProgress segments={list} label="Questions" style={crowded ? { gap: 3 } : undefined} />
        </div>

        <TimerPill remainingMs={remainingMs} />
      </div>
    </FocusHeader>
  );
};

export default RunnerNavbar;
