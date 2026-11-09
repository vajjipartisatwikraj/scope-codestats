import React from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { Card, Skeleton, formatNumber, pluralize } from "../../ui";
import { ProgressBar } from "../../custom-components";
import { ExamStatusBadge, examStatusOf, formatShortDateTime } from "../shared";

/**
 * One test in the student's grid, built like a cohort card: the status, the name (the button that
 * opens the details drawer, stretched over the whole card so the card is one target and one tab
 * stop), a short description, and a foot with how big the test is, when it runs and, once the
 * student has started it, how many sections are scored.
 *
 * Props
 *   test, state ('upcoming' | 'live' | 'ended')
 *   onOpen
 */
const TestCard = ({ test, state, onOpen }) => {
  const sections = Array.isArray(test.sections) ? test.sections : [];
  const questions = sections.reduce((sum, section) => sum + (section.questionCount || 0), 0);
  const scored = test.attempt?.sections?.filter((section) => section.status === "scored").length || 0;
  const percent = sections.length > 0 ? Math.round((scored / sections.length) * 100) : 0;

  return (
    <Card as="article" className="sxd-card">
      <ExamStatusBadge status={examStatusOf(state, test.attempt)} className="sxd-card__status" />

      <h3 className="sxd-card__title">
        <button type="button" className="sxd-card__open" onClick={onOpen} aria-haspopup="dialog">
          {test.title}
        </button>
      </h3>

      {test.description ? <p className="sxd-card__description">{test.description}</p> : null}

      <div className="sxd-card__foot">
        {sections.length > 0 ? (
          <ul className="sxd-card__meta" aria-label="About this test">
            <li>{pluralize(sections.length, "section")}</li>
            {questions > 0 ? <li>{pluralize(questions, "question")}</li> : null}
          </ul>
        ) : null}

        <p className="sxd-card__schedule">
          <CalendarBlankIcon size={16} weight="regular" aria-hidden="true" />
          <span>
            <span className="sx-sr">Available: </span>
            {formatShortDateTime(test.startTime)} to {formatShortDateTime(test.endTime)}
          </span>
        </p>

        {test.attempt && sections.length > 0 ? (
          <ProgressBar
            size="sm"
            label={`${formatNumber(scored)} of ${formatNumber(sections.length)} sections scored`}
            value={percent}
            valueLabel={`${formatNumber(percent)}%`}
          />
        ) : null}
      </div>
    </Card>
  );
};

/** A card-shaped placeholder, the same shape as the real thing */
export const TestCardSkeleton = () => (
  <Card as="div" className="sxd-card" aria-hidden="true">
    <Skeleton width={96} height={24} radius="var(--ds-radius-pill)" />
    <Skeleton width="72%" height={26} />
    <div className="sxd-card__lines">
      <Skeleton height={14} />
      <Skeleton width="84%" height={14} />
    </div>
    <div className="sxd-card__foot">
      <Skeleton width={150} height={16} />
      <Skeleton height={16} />
    </div>
  </Card>
);

export default TestCard;