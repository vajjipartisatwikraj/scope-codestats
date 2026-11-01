import React from 'react';
import { TimerIcon } from '@phosphor-icons/react/dist/csr/Timer';
import { Badge } from '../../../../ui';
import { formatDuration } from '../../../../../utils/formatDuration';

/**
 * The time left in an exam, as one badge beside the title: "Exam ends in 42:10". It shows only while
 * an attempt is under way or the window is open, and turns to the warning tone in the last five
 * minutes (the words say it too). The seconds tick on screen but are hidden from assistive
 * technology, which hears the minutes left. Inside an exam tab the shell's own bar shows the
 * countdown, so the page leaves this out there.
 *
 *   exam         the exam window the server sends (from useExamGuard)
 *   remainingMs  milliseconds left, from useExamGuard
 */
export default function ExamTimer({ exam, remainingMs }) {
  if (!exam?.isExam) return null;
  if (exam.attemptState !== 'in_progress' && exam.state !== 'open') return null;
  const low = typeof remainingMs === 'number' && remainingMs <= 5 * 60 * 1000;
  const minutes = typeof remainingMs === 'number' ? Math.max(0, Math.ceil(remainingMs / 60000)) : null;
  return (
    <Badge tone={low ? 'warning' : 'neutral'} icon={<TimerIcon size={14} weight="regular" aria-hidden="true" />}>
      <span aria-hidden="true">Exam ends in {formatDuration(remainingMs)}</span>
      {minutes !== null ? <span className="ui-sr">{`Exam ends in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`}</span> : null}
    </Badge>
  );
}
