import React from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { Button, formatDate, formatNumber } from '../ui';
import { Gauge, PieChart } from '../custom-components';
import { Block, BlockGrid, FactList, Kpi, KpiRow } from './PlatformParts';

const LEVELS = [
  { key: 'easyProblemsSolved', label: 'Easy', color: 'var(--ds-series-green)' },
  { key: 'mediumProblemsSolved', label: 'Medium', color: 'var(--ds-series-amber)' },
  { key: 'hardProblemsSolved', label: 'Hard', color: 'var(--ds-series-coral)' },
];

const count = (value) => (value ? formatNumber(value) : null);
/** Ratings are shown as whole numbers: 1749.03 is 1,749 */
const whole = (value) => formatNumber(Math.round(value));
const place = (value) => (value ? `#${formatNumber(value)}` : null);

/** The KPI row of a platform: the figures it really has, the problems solved first */
function figuresOf(platform) {
  const data = platform.data;
  const figures = [
    { label: 'Problems solved', value: formatNumber(data.problemsSolved || 0), lead: true },
    { label: 'Score', value: formatNumber(data.score || 0) },
  ];

  if (platform.key === 'scopecodestats') {
    if (data.totalCohortsCompleted) figures.push({ label: 'Cohorts completed', value: formatNumber(data.totalCohortsCompleted) });
    if (data.totalPracticeArenaContests) figures.push({ label: 'Practice contests', value: formatNumber(data.totalPracticeArenaContests) });
    return figures;
  }

  if (data.rating) {
    figures.push({ label: 'Rating', value: whole(data.rating), note: data.maxRating && Math.round(data.maxRating) !== Math.round(data.rating) ? `best ${whole(data.maxRating)}` : null });
  }
  if (data.contestsParticipated) figures.push({ label: 'Contests', value: formatNumber(data.contestsParticipated) });
  return figures;
}

/** Where the student stands on the platform: only the facts it has */
function standingOf(platform) {
  const data = platform.data;
  if (platform.key === 'scopecodestats') {
    return [
      { label: 'Cohort problems solved', value: count(data.totalCohortProblemsSolved) },
      { label: 'Cohort score', value: count(data.totalCohortScore) },
      { label: 'Lifetime score', value: count(data.lifetimeScore) },
    ];
  }
  return [
    { label: 'Rank', value: data.rank && data.rank !== 'unrated' ? data.rank : null },
    { label: 'Contest badge', value: data.contestBadge || null },
    { label: 'Global rank', value: place(data.globalRank) },
    { label: 'Country rank', value: place(data.countryRank) },
    { label: 'Institute rank', value: place(data.instituteRank) },
    { label: 'Contest ranking', value: place(data.contestRanking) },
    { label: 'Badges', value: count(data.badges) },
    { label: 'Certificates', value: count(data.certificates) },
  ];
}

/**
 * The tab of one platform: who the student is there, the figures it has, the split by difficulty
 * (a donut), the rating against the best one (a dial) and where they stand. Only what the platform
 * reports is shown, so a platform without difficulty or ratings simply has fewer blocks.
 *
 *   platform   one entry of platformsOf()
 */
export default function PlatformDetail({ platform }) {
  const data = platform.data;
  const figures = figuresOf(platform);
  const standing = standingOf(platform).filter((fact) => fact.value);
  const slices = LEVELS.map((level) => ({ key: level.key, label: level.label, color: level.color, value: data[level.key] || 0 }));
  const hasLevels = slices.some((slice) => slice.value > 0);
  const hasRating = platform.key !== 'scopecodestats' && data.rating > 0;
  const best = Math.max(data.maxRating || 0, data.rating || 0);
  const synced = data.lastUpdated ? formatDate(data.lastUpdated) : null;
  const who = platform.key === 'scopecodestats' ? 'Problems solved in cohorts and the practice arena' : data.username ? `@${data.username}` : platform.name;

  return (
    <div className="pp-plat__content">
      <div className="pp-plat__caption">
        <p>
          {who}
          {synced ? ` \u00b7 Synced ${synced}` : ''}
        </p>
        {platform.href ? (
          <Button as="a" size="sm" variant="ghost" href={platform.href} target="_blank" rel="noopener noreferrer" endIcon={<ArrowUpRightIcon size={16} aria-hidden="true" />}>
            Open on {platform.name}
            <span className="ui-sr"> (opens in a new tab)</span>
          </Button>
        ) : null}
      </div>

      <KpiRow label={`${platform.name} figures`}>
        {figures.map((figure) => (
          <Kpi key={figure.label} lead={figure.lead} label={figure.label} value={figure.value} note={figure.note} />
        ))}
      </KpiRow>

      <BlockGrid>
        {hasLevels ? (
          <Block natural title="By difficulty" note="How the solved problems split">
            <PieChart
              title={`${platform.name} problems by difficulty`}
              data={slices}
              getKey={(slice) => slice.key}
              getLabel={(slice) => slice.label}
              getValue={(slice) => slice.value}
              getColor={(slice) => slice.color}
              size={188}
              totalLabel="problems"
            />
          </Block>
        ) : null}

        {hasRating ? (
          <Block natural title="Rating" note={Math.round(best) > Math.round(data.rating) ? 'Current rating against the best' : 'Current rating, which is the best so far'}>
            <div className="pp-dial-block">
              <Gauge
                value={data.rating}
                min={0}
                max={best}
                ticks={36}
                tickLength={18}
                tickWidth={4.4}
                size={220}
                label={`${platform.name} rating`}
                valueDescription={`${whole(data.rating)}, best ${whole(best)}`}
                colors={{ fill: platform.color, track: 'var(--ds-high)', text: 'var(--ds-text)' }}
              >
                {() => (
                  <>
                    <span className="pp-dial__value">{whole(data.rating)}</span>
                    <span className="pp-dial__unit">best {whole(best)}</span>
                  </>
                )}
              </Gauge>
            </div>
          </Block>
        ) : null}

        {standing.length > 0 ? (
          <Block natural title="Standing" note={platform.key === 'scopecodestats' ? 'Cohort work in numbers' : `Where they stand on ${platform.name}`}>
            <FactList facts={standing} />
          </Block>
        ) : null}
      </BlockGrid>
    </div>
  );
}
