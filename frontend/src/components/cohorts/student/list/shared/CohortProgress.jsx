import React from 'react';
import { Skeleton, formatNumber } from '../../../../ui';
import { ProgressBar } from '../../../../custom-components';
import './cohortShared.css';

/**
 * The student's progress in one cohort, in every state it can be in: still loading, failed, not
 * started, or a bar with "63 of 515 solved". Shared by the card and the detail panel.
 *
 *   progress   what useCohortProgress answers for the cohort: undefined while loading,
 *              { status: 'failed' }, or { status: 'ready', isEnrolled, solvedQuestions,
 *              totalQuestions, progressPercentage }
 *   label      the name above the bar ('Your progress'); the detail panel already has that as
 *              its section title, so it passes another
 *   compact    for the card: one line ("63 of 515 solved" and the percentage) over a thin bar, and
 *              nothing at all when there is no progress to show (the status badge already says
 *              "Not started")
 */
export default function CohortProgress({ progress, label = 'Your progress', compact = false }) {
  if (!progress) {
    return (
      <div className="chs-progress" role="status" aria-label="Loading your progress">
        {compact ? null : <Skeleton width="38%" height={14} />}
        <Skeleton height={compact ? 6 : 10} radius="var(--ds-radius-pill)" />
      </div>
    );
  }

  const ready = progress.status === 'ready' && progress.isEnrolled && progress.totalQuestions > 0;

  if (!ready) {
    if (compact) return null;
    if (progress.status === 'failed') return <p className="chs-progress__note">Your progress is not available right now.</p>;
    if (!progress.isEnrolled) return <p className="chs-progress__note">You have not started this cohort yet.</p>;
    return <p className="chs-progress__note">This cohort has no questions yet.</p>;
  }

  if (compact) {
    return (
      <ProgressBar
        className="chs-progress__bar"
        size="sm"
        label={`${formatNumber(progress.solvedQuestions)} of ${formatNumber(progress.totalQuestions)} solved`}
        value={progress.progressPercentage}
        valueLabel={`${formatNumber(progress.progressPercentage)}%`}
      />
    );
  }

  return (
    <ProgressBar
      className="chs-progress__bar"
      label={label}
      value={progress.progressPercentage}
      valueLabel={`${formatNumber(progress.solvedQuestions)} of ${formatNumber(progress.totalQuestions)} solved`}
    />
  );
}
