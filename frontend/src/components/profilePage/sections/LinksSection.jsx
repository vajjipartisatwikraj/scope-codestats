import React from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
import { LinkedinLogoIcon } from '@phosphor-icons/react/dist/csr/LinkedinLogo';
import { LinkSimpleIcon } from '@phosphor-icons/react/dist/csr/LinkSimple';
import { IconButton } from '../../ui';
import SectionCard from '../parts/SectionCard';
import { linkedinHref, safeUrl } from '../../publicProfile/profileModel';
import { withProtocol } from '../profileModel';

/** LinkedIn and the resume, as links that open in a new tab */
export default function LinksSection({ profile, onEdit }) {
  const linkedin = linkedinHref(profile.linkedinUrl);
  const resume = profile.resumeLink ? safeUrl(withProtocol(profile.resumeLink)) : null;
  const rows = [
    { key: 'linkedin', label: 'LinkedIn', href: linkedin, icon: LinkedinLogoIcon, shown: profile.linkedinUrl },
    { key: 'resume', label: 'Resume', href: resume, icon: FileTextIcon, shown: profile.resumeLink },
  ];

  return (
    <SectionCard
      id="pf-links"
      title="Links"
      description="Where people can reach you and read more."
      onEdit={onEdit}
      empty={!profile.linkedinUrl && !profile.resumeLink}
      emptyIcon={<LinkSimpleIcon size={28} aria-hidden="true" />}
      emptyTitle="Add your LinkedIn and resume"
      emptyText="They appear as buttons on your public profile."
      addLabel="Add links"
    >
      <ul className="pf-rows">
        {rows.map(({ key, label, href, icon: Icon, shown }) => (
          <li key={key} className="pf-row">
            <span className="pf-mark" aria-hidden="true">
              <Icon size={20} />
            </span>
            <div className="pf-row__main">
              <p className="pf-row__title">{label}</p>
              <p className="pf-row__meta">{shown ? shown : 'Not added'}</p>
            </div>
            {href ? (
              <IconButton href={href} target="_blank" rel="noopener noreferrer" size="sm" label={`Open ${label} (opens in a new tab)`}>
                <ArrowUpRightIcon size={18} aria-hidden="true" />
              </IconButton>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
