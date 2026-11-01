import React from 'react';
import { Card } from '../../../../ui';
import CohortHeader from '../header/CohortHeader';
import ModuleList from '../modules/ModuleList';
import './cohortSidebar.css';

/**
 * The left column: one card with the cohort's header (the accent-coloured top: name, status, overall
 * progress and the two cohort-wide views) joined to the list of modules under it. The header and
 * the list are separate components (header/, modules/); this only puts them in one frame, so the
 * list scrolls inside the card while the header stays in view.
 *
 *   cohort, panel, onPanel   see CohortHeader
 *   modules, byQuestion, selectedId, onSelect   see ModuleList
 */
export default function CohortSidebar({ cohort, panel, onPanel, modules, byQuestion, selectedId, onSelect }) {
  return (
    <Card as="div" flush className="cds">
      <CohortHeader cohort={cohort} panel={panel} onPanel={onPanel} />
      <ModuleList modules={modules} byQuestion={byQuestion} selectedId={selectedId} onSelect={onSelect} />
    </Card>
  );
}
