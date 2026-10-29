import React, { useState } from "react";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { Button, Notice } from "../../ui";
import { ExamStatusBadge, SECTION_TYPE_META, TonalMark, formatScore, typeLabel } from "../shared";

/**
 * One section in the list: its number, name and facts, its status (a word and an icon), its score
 * once it has one, and the action that fits where it is (start, resume, view scores, retry).
 *
 * Props
 *   index                 0-based position, shown as the number
 *   section               { sectionId, title, type, status, score, timeLimitMinutes, questionCount, error }
 *   startable, blockedReason   whether Start works; when not, the reason is printed under the disabled button
 *   isNext                this section's action is the page's one filled (primary) button
 *   onViewScores, onStart, onResume, onRetry (may return a promise)
 */
const SectionRow = ({ index, section, startable, blockedReason, isNext, onViewScores, onStart, onResume, onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  const running = section.status === "in_progress";
  const scored = section.status === "scored";
  const failed = section.status === "failed";
  const notStarted = section.status === "not_started";
  const variant = isNext ? "primary" : "secondary";

  const meta = [
    typeLabel(section.type),
    `${section.timeLimitMinutes} min`,
    `${section.questionCount} question${section.questionCount === 1 ? "" : "s"}`,
  ].join(" \u00b7 ");

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <li className="sxv-row" data-running={running ? "true" : "false"} data-status={section.status}>
      <TonalMark hue={SECTION_TYPE_META[section.type]?.hue || "slate"} size={44}>
        <span className="sxv-row__number">{index + 1}</span>
      </TonalMark>

      <div className="sxv-row__text">
        <h3 className="sxv-row__title">
          <span className="sx-sr">Section {index + 1}: </span>
          {section.title}
        </h3>
        <p className="sxv-row__meta">{meta}</p>
      </div>

      <div className="sxv-row__status">
        <ExamStatusBadge status={section.status} />
        {scored ? (
          <p className="sxv-row__score">
            <span className="sx-sr">Score </span>
            {formatScore(section.score)}
          </p>
        ) : null}
      </div>

      <div className="sxv-row__action">
        {scored ? (
          <Button onClick={onViewScores} aria-label={`View scores of ${section.title}`}>
            View scores
          </Button>
        ) : null}

        {failed ? (
          <Button variant="secondary" startIcon={<ArrowClockwiseIcon size={18} aria-hidden="true" />} onClick={retry} loading={retrying}>
            Retry
          </Button>
        ) : null}

        {running ? (
          <Button variant={variant} startIcon={<PlayIcon size={18} weight="fill" aria-hidden="true" />} onClick={onResume}>
            Resume section
          </Button>
        ) : null}

        {notStarted ? (
          startable ? (
            <Button variant={variant} onClick={onStart}>
              Start section
            </Button>
          ) : (
            <>
              <Button disabled aria-describedby={`sxv-why-${section.sectionId}`}>
                Start section
              </Button>
              <p className="sxv-row__why" id={`sxv-why-${section.sectionId}`}>
                {blockedReason}
              </p>
            </>
          )
        ) : null}
      </div>

      {failed ? (
        <Notice tone="danger" className="sxv-row__notice">
          Your answers are saved, but scoring did not finish. {section.error}
        </Notice>
      ) : null}
    </li>
  );
};

export default SectionRow;
