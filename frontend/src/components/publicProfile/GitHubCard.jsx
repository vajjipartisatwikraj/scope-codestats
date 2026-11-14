import React from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/csr/GithubLogo';
import { Button, Card, formatNumber } from '../ui';
import { AnimatedNumber } from '../custom-components';
import ActivityPanel from './ActivityPanel';

const FIGURES = [
  { key: 'publicRepos', label: 'Public repositories' },
  { key: 'totalCommits', label: 'Commits' },
  { key: 'contributionsLastYear', label: 'Contributions, last year' },
  { key: 'starsReceived', label: 'Stars received' },
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
];

/**
 * GitHub, in its own card under the coding platforms: its year heatmap (contributions per day, in
 * white) with its streaks, then the numbers the server keeps (repositories, commits, contributions,
 * stars, followers). Nothing is loaded from GitHub in the browser: no third-party script, no embedded
 * image.
 *
 *   platform   the github entry from platformsOf(), or undefined
 *   activity   { dailyActivity, activeDays, totalCount, days } from the profile, or null
 */
export default function GitHubCard({ platform, activity }) {
  if (!platform) return null;
  const data = platform.data;
  const shown = FIGURES.filter((figure) => (data[figure.key] || 0) > 0);
  const hasActivity = Boolean(activity && Array.isArray(activity.dailyActivity));

  return (
    <Card
      className="pp-card"
      title="GitHub"
      description={data.username ? `github.com/${data.username}` : undefined}
      actions={
        platform.href ? (
          <Button as="a" size="sm" href={platform.href} target="_blank" rel="noopener noreferrer" startIcon={<GithubLogoIcon size={18} aria-hidden="true" />} endIcon={<ArrowUpRightIcon size={16} aria-hidden="true" />}>
            View profile<span className="ui-sr"> (opens in a new tab)</span>
          </Button>
        ) : null
      }
    >
      {hasActivity ? <ActivityPanel activity={activity} sourceKey="github" /> : null}

      {shown.length > 0 ? (
        <dl className={hasActivity ? 'pp-github pp-github--below' : 'pp-github'}>
          {shown.map((figure) => (
            <div key={figure.key}>
              <dt>{figure.label}</dt>
              <dd>
                <AnimatedNumber value={data[figure.key]} format={formatNumber} />
              </dd>
            </div>
          ))}
        </dl>
      ) : !hasActivity ? (
        <p className="pp-muted">No public GitHub activity has been recorded yet.</p>
      ) : null}
    </Card>
  );
}
