import React from "react";
import { ChartLegend, TimelineStrip } from "../../../custom-components";

const KINDS = {
  start: { label: "Start", tone: "warning" },
  speech: { label: "Speech", tone: "accent" },
  pause: { label: "Pause", tone: "warning" },
  end: { label: "End", tone: "warning" },
};

const LEGEND = [
  { key: "speech", label: "Speech", color: "var(--ds-accent)" },
  { key: "pause", label: "Silence or pause", color: "var(--ds-warning)" },
];

const seconds = (value) => `${value}s`;

/**
 * The recording as a strip (the custom TimelineStrip): silence before the first word, each
 * stretch of speech, pauses between them, and silence at the end. Widths follow duration; every
 * part is named and timed inside it when it is wide enough, and in the hover card and the table
 * for assistive technology otherwise.
 *
 *   timeline  { totalS, segments: [{ type: "start" | "speech" | "pause" | "end", seconds }] } or null
 */
const SpeechTimeline = ({ timeline }) => {
  if (!timeline) return null;

  const parts = timeline.segments.map((segment, index) => ({
    key: index,
    label: KINDS[segment.type]?.label || segment.type,
    value: segment.seconds,
    tone: KINDS[segment.type]?.tone || "warning",
  }));
  const summary = `${timeline.totalS} s in total. ${parts.map((part) => `${part.label} ${seconds(part.value)}`).join(", ")}.`;

  return (
    <div className="sxe-timeline">
      <p className="sxe-timeline__title">Speech timeline ({timeline.totalS} s total)</p>
      <TimelineStrip data={parts} formatValue={seconds} title="Speech timeline" summary={summary} />
      <ChartLegend items={LEGEND} label="Timeline key" />
    </div>
  );
};

export default SpeechTimeline;
