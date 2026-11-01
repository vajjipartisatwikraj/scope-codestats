import React from 'react';
import { ChartLineUpIcon } from '@phosphor-icons/react/dist/csr/ChartLineUp';
import { StarIcon } from '@phosphor-icons/react/dist/csr/Star';
import { Button } from '../../../../ui';
import './cohortHeader.css';

/**
 * The top of the left column, drawn on the accent: the cohort's name, what it is about, and the two
 * cohort-wide views (the leaderboard at the left, the student's review at the right). It is the one
 * accent tile of the page and the first part of the sidebar card; the module list continues under it
 * (see sidebar/CohortSidebar). Progress is not repeated here: each module row carries its own, and
 * the Progress view has the totals.
 *
 *   cohort    the cohort of the page
 *   panel     what the right side shows now: 'questions' | 'notes' | 'progress' | 'feedback'
 *   onPanel   (name) => void: toggles 'progress' or 'feedback'
 */
export default function CohortHeader({ cohort, panel, onPanel }) {
  const joined = Boolean(cohort.userProgress);

  return (
    <header className="cdh">
      <h1 className="cdh-title">{cohort.title}</h1>
      {cohort.description ? <p className="cdh-description">{cohort.description}</p> : null}

      {joined ? (
        // The row carries the Daylight palette so its buttons are white with dark text on the accent in both themes
        <div className="cdh-actions" data-theme="daylight">
          <Button size="sm" variant={panel === 'progress' ? 'spotlight' : 'secondary'} aria-pressed={panel === 'progress'} startIcon={<ChartLineUpIcon size={14} weight="regular" aria-hidden="true" />} onClick={() => onPanel('progress')}>
            Progress
          </Button>
          <Button size="sm" variant={panel === 'feedback' ? 'spotlight' : 'secondary'} aria-pressed={panel === 'feedback'} startIcon={<StarIcon size={14} weight={panel === 'feedback' ? 'fill' : 'regular'} aria-hidden="true" />} onClick={() => onPanel('feedback')}>
            Rate and review
          </Button>
        </div>
      ) : null}
    </header>
  );
}
