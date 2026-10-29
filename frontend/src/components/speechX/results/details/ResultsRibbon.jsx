import React from "react";
import { Reveal, formatClock, formatDateTime, formatShortDateTime, typeLabel } from "../../shared";
import Collapsible from "./Collapsible";
import RibbonItem from "./RibbonItem";
import RibbonBackButton from "./RibbonBackButton";

/**
 * The details band across the full width under the top bar (a flat surface with a hairline
 * below, no longer a blue fill). A back button returns to the section list.
 *
 * Open: the test name with when it ran and was submitted on the left, and the section's type,
 * time limit, time taken and answered count on the right. `collapsed` (set while the results are
 * scrolled, from 900px wide) folds it to a slim strip: only the "Speech test" name stays on the
 * left and only the "Section type" on the right, and everything else folds away as the band
 * shrinks. Under 900px the page scrolls as a whole and the band is never folded.
 */
const ResultsRibbon = ({ report, collapsed = false, onBack }) => {
  const { test, section } = report;
  const stats = [
    ["Section type", typeLabel(section.type)],
    ["Duration", `${section.timeLimitMinutes} min`],
    ["Time taken", formatClock(section.timeUsedSeconds)],
    ["Answered", `${section.answeredCount} of ${section.questionCount}`],
  ];

  return (
    <section className="sxe-ribbon" aria-label="Test details" data-collapsed={collapsed ? "true" : "false"}>
      <div className="sxe-ribbon__inner">
        <div className="sxe-ribbon__lead">
          <Reveal y={0} delay={0.05} className="sxe-ribbon__back">
            <RibbonBackButton onClick={onBack} />
          </Reveal>
          <Reveal y={8} delay={0.1} className="sxe-ribbon__title">
            <p className="sxe-ribbon__kicker">Speech test</p>
            <h1 className="sxe-ribbon__name">{test.title}</h1>
            <Collapsible open={!collapsed}>
              <div className="sxe-ribbon__when">
                <RibbonItem label="Available">
                  {formatShortDateTime(test.startTime)} to {formatShortDateTime(test.endTime)}
                </RibbonItem>
                <RibbonItem label="Submitted">{formatDateTime(section.submittedAt)}</RibbonItem>
              </div>
            </Collapsible>
          </Reveal>
        </div>

        <div className="sxe-ribbon__stats">
          {stats.map(([label, value], index) => {
            const item = (
              <Reveal y={8} delay={0.14 + index * 0.05} className="sxe-ribbon__stat" data-first={index === 0 ? "true" : undefined}>
                <RibbonItem label={label} large compact={collapsed}>
                  {value}
                </RibbonItem>
              </Reveal>
            );
            // The section type stays; the other figures fold away sideways.
            return index === 0 ? (
              <React.Fragment key={label}>{item}</React.Fragment>
            ) : (
              <Collapsible key={label} axis="x" open={!collapsed} className="sxe-ribbon__fold">
                {item}
              </Collapsible>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ResultsRibbon;
