import React from "react";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { ChartBarIcon } from "@phosphor-icons/react/dist/csr/ChartBar";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { Button, DetailPanel, formatDateTime, formatNumber } from "../../ui";
import { ExamStatusBadge, examStatusOf, formatCountdown, formatScore, typeLabel } from "../shared";

/** What the main button does for a test, or null when the student cannot start or open it now. */
const actionOf = ({ completed, attempt, state }) => {
  if (completed) return { label: "View result", icon: <ChartBarIcon size={18} aria-hidden="true" /> };
  if (attempt) {
    if (state === "ended" && attempt.status !== "in_progress") return null;
    return { label: "Continue test", icon: <PlayIcon size={18} weight="fill" aria-hidden="true" /> };
  }
  if (state === "live") return { label: "Start test", icon: <PlayIcon size={18} weight="fill" aria-hidden="true" /> };
  return null;
};

/** One line saying where the test stands, with a live countdown while a window is open or about to open. */
const noteOf = ({ completed, attempt, state, startsIn, endsIn }) => {
  if (completed) return { text: "You have finished this test.", timed: false };
  if (state === "upcoming" && startsIn > 0) return { text: `Opens in ${formatCountdown(startsIn)}`, timed: true };
  if (state === "live" && endsIn > 0) return { text: `Closes in ${formatCountdown(endsIn)}`, timed: true };
  if (state === "ended" && !attempt) return { text: "The window closed before you started.", timed: false };
  if (state === "ended") return { text: "The window has closed.", timed: false };
  return null;
};

/** The numbered sections of the test */
const SectionSteps = ({ sections }) => (
  <ol className="ui-detail__steps">
    {sections.map((section, index) => {
      const meta = [
        section.type ? typeLabel(section.type) : null,
        section.timeLimitMinutes ? `${section.timeLimitMinutes} min` : null,
        section.questionCount ? `${section.questionCount} question${section.questionCount === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(" \u00b7 ");
      return (
        <li key={section.sectionId || index} className="ui-detail__step">
          <span className="ui-detail__step-number">{index + 1}</span>
          <span className="ui-detail__step-text">
            <span className="ui-detail__step-title">{section.title || `Section ${index + 1}`}</span>
            {meta ? <span className="ui-detail__step-meta">{meta}</span> : null}
          </span>
        </li>
      );
    })}
  </ol>
);

/**
 * The detail panel of one test (the app's DetailPanel from ../../ui): status, schedule, numbers,
 * the sections, and the button to start or continue the test when it is available.
 *
 * Props
 *   test         the selected test, or null (the panel is closed)
 *   state        'upcoming' | 'live' | 'ended'
 *   serverNow    ms, the server clock, for the countdown
 *   onClose, onOpenTest, onLeaderboard
 */
const TestDetails = ({ test, state, serverNow, onClose, onOpenTest, onLeaderboard }) => {
  const attempt = test?.attempt;
  const completed = attempt?.status === "completed";
  const sections = test?.sections || [];
  const total = sections.length;
  const scored = attempt?.sections?.filter((s) => s.status === "scored").length || 0;
  const action = test ? actionOf({ completed, attempt, state }) : null;
  const note = test
    ? noteOf({
        completed,
        attempt,
        state,
        startsIn: new Date(test.startTime).getTime() - serverNow,
        endsIn: new Date(test.endTime).getTime() - serverNow,
      })
    : null;

  return (
    <DetailPanel
      open={Boolean(test)}
      onClose={onClose}
      title={test?.title}
      badges={test ? <ExamStatusBadge status={examStatusOf(state, attempt)} /> : null}
      note={
        note ? (
          <span className="sxd-note" data-timed={note.timed ? "true" : "false"}>
            {note.timed ? <ClockIcon size={16} weight="bold" aria-hidden="true" /> : null}
            <span>{note.text}</span>
          </span>
        ) : null
      }
      summary={test?.description}
      facts={
        test
          ? [
              { label: "Starts", value: formatDateTime(test.startTime) },
              { label: "Ends", value: formatDateTime(test.endTime) },
            ]
          : []
      }
      figures={[
        { label: total === 1 ? "Section" : "Sections", value: formatNumber(total) },
        { label: "Scored", value: attempt ? `${formatNumber(scored)}/${formatNumber(total)}` : "\u2013" },
        { label: "Final score", value: completed ? formatScore(attempt.finalScore) : "\u2013" },
      ]}
      sections={[{ key: "sections", title: "Sections", content: total > 0 ? <SectionSteps sections={sections} /> : null }]}
      footer={
        test ? (
          <>
            <Button variant="secondary" startIcon={<TrophyIcon size={18} aria-hidden="true" />} onClick={onLeaderboard}>
              Leaderboard
            </Button>
            {action ? (
              <Button variant="primary" startIcon={action.icon} onClick={onOpenTest}>
                {action.label}
              </Button>
            ) : null}
          </>
        ) : null
      }
    />
  );
};

export default TestDetails;
