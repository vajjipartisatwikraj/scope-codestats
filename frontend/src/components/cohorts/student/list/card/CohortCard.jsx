import React from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { Card, Skeleton, pluralize } from '../../../../ui';
import { cohortStatus, examWindowText } from '../model/cohortStatus';
import CohortProgress from '../shared/CohortProgress';
import CohortStatusBadge from '../shared/CohortStatusBadge';
import './cohortCard.css';

/**
 * One cohort in the grid, with only what decides whether to open it: its status, the name, a short
 * description, how big it is and, once the student has joined, how far they are. Everything else
 * (rating, audience, rank, reviews) is in the detail panel. The title is the button that opens the
 * panel; it is stretched over the whole card, so the card is one target and one tab stop while its
 * content stays valid markup.
 *
 *   cohort    a cohort of the list (GET /cohorts)
 *   progress  what useCohortProgress answers for it (undefined while loading)
 *   onOpen    called with the cohort id
 */
export default function CohortCard({ cohort, progress, onOpen }) {
  const status = cohortStatus(cohort);
  const schedule = examWindowText(cohort);
  const modules = Array.isArray(cohort.modules) ? cohort.modules.length : 0;
  const questions = progress && progress.status === 'ready' ? progress.totalQuestions : null;

  return (
    <Card as="article" className="chc" data-status={status.key}>
      <CohortStatusBadge status={status} className="chc-status" />

      <h3 className="chc-title">
        <button type="button" className="chc-open" onClick={() => onOpen(cohort._id)} aria-haspopup="dialog">
          {cohort.title}
        </button>
      </h3>

      {cohort.description ? <p className="chc-description">{cohort.description}</p> : null}

      <div className="chc-foot">
        <ul className="chc-meta" aria-label="About this cohort">
          <li>{pluralize(modules, 'module')}</li>
          {questions !== null ? <li>{pluralize(questions, 'question')}</li> : null}
        </ul>

        {schedule ? (
          <p className="chc-schedule">
            <CalendarBlankIcon size={16} weight="regular" aria-hidden="true" />
            <span>
              <span className="ui-sr">Exam window: </span>
              {schedule}
            </span>
          </p>
        ) : null}

        <CohortProgress progress={progress} compact />
      </div>
    </Card>
  );
}

/** A card-shaped placeholder, the same shape as the real thing */
export function CohortCardSkeleton() {
  return (
    <Card as="div" className="chc" aria-hidden="true">
      <Skeleton width={96} height={24} radius="var(--ds-radius-pill)" />
      <Skeleton width="72%" height={26} />
      <div className="chc-skeleton-lines">
        <Skeleton height={14} />
        <Skeleton width="84%" height={14} />
      </div>
      <div className="chc-foot">
        <Skeleton width={150} height={16} />
        <Skeleton height={34} />
      </div>
    </Card>
  );
}
