import React from 'react';
import { BuildingsIcon } from '@phosphor-icons/react/dist/csr/Buildings';
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/csr/GithubLogo';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { HashIcon } from '@phosphor-icons/react/dist/csr/Hash';
import { LinkedinLogoIcon } from '@phosphor-icons/react/dist/csr/LinkedinLogo';
import { ShareNetworkIcon } from '@phosphor-icons/react/dist/csr/ShareNetwork';
import { UsersThreeIcon } from '@phosphor-icons/react/dist/csr/UsersThree';
import { Avatar, Badge, Button } from '../ui';
import { linkedinHref, platformsOf, safeUrl, titleCase, yearLabel } from './profileModel';

/**
 * The top of the profile: a solid accent band, the picture overlapping it, the name as the page's
 * single h1, who the student is (department, section, year, roll number) and the ways to reach
 * them (LinkedIn, resume, GitHub) next to the one primary button of the page, Share.
 *
 *   profile   the answer of the public profile endpoint
 *   onShare   opens the share dialog
 */
export default function ProfileHero({ profile, onShare }) {
  const name = titleCase(profile.name) || 'Student';
  const year = yearLabel(profile.graduatingYear);
  const linkedin = linkedinHref(profile.linkedinUrl);
  const resume = safeUrl(profile.resumeLink);
  const github = platformsOf(profile.codingProfiles).find((platform) => platform.key === 'github');

  const facts = [
    profile.department ? { key: 'department', icon: BuildingsIcon, text: profile.department } : null,
    profile.section ? { key: 'section', icon: UsersThreeIcon, text: `Section ${profile.section}` } : null,
    year ? { key: 'year', icon: GraduationCapIcon, text: profile.graduatingYear ? `${year}, class of ${profile.graduatingYear}` : year } : null,
    profile.rollNumber ? { key: 'roll', icon: HashIcon, text: profile.rollNumber } : null,
  ].filter(Boolean);

  return (
    <section className="pp-hero" aria-labelledby="pp-name">
      <div className="pp-hero__band" aria-hidden="true" />

      <div className="pp-hero__body">
        <Avatar className="pp-hero__avatar" name={profile.name} src={profile.profilePicture} size={112} />

        <div className="pp-hero__identity">
          <h1 className="pp-hero__name" id="pp-name">
            {name}
          </h1>
          {facts.length > 0 ? (
            <ul className="pp-hero__facts" aria-label="About this student">
              {facts.map(({ key, icon: Icon, text }) => (
                <li key={key}>
                  <Badge icon={<Icon size={14} weight="regular" aria-hidden="true" />}>{text}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="pp-hero__actions">
          {linkedin ? (
            <Button as="a" href={linkedin} target="_blank" rel="noopener noreferrer" startIcon={<LinkedinLogoIcon size={18} aria-hidden="true" />}>
              LinkedIn<span className="ui-sr"> (opens in a new tab)</span>
            </Button>
          ) : null}
          {resume ? (
            <Button as="a" href={resume} target="_blank" rel="noopener noreferrer" startIcon={<FileTextIcon size={18} aria-hidden="true" />}>
              Resume<span className="ui-sr"> (opens in a new tab)</span>
            </Button>
          ) : null}
          {github && github.href ? (
            <Button as="a" href={github.href} target="_blank" rel="noopener noreferrer" startIcon={<GithubLogoIcon size={18} aria-hidden="true" />}>
              GitHub<span className="ui-sr"> (opens in a new tab)</span>
            </Button>
          ) : null}
          <Button variant="primary" onClick={onShare} startIcon={<ShareNetworkIcon size={18} aria-hidden="true" />}>
            Share
          </Button>
        </div>
      </div>
    </section>
  );
}
