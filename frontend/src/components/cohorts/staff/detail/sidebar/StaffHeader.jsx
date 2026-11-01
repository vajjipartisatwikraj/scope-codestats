import React from 'react';
import { ChartLineUpIcon } from '@phosphor-icons/react/dist/csr/ChartLineUp';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/csr/EyeSlash';
import { Badge, Button } from '../../../../ui';
import '../../../student/detail/header/cohortHeader.css';
import './staffSidebar.css';

/**
 * The accent tile at the top of the staff sidebar, in the student header's shape: the name, what the
 * cohort is about, whether it is published (a badge with an icon and a word) with the button that
 * publishes or unpublishes it, and the Progress view. Its buttons carry the Daylight palette, so
 * they are white on the accent in both themes.
 *
 *   cohort, panel, onPanel   as CohortHeader; panel is 'questions' | 'notes' | 'progress'
 *   busy                     a publish is running
 *   onTogglePublished()
 */
export default function StaffHeader({ cohort, panel, onPanel, busy, onTogglePublished }) {
  const draft = Boolean(cohort.isDraft);
  return (
    <header className="cdh">
      <h1 className="cdh-title">{cohort.title}</h1>
      {cohort.description ? <p className="cdh-description">{cohort.description}</p> : null}

      <div className="cdh-actions cad-actions" data-theme="daylight">
        <Badge tone={draft ? 'neutral' : 'success'} icon={draft ? <EyeSlashIcon size={14} weight="regular" aria-hidden="true" /> : <EyeIcon size={14} weight="fill" aria-hidden="true" />}>
          {draft ? 'Draft' : 'Published'}
        </Badge>
        <Button size="sm" variant="secondary" loading={busy} onClick={onTogglePublished}>
          {draft ? 'Publish' : 'Unpublish'}
        </Button>
        <Button size="sm" variant={panel === 'progress' ? 'spotlight' : 'secondary'} aria-pressed={panel === 'progress'} startIcon={<ChartLineUpIcon size={14} weight="regular" aria-hidden="true" />} onClick={() => onPanel('progress')}>
          Progress
        </Button>
      </div>
    </header>
  );
}
