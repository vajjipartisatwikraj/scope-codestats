import React from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/csr/LockSimple";
import { Chip, formatNumber } from "../../ui";
import { SpeechCard, InfoLine, formatDuration, formatShortDateTime, typeLabel } from "../shared";

/**
 * Everything a student should know about a test before starting: a banner, headline figures
 * (sections, questions, time), when it is open, how it is scored and which skills it covers. All
 * values come from the test.
 *
 * The test's own name is the page heading (h1), so the banner here says what the card is.
 *
 * Props: test { title, description, startTime, endTime, sections[{ questionCount, timeLimitMinutes, type }] }
 */
const TestSummaryCard = ({ test }) => {
  const questionCount = test.sections.reduce((sum, s) => sum + s.questionCount, 0);
  const totalMinutes = test.sections.reduce((sum, s) => sum + s.timeLimitMinutes, 0);
  const skills = [...new Set(test.sections.map((s) => s.type))];

  return (
    <SpeechCard
      className="sxs-summary"
      label="Communication test"
      title="About this test"
      description={test.description || "Read, listen, speak and tell stories."}
      compact
      fill
    >
      {/* Headline figures */}
      <dl className="sxs-figures">
        <div className="sxs-figure">
          <dt className="sxs-figure__label">Sections</dt>
          <dd className="sxs-figure__value">{formatNumber(test.sections.length)}</dd>
        </div>
        <div className="sxs-figure">
          <dt className="sxs-figure__label">Questions</dt>
          <dd className="sxs-figure__value">{formatNumber(questionCount)}</dd>
        </div>
        <div className="sxs-figure">
          <dt className="sxs-figure__label">Total time</dt>
          <dd className="sxs-figure__value">{formatDuration(totalMinutes)}</dd>
        </div>
      </dl>

      <hr className="sx-divider" />

      <div className="sxs-facts">
        <InfoLine icon={CalendarBlankIcon} label="Available" value={`${formatShortDateTime(test.startTime)} to ${formatShortDateTime(test.endTime)}`} />
        <InfoLine icon={StarIcon} label="Scoring" value="Out of 100" />
        <InfoLine icon={LockSimpleIcon} label="Attempts" value="One attempt" />
      </div>

      {skills.length > 0 ? (
        <>
          <hr className="sx-divider" />
          <div className="sxs-skills">
            <p className="sxs-skills__label">Covers</p>
            <ul className="sxs-skills__list">
              {skills.map((type) => (
                <li key={type}>
                  <Chip>{typeLabel(type)}</Chip>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </SpeechCard>
  );
};

export default TestSummaryCard;
