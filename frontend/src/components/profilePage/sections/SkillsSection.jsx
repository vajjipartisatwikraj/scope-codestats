import React from 'react';
import { CompassIcon } from '@phosphor-icons/react/dist/csr/Compass';
import { WrenchIcon } from '@phosphor-icons/react/dist/csr/Wrench';
import { Badge } from '../../ui';
import SectionCard from '../parts/SectionCard';

/** Skills in the sets the student made, then nothing else: interests have their own card */
export function SkillsSection({ profile, onEdit }) {
  const sets = (profile.skills || []).filter((set) => set.skills && set.skills.length > 0);
  return (
    <SectionCard
      id="pf-skills"
      title="Skills"
      description="Grouped the way you would explain them."
      onEdit={onEdit}
      empty={sets.length === 0}
      emptyIcon={<WrenchIcon size={28} aria-hidden="true" />}
      emptyTitle="List what you can do"
      emptyText="Group your skills into sets, like Languages, Databases and Tools. Three or more is a strong start."
      addLabel="Add skills"
    >
      <div className="pf-skills">
        {sets.map((set, index) => (
          <section key={`${set.name}-${index}`} aria-label={set.name}>
            <h3 className="pf-skills__name">{set.name}</h3>
            <ul className="pf-tags">
              {set.skills.map((skill) => (
                <li key={skill}>
                  <Badge tone="info">{skill}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SectionCard>
  );
}

/** The areas the student wants to grow in */
export function InterestsSection({ profile, onEdit }) {
  const interests = profile.interests || [];
  return (
    <SectionCard
      id="pf-interests"
      title="Interests"
      description="The areas you want to grow in."
      onEdit={onEdit}
      empty={interests.length === 0}
      emptyIcon={<CompassIcon size={28} aria-hidden="true" />}
      emptyTitle="Choose your interests"
      emptyText="Pick a few areas, like Web Development or Competitive Programming."
      addLabel="Add interests"
    >
      <ul className="pf-tags">
        {interests.map((interest) => (
          <li key={interest}>
            <Badge>{interest}</Badge>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
