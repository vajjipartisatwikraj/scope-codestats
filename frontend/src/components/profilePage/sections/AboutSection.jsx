import React from 'react';
import { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle';
import SectionCard from '../parts/SectionCard';

/** The bio, as visitors read it */
export default function AboutSection({ profile, onEdit }) {
  const text = (profile.about || '').trim();
  return (
    <SectionCard
      id="pf-about"
      title="About you"
      description="The first thing most visitors read."
      onEdit={onEdit}
      empty={!text}
      emptyIcon={<UserCircleIcon size={28} aria-hidden="true" />}
      emptyTitle="Tell visitors who you are"
      emptyText="Two or three sentences on what you build and what you are learning make your profile feel personal."
      addLabel="Write your bio"
    >
      <p className="pf-about">{text}</p>
    </SectionCard>
  );
}
