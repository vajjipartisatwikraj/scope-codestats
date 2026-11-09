import React from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { BroadcastIcon } from "@phosphor-icons/react/dist/csr/Broadcast";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { LockIcon } from "@phosphor-icons/react/dist/csr/Lock";
import { CircleDashedIcon } from "@phosphor-icons/react/dist/csr/CircleDashed";
import { TimerIcon } from "@phosphor-icons/react/dist/csr/Timer";
import { HourglassIcon } from "@phosphor-icons/react/dist/csr/Hourglass";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { Badge } from "../../ui";
import { EXAM_STATUS_META, SECTION_STATUS_BADGE_META } from "./examStatus";
import "./speechX.css";

const ICONS = {
  upcoming: CalendarBlankIcon,
  live: BroadcastIcon,
  completed: CheckCircleIcon,
  not_attempted: MinusCircleIcon,
  ended: LockIcon,
  closed: LockIcon,
  not_started: CircleDashedIcon,
  in_progress: TimerIcon,
  queued: HourglassIcon,
  scoring: HourglassIcon,
  scored: CheckCircleIcon,
  failed: WarningCircleIcon,
  unscored: MinusCircleIcon,
};

/**
 * ExamStatusBadge: a ui Badge with an icon and a word for the status of a test or of one section.
 * It replaces ExamStatusPill (on the blue banner) and SectionStatusChip.
 *
 * Props
 *   status   a test status:    'upcoming' Upcoming | 'live' Live (the icon pulses) | 'completed' Completed |
 *                              'not_attempted' Not attempted | 'ended' Ended | 'closed' Closed
 *            a section status: 'not_started' Not started | 'in_progress' In progress |
 *                              'queued' / 'scoring' Waiting for score | 'scored' Score ready |
 *                              'failed' Scoring failed | 'unscored' Not scored (the test was ended first)
 *            (examStatusOf(windowState, attempt) returns a test status.) An unknown status renders nothing.
 *   className   passed to the badge
 *
 * Example:  <ExamStatusBadge status={examStatusOf(windowState, attempt)} />
 */
const ExamStatusBadge = ({ status, className }) => {
  const meta = EXAM_STATUS_META[status] || SECTION_STATUS_BADGE_META[status];
  const Icon = ICONS[status];
  if (!meta || !Icon) return null;

  return (
    <Badge tone={meta.tone} className={className} icon={<Icon className={meta.pulse ? "sx-pulse" : undefined} size={14} weight="bold" aria-hidden="true" />}>
      {meta.label}
    </Badge>
  );
};

export default ExamStatusBadge;
