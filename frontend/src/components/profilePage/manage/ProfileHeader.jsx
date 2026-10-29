import React from 'react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { BuildingsIcon } from '@phosphor-icons/react/dist/csr/Buildings';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { HashIcon } from '@phosphor-icons/react/dist/csr/Hash';
import { UsersThreeIcon } from '@phosphor-icons/react/dist/csr/UsersThree';
import { Badge, Button } from '../../ui';
import { titleCase, yearLabel } from '../../publicProfile/profileModel';
import { encouragement, leftText } from '../completion';
import ProgressAvatar from '../parts/ProgressAvatar';
import { usernameOfEmail } from '../profileModel';

/**
 * The top of the page: a solid blue band, the picture in a ring that shows how complete the profile
 * is, the name as the page's one h1, who the student is, and the way to see the profile as everyone
 * else sees it. The line under the name says where the profile stands and what is left.
 *
 *   profile      the student's profile
 *   completion   from completionOf()
 */
export default function ProfileHeader({ profile, completion }) {
  const year = yearLabel(profile.graduationYear);
  const username = usernameOfEmail(profile.email);
  const facts = [
    profile.department ? { key: 'department', icon: BuildingsIcon, text: profile.department } : null,
    profile.section ? { key: 'section', icon: UsersThreeIcon, text: `Section ${profile.section}` } : null,
    year ? { key: 'year', icon: GraduationCapIcon, text: profile.graduationYear ? `${year}, class of ${profile.graduationYear}` : year } : null,
    profile.rollNumber ? { key: 'roll', icon: HashIcon, text: profile.rollNumber } : null,
  ].filter(Boolean);

  return (
    <section className="pf-header" aria-labelledby="pf-name">
      <div className="pf-header__band" aria-hidden="true" />

      <div className="pf-header__body">
        <ProgressAvatar name={profile.name} src={profile.profilePicture} percent={completion.percent} />

        <div className="pf-header__text">
          <h1 className="pf-header__name" id="pf-name">
            {titleCase(profile.name) || 'Your profile'}
          </h1>
          <p className="pf-header__lead">
            <strong>{encouragement(completion.percent)}.</strong> {completion.percent >= 100 ? 'Everything visitors look for is on your profile.' : `Your profile is ${completion.percent}% complete. ${leftText(completion.next)}.`}
          </p>
          {facts.length > 0 ? (
            <ul className="pf-header__facts" aria-label="About you">
              {facts.map(({ key, icon: Icon, text }) => (
                <li key={key}>
                  <Badge icon={<Icon size={14} aria-hidden="true" />}>{text}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {username ? (
          <div className="pf-header__actions">
            <Button as="a" href={`/public-profile/${encodeURIComponent(username)}`} target="_blank" rel="noopener noreferrer" endIcon={<ArrowSquareOutIcon size={18} aria-hidden="true" />}>
              View public profile
              <span className="ui-sr"> (opens in a new tab)</span>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
