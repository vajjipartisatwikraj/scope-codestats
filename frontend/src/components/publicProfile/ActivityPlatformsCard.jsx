import brand from '../../brand';
import React, { useState } from 'react';
import { Card, PillTabs, Tip, formatDateTime, relativeTime } from '../ui';
import ActivityPanel from './ActivityPanel';
import PlatformDetail from './PlatformDetail';
import PlatformsOverview from './PlatformsOverview';
import { lastSyncOf } from './profileModel';

const ID_PREFIX = 'pp-plat';

/** The short name on a tab: "Scope CodeStats" is "CodeStats", as on the dashboard */
const tabLabel = (platform) => (platform.key === 'scopecodestats' ? brand.codeStats.name : platform.name);

/** The activity record calls the cohorts 'cohort'; the platform list calls them 'scopecodestats' */
const sourceOf = (platformKey) => (platformKey === 'scopecodestats' ? 'cohort' : platformKey);

/**
 * Activity and coding platforms in one card, tabs on top (as on the dashboard's problems view): a tab
 * for all the platforms together and one for each platform the student has. GitHub has no problems and
 * its own card under this one (GitHubCard), though its days are part of the all platforms heatmap.
 *
 *   All platforms   the year heatmap of cohorts and every platform together with its streaks, then the
 *                   total, the platform with the most problems, the average, the share of each
 *                   platform (a donut; select a slice to open that platform) and the counts (bars)
 *   one platform    that platform's own heatmap in its own colour with its streaks, then its figures,
 *                   the split by difficulty, the rating against the best and where the student stands
 *
 * The time of the last update sits in the header, so nobody mistakes old numbers for live ones.
 *
 *   activity    { dailyActivity, activeDays, totalCount, days } from the profile, or null
 *   platforms   from platformsOf() (GitHub is left out of the tabs)
 */
export default function ActivityPlatformsCard({ activity, platforms: all }) {
  const platforms = all.filter((platform) => platform.key !== 'github');
  const hasActivity = Boolean(activity && Array.isArray(activity.dailyActivity));
  const [chosen, setChosen] = useState('all');
  if (!hasActivity && platforms.length === 0) return null;

  // A tab that has gone (the platforms changed) falls back to the first
  const tab = chosen === 'all' || platforms.some((platform) => platform.key === chosen) ? chosen : 'all';
  const current = platforms.find((platform) => platform.key === tab);
  const synced = lastSyncOf(platforms);
  const items = [{ key: 'all', label: 'All platforms' }, ...platforms.map((platform) => ({ key: platform.key, label: tabLabel(platform) }))];

  let detail;
  if (current) detail = <PlatformDetail platform={current} />;
  else if (platforms.length > 0) detail = <PlatformsOverview platforms={platforms} onPick={setChosen} />;

  return (
    <Card
      className="pp-card pp-plat"
      title="Activity and coding platforms"
      description="A year of activity and the stats from the platforms this student practises on"
      actions={
        synced ? (
          <Tip text={formatDateTime(synced)}>
            <span className="pp-synced">Updated {relativeTime(synced)}</span>
          </Tip>
        ) : null
      }
    >
      {platforms.length > 0 ? (
        <div className="pp-plat__tabs">
          <PillTabs idPrefix={ID_PREFIX} label="Platforms" items={items} value={tab} onChange={setChosen} />
        </div>
      ) : null}

      <div className="pp-plat__panel" role="tabpanel" id={`${ID_PREFIX}-panel-${tab}`} aria-labelledby={`${ID_PREFIX}-tab-${tab}`} key={tab}>
        {hasActivity ? <ActivityPanel activity={activity} sourceKey={current ? sourceOf(current.key) : 'all'} /> : null}
        {detail ? <div className="pp-act__detail">{detail}</div> : null}
      </div>
    </Card>
  );
}
