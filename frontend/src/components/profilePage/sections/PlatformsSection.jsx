import React from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { LinkSimpleIcon } from '@phosphor-icons/react/dist/csr/LinkSimple';
import { PlatformIcon } from '../../custom-components';
import { Badge, Button, IconButton, Tip, formatDateTime, relativeTime } from '../../ui';
import SectionCard from '../parts/SectionCard';
import { PLATFORMS } from '../profileModel';
import { PLATFORMS as PROFILE_LINKS } from '../../publicProfile/profileModel';

const STALE_MS = 36 * 60 * 60 * 1000;

/**
 * How current a platform's numbers are. Stale data (over 36 hours) and a failed update get a warning
 * badge, as the design rules ask, so nobody mistakes old numbers for live ones.
 */
export function syncState(details) {
  if (!details) return { tone: 'neutral', label: 'Waiting for the first update' };
  if (details.lastUpdateStatus === 'error') return { tone: 'warning', label: 'Last update failed' };
  if (!details.lastUpdated) return { tone: 'neutral', label: 'Waiting for the first update' };
  const age = Date.now() - new Date(details.lastUpdated).getTime();
  return { tone: age > STALE_MS ? 'warning' : 'neutral', label: `Synced ${relativeTime(details.lastUpdated)}`, time: details.lastUpdated };
}

/**
 * The five platforms and where each stands. "Not linked" is not zero, so an unlinked platform says so
 * and offers to link it.
 */
export default function PlatformsSection({ profile, onEdit }) {
  const linkedCount = PLATFORMS.filter((platform) => profile.profiles?.[platform.key]?.username).length;

  return (
    <SectionCard
      id="pf-platforms"
      title="Coding platforms"
      description="Your score and rank are built from the platforms you link."
      onEdit={onEdit}
      editLabel="Manage"
      empty={linkedCount === 0}
      emptyIcon={<LinkSimpleIcon size={28} aria-hidden="true" />}
      emptyTitle="Link your first platform"
      emptyText="Add your LeetCode, Codeforces, CodeChef, HackerRank or GitHub username. Your score and rank start counting from the next nightly update."
      addLabel="Link a platform"
    >
      <ul className="pf-rows">
        {PLATFORMS.map((platform) => {
          const info = profile.profiles?.[platform.key] || {};
          const isLinked = Boolean(info.username);
          const state = syncState(info.details);
          const link = PROFILE_LINKS.find((entry) => entry.key === platform.key);
          const href = isLinked && link && link.url ? link.url(info.username) : null;
          return (
            <li key={platform.key} className="pf-row pf-row--platform">
              <PlatformIcon platform={platform.key} size={28} />
              <div className="pf-row__main">
                <p className="pf-row__title">{platform.name}</p>
                <p className="pf-row__meta">{isLinked ? info.username : 'Not linked'}</p>
                {isLinked ? (
                  <span className="pf-row__sync">
                    {state.time ? (
                      <Tip text={formatDateTime(state.time)}>
                        <span>
                          <Badge tone={state.tone}>{state.label}</Badge>
                        </span>
                      </Tip>
                    ) : (
                      <Badge tone={state.tone}>{state.label}</Badge>
                    )}
                  </span>
                ) : null}
              </div>
              {isLinked ? (
                href ? (
                  <IconButton href={href} target="_blank" rel="noopener noreferrer" size="sm" label={`Open ${platform.name} profile (opens in a new tab)`}>
                    <ArrowUpRightIcon size={18} aria-hidden="true" />
                  </IconButton>
                ) : null
              ) : (
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  Link {platform.name}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
