import React from 'react';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { Badge, EmptyState, formatNumber } from '../../../../ui';
import useScrolling from '../../../../../hooks/useScrolling';
import { moduleSummary } from '../model/progress';
import ModuleRow from './ModuleRow';
import './moduleList.css';

/**
 * The modules of the cohort, one row each, in the teacher's order. A row says how far the student is
 * in that module; the open module is marked. It is a list of buttons: choosing one opens its
 * questions on the right (on a phone, replaces the list).
 *
 * It has no frame of its own: it continues the sidebar card under the cohort header
 * (sidebar/CohortSidebar), and scrolls inside it when the list is taller than the room left.
 *
 *   modules     the cohort's modules
 *   byQuestion  the student's progress by question (model/progress.progressByQuestion)
 *   selectedId  the open module
 *   onSelect    (moduleId) => void
 */
export default function ModuleList({ modules, byQuestion, selectedId, onSelect }) {
  // The list's slim scrollbar shows only while it is being scrolled
  const [listRef, scrolling] = useScrolling();

  return (
    <section className="cdm" aria-labelledby="cdm-title">
      <header className="cdm-head">
        <h2 className="cdm-title" id="cdm-title">
          Modules
        </h2>
        <Badge tone="neutral">{formatNumber(modules.length)}</Badge>
      </header>

      {modules.length === 0 ? (
        <EmptyState compact icon={<StackIcon size={24} weight="regular" />} title="No modules yet" text="Your teacher has not added modules to this cohort. Check back soon." />
      ) : (
        <ul className="cdm-list" ref={listRef} data-scrolling={scrolling ? 'true' : 'false'}>
          {modules.map((module) => (
            <ModuleRow key={module._id} module={module} summary={moduleSummary(module, byQuestion)} active={module._id === selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </section>
  );
}
