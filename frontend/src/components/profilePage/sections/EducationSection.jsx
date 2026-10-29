import React from 'react';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { Badge } from '../../ui';
import SectionCard from '../parts/SectionCard';
import { formatDateRange } from '../../../utils/education';

/** Education from school to college, as the server orders it */
export default function EducationSection({ profile, onEdit }) {
  const entries = (profile.education || []).filter((entry) => entry && entry.level);
  return (
    <SectionCard
      id="pf-education"
      title="Education"
      description="From school to college."
      onEdit={onEdit}
      empty={entries.length === 0}
      emptyIcon={<GraduationCapIcon size={28} aria-hidden="true" />}
      emptyTitle="Add your education"
      emptyText="Start with your college. Your school or intermediate and your scores are optional."
      addLabel="Add education"
    >
      <ul className="pf-rows">
        {entries.map((entry, index) => {
          const range = formatDateRange(entry.startDate, entry.endDate);
          const line = [entry.level, entry.stream, range].filter(Boolean).join(' \u00b7 ');
          const score = entry.score === null || entry.score === undefined || entry.score === '' ? '' : entry.scoreType === 'Percentage' ? `${entry.score}%` : `${entry.score} CGPA`;
          return (
            <li key={`${entry.level}-${index}`} className="pf-row">
              <span className="pf-mark" aria-hidden="true">
                <GraduationCapIcon size={20} />
              </span>
              <div className="pf-row__main">
                <p className="pf-row__title">{entry.name || entry.level}</p>
                <p className="pf-row__meta">{line}</p>
              </div>
              {score ? <Badge tone="success">{score}</Badge> : null}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
