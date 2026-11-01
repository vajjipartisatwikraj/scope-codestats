import React from 'react';
import { Notice, formatDateTime } from '../../../../ui';
import { formatDuration } from '../../../../../utils/formatDuration';
import './examBanner.css';

/**
 * The exam schedule and live countdown of an exam cohort, at the top of the cohort page. It renders
 * nothing for a practice cohort, so the page can mount it unconditionally. The countdown value comes
 * from useExamGuard, which anchors it to server time; this component only words and formats it.
 *
 * Seconds tick on screen but are hidden from assistive technology, which hears the minutes left once
 * a minute instead (design/screens.md section 22: timers announce at milestones, not each second).
 *
 *   exam         the exam window the server sends (examWindow, or the guard's fresher copy)
 *   remainingMs  milliseconds left, from useExamGuard
 */
export default function ExamBanner({ exam, remainingMs }) {
  if (!exam?.isExam) return null;

  const { state, startsAt, endsAt, msUntilStart, durationMinutes, attemptState, deadlineAt } = exam;
  // An attempt under way runs on the student's own clock, which can pass the cohort's end time
  const inProgress = attemptState === 'in_progress';
  const finished = attemptState === 'submitted' || attemptState === 'time_up';
  const from = formatDateTime(startsAt);
  const to = formatDateTime(endsAt);

  if (finished) {
    const timeUp = attemptState === 'time_up';
    return (
      <Notice tone="warning" title={timeUp ? 'Time is up' : 'Exam submitted'} className="cde">
        {timeUp ? 'Your time ran out and the exam was submitted for you.' : 'You ended this exam. It cannot be opened again.'}
      </Notice>
    );
  }

  if (!inProgress && state === 'not_started') {
    return (
      <Notice tone="info" title="Exam scheduled" className="cde">
        <p>
          You can start this exam between <strong>{from}</strong> and <strong>{to}</strong>.
          {durationMinutes ? ` Once you start, you have ${formatDuration(durationMinutes * 60 * 1000)} to finish.` : ''}
        </p>
        <p>
          Opens in <strong className="cde-time">{formatDuration(msUntilStart)}</strong>.
        </p>
      </Notice>
    );
  }

  if (!inProgress && state === 'ended') {
    return (
      <Notice tone="warning" title="Exam closed" className="cde">
        Joining closed on {to}. This exam can no longer be started.
      </Notice>
    );
  }

  if (state === 'misconfigured') {
    return (
      <Notice tone="danger" title="Exam not scheduled" className="cde">
        This exam has no valid time window. Ask your teacher.
      </Notice>
    );
  }

  // Live: an attempt under way, or the window open and not started yet
  const low = typeof remainingMs === 'number' && remainingMs <= 5 * 60 * 1000;
  const closesAt = formatDateTime(deadlineAt || endsAt);
  const minutesLeft = typeof remainingMs === 'number' ? Math.max(0, Math.ceil(remainingMs / 60000)) : null;

  return (
    <Notice tone={low ? 'warning' : 'success'} title={inProgress ? 'Exam in progress' : 'Exam open'} className="cde">
      <p>
        {inProgress ? 'Time left: ' : 'You will get: '}
        <strong className="cde-time" aria-hidden="true">
          {formatDuration(remainingMs)}
        </strong>
        {minutesLeft !== null ? <span className="ui-sr">{`${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'} left`}</span> : null}
      </p>
      <p className="cde-note">
        {inProgress
          ? `Your exam closes at ${closesAt}. When your time ends it is submitted for you.`
          : durationMinutes
            ? `Joining closes at ${to}. Your ${durationMinutes}-minute timer starts when you open the exam.`
            : `Anything submitted after ${to} is not accepted.`}
      </p>
    </Notice>
  );
}
