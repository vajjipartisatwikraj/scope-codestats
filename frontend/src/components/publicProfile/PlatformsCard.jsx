import React, { useState } from 'react';
import { Card, PillTabs, Tip, formatDateTime, relativeTime } from '../ui';
import PlatformDetail from './PlatformDetail';
import PlatformsOverview from './PlatformsOverview';
import { lastSyncOf } from './profileModel';

const ID_PREFIX = 'pp-plat';

/** The short name on a tab: "Scope CodeStats" is "CodeStats", as on the dashboard */
const tabLabel = (platform) => (platform.key === 'scopecodestats' ? 'CodeStats' : platform.name);

/**
 * The coding platforms, built like the dashboard's problems view: a tab for all the platforms
 * together and one tab for each platform, so the numbers of one platform never mix with another's.
 *
 *   All platforms   the total, the platform with the most problems, the average, the share of each
 *                   platform (a donut; select a slice to open that platform) and the counts (bars)
 *   one platform    its figures, the split by difficulty, the rating against the best, where the
 *                   student stands, and a link to the real profile
 *
 * The time of the last update sits in the header, so nobody mistakes old numbers for live ones.
 * GitHub has no problems and its own card.
 *
 *   platforms   from platformsOf()
 */
export default function PlatformsCard({ platforms }) {
  const shown = platforms.filter((platform) => platform.key !== 'github');
  const [chosen, setChosen] = useState('all');
  if (shown.length === 0) return null;

  // A tab that has gone (the platforms changed) falls back to the first
  const tab = chosen === 'all' || shown.some((platform) => platform.key === chosen) ? chosen : 'all';
  const current = shown.find((platform) => platform.key === tab);
  const synced = lastSyncOf(shown);
  const items = [{ key: 'all', label: 'All platforms' }, ...shown.map((platform) => ({ key: platform.key, label: tabLabel(platform) }))];

  return (
    <Card
      className="pp-card pp-plat"
      title="Coding platforms"
      description="Stats from the platforms this student practises on"
      actions={
        synced ? (
          <Tip text={formatDateTime(synced)}>
            <span className="pp-synced">Updated {relativeTime(synced)}</span>
          </Tip>
        ) : null
      }
    >
      <div className="pp-plat__tabs">
        <PillTabs idPrefix={ID_PREFIX} label="Platforms" items={items} value={tab} onChange={setChosen} />
      </div>

      <div className="pp-plat__panel" role="tabpanel" id={`${ID_PREFIX}-panel-${tab}`} aria-labelledby={`${ID_PREFIX}-tab-${tab}`} key={tab}>
        {current ? <PlatformDetail platform={current} /> : <PlatformsOverview platforms={shown} onPick={setChosen} />}
      </div>
    </Card>
  );
}
