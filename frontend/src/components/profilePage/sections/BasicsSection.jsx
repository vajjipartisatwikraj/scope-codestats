import React from 'react';
import { IdentificationCardIcon } from '@phosphor-icons/react/dist/csr/IdentificationCard';
import SectionCard from '../parts/SectionCard';
import { departmentLabel } from '../profileModel';
import { yearLabel } from '../../publicProfile/profileModel';

/** Personal details: the facts that identify the student. Always filled in after setup. */
export default function BasicsSection({ profile, onEdit }) {
  const year = yearLabel(profile.graduationYear);
  // Someone outside the college typed their own department and gives a college name instead of a section
  const external = profile.institutional === false;
  const rows = [
    { label: 'Full name', value: profile.name },
    { label: 'Roll number', value: profile.rollNumber },
    ...(external ? [{ label: 'College', value: profile.collegeName }] : []),
    { label: 'Department', value: profile.department ? (external ? profile.department : `${profile.department} \u00b7 ${departmentLabel(profile.department)}`) : '' },
    ...(external && !profile.section ? [] : [{ label: 'Section', value: profile.section ? `Section ${profile.section}` : '' }]),
    { label: 'Year', value: year ? (profile.graduationYear ? `${year}, class of ${profile.graduationYear}` : year) : '' },
    { label: 'Mobile number', value: profile.phone },
    { label: external ? 'Email' : 'College email', value: profile.email },
  ];
  const missing = rows.filter((row) => !row.value).length === rows.length;

  return (
    <SectionCard
      id="pf-basics"
      title="Personal details"
      description="Who you are. Your email and mobile number stay private."
      onEdit={onEdit}
      empty={missing}
      emptyIcon={<IdentificationCardIcon size={28} aria-hidden="true" />}
      emptyTitle="Add your personal details"
      emptyText="Your name, department and section tell visitors who they are looking at."
      addLabel="Add details"
    >
      <dl className="ui-detail__facts">
        {rows.map((row) => (
          <div className="ui-detail__fact" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value || <span className="pf-missing">Not added</span>}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
