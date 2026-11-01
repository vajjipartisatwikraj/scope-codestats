import React from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { Badge, Button, DetailPanel, formatDate, formatNumber } from '../../../../ui';
import { cohortStatus, examNote, examOf, examWindowText, primaryAction, studentsLabel } from '../model/cohortStatus';
import CohortProgress from '../shared/CohortProgress';
import CohortStatusBadge from '../shared/CohortStatusBadge';
import CohortReviews from './CohortReviews';

/**
 * The detail panel of a cohort (the app's DetailPanel from ../ui): status, the description, the
 * numbers that matter, the dates and audience, the student's own progress and the reviews. The main
 * button starts or resumes the cohort, or says why it cannot be opened yet.
 *
 *   cohort      the selected one, or null while the panel is closed
 *   progress    what useCohortProgress answers for it
 *   onClose
 *   onStart     called with the cohort when the main button is pressed
 */
export default function CohortDetails({ cohort, progress, onClose, onStart }) {
  const ready = progress && progress.status === 'ready' ? progress : null;
  const enrolled = Boolean(ready && ready.isEnrolled);
  const action = cohort ? primaryAction(cohort, progress) : null;
  const exam = cohort ? examOf(cohort) : null;
  const global = cohort?.accessType === 'global';
  const modules = cohort && Array.isArray(cohort.modules) ? cohort.modules.length : null;

  const range = cohort ? `${formatDate(cohort.startDate)} to ${formatDate(cohort.endDate)}` : undefined;

  return (
    <DetailPanel
      open={Boolean(cohort)}
      onClose={onClose}
      title={cohort?.title}
      subtitle={range}
      badges={
        cohort ? (
          <>
            <CohortStatusBadge status={cohortStatus(cohort)} />
            {exam ? <Badge tone="neutral">Timed exam</Badge> : null}
          </>
        ) : null
      }
      note={cohort ? examNote(cohort) : null}
      summary={cohort?.description}
      figures={
        cohort
          ? [
              { label: 'Modules', value: modules === null ? null : formatNumber(modules) },
              { label: 'Questions', value: ready ? formatNumber(ready.totalQuestions) : null },
              enrolled ? { label: 'Solved', value: formatNumber(ready.solvedQuestions) } : { label: 'Your score', value: cohort.userProgress ? formatNumber(cohort.userProgress.totalScore || 0) : null },
            ]
          : []
      }
      facts={
        cohort
          ? [
              { label: 'Audience', value: global ? 'All students on the platform' : studentsLabel(cohort) },
              { label: 'Exam window', value: examWindowText(cohort) },
              { label: 'Your rank', value: cohort.userProgress && cohort.userProgress.rank ? `#${formatNumber(cohort.userProgress.rank)}` : null },
            ]
          : []
      }
      sections={
        cohort
          ? [
              { key: 'progress', title: 'Your progress', content: <CohortProgress progress={progress} label="Questions solved" /> },
              { key: 'reviews', title: 'Reviews', content: <CohortReviews cohortId={cohort._id} /> },
            ]
          : []
      }
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {action ? (
            <Button variant="primary" disabled={action.disabled} onClick={() => onStart(cohort)} endIcon={action.disabled ? undefined : <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />}>
              {action.label}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
