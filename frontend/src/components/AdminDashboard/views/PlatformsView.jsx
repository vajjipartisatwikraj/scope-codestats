import React, { useState } from 'react';
import { BarChart, PieChart } from '../../custom-components';
import { Card, EmptyState, Notice, PillTabs, StatGrid, StatTile, formatNumber } from '../../ui';
import { signed } from '../model/format';
import { SKIP_IN_STATS, STAT_LABELS } from '../model/performanceModel';
import { PLATFORMS, platformMeta } from '../model/platforms';
import AnalyticsFilters from '../parts/AnalyticsFilters';
import { LoadError, ViewSkeleton } from '../parts/States';

const dash = '\u2013';

/** A ranked list of students with their figure */
function People({ people, label, empty }) {
  if (!people.length) return <EmptyState compact title={empty} />;
  return (
    <ol className="ad-people" aria-label={label}>
      {people.map((person, index) => (
        <li key={person.id} className="ad-person">
          <span className="ad-person__rank" aria-hidden="true">
            {index + 1}
          </span>
          <span className="ad-person__text">
            <span className="ad-person__name">{person.name}</span>
            <span className="ad-person__meta">{[person.rollNumber, person.department].filter(Boolean).join(' · ')}</span>
          </span>
          <span className="ad-person__value">{formatNumber(person.value)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Every platform on one row each; a row opens the platform below */
function ComparisonTable({ platforms, selected, onSelect }) {
  return (
    <Card title="All platforms" description="Averages are over the students who linked the platform. Press a row for its details." className="ad-card">
      <div className="ui-table-wrap ad-wrap">
        <table className="ui-band-table ad-table">
          <caption className="ui-sr">Comparison of the platforms</caption>
          <thead>
            <tr>
              <th scope="col">Platform</th>
              <th scope="col" className="ui-num">Linked</th>
              <th scope="col" className="ui-num">Avg score</th>
              <th scope="col" className="ui-num">Problems solved</th>
              <th scope="col" className="ui-num">Avg problems</th>
              <th scope="col" className="ui-num">Contests</th>
              <th scope="col" className="ui-num">Avg rating</th>
              <th scope="col" className="ui-num">Score change</th>
              <th scope="col" className="ui-num">Problems change</th>
              <th scope="col" className="ui-num">Active</th>
              <th scope="col" className="ui-num">Sync errors</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((platform) => {
              const meta = platformMeta(platform.platform);
              return (
                <tr key={platform.platform} className="ad-row" data-selected={platform.platform === selected ? 'true' : 'false'} onClick={() => onSelect(platform.platform)}>
                  <td>
                    <button type="button" className="ad-platform" aria-pressed={platform.platform === selected} onClick={() => onSelect(platform.platform)}>
                      <span className="ad-dot" style={{ backgroundColor: meta.color }} aria-hidden="true" />
                      {meta.name}
                    </button>
                  </td>
                  <td className="ui-num">{`${formatNumber(platform.linked)} (${platform.linkedRate}%)`}</td>
                  <td className="ui-num">{formatNumber(platform.stats.score.avg)}</td>
                  <td className="ui-num">{platform.stats.problems ? formatNumber(platform.stats.problems.total) : dash}</td>
                  <td className="ui-num">{platform.stats.problems ? formatNumber(platform.stats.problems.avg) : dash}</td>
                  <td className="ui-num">{platform.contestParticipants === null ? dash : formatNumber(platform.stats[platform.platform === 'scopecodestats' ? 'practiceContests' : 'contests'].total)}</td>
                  <td className="ui-num">{platform.rating && platform.rating.rated ? formatNumber(platform.rating.avg) : dash}</td>
                  <td className="ui-num">{signed(platform.gains.score)}</td>
                  <td className="ui-num">{platform.gains.problems === null ? dash : signed(platform.gains.problems)}</td>
                  <td className="ui-num">{formatNumber(platform.active)}</td>
                  <td className="ui-num" data-problem={platform.syncFailing ? 'true' : 'false'}>
                    {formatNumber(platform.syncFailing)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** One platform in detail: tiles, statistics, top students, ratings and (LeetCode) difficulty */
function PlatformDetail({ platform }) {
  const meta = platformMeta(platform.platform);
  const { stats, rating } = platform;

  if (platform.linked === 0) {
    return (
      <Card className="ad-card">
        <EmptyState compact title={`No one has linked ${meta.name}`} text="No student in this selection has connected this platform." />
      </Card>
    );
  }

  const rows = Object.keys(stats).filter((stat) => !SKIP_IN_STATS.includes(stat));
  const difficulty =
    platform.platform === 'leetcode'
      ? [
          { key: 'easy', label: 'Easy', value: stats.easy.total, color: 'var(--ds-series-green)' },
          { key: 'medium', label: 'Medium', value: stats.medium.total, color: 'var(--ds-series-amber)' },
          { key: 'hard', label: 'Hard', value: stats.hard.total, color: 'var(--ds-series-coral)' },
        ].filter((slice) => slice.value > 0)
      : [];

  return (
    <div className="ad-view">
      <StatGrid label={`${meta.name} summary`}>
        <StatTile tone="spotlight" label="Linked" value={platform.linked} context={`${platform.linkedRate}% of the selected students`} />
        <StatTile label="Average score" value={formatNumber(stats.score.avg)} context={`Highest ${formatNumber(stats.score.max)}`} />
        <StatTile label="Score change" value={signed(platform.gains.score)} context={`${formatNumber(platform.active)} students made progress`} />
        <StatTile label="Sync errors" value={platform.syncFailing} context={platform.syncFailing ? 'Their numbers may be out of date' : 'All profiles synced'} />
      </StatGrid>

      <div className="ad-grid">
        <Card title={`${meta.name} statistics`} description="Totals and averages over the linked students." className="ad-card">
          <div className="ui-table-wrap ad-wrap">
            <table className="ui-band-table ad-table ad-table--narrow">
              <caption className="ui-sr">{meta.name} statistics</caption>
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col" className="ui-num">Total</th>
                  <th scope="col" className="ui-num">Average</th>
                  <th scope="col" className="ui-num">Highest</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((stat) => (
                  <tr key={stat}>
                    <td>{STAT_LABELS[stat] || stat}</td>
                    <td className="ui-num">{formatNumber(stats[stat].total)}</td>
                    <td className="ui-num">{formatNumber(stats[stat].avg)}</td>
                    <td className="ui-num">{formatNumber(stats[stat].max)}</td>
                  </tr>
                ))}
                {platform.gains.problems !== null ? (
                  <tr>
                    <td>Problems change (period)</td>
                    <td className="ui-num">{signed(platform.gains.problems)}</td>
                    <td className="ui-num">{dash}</td>
                    <td className="ui-num">{dash}</td>
                  </tr>
                ) : null}
                {platform.gains.contests !== null ? (
                  <tr>
                    <td>Contests change (period)</td>
                    <td className="ui-num">{signed(platform.gains.contests)}</td>
                    <td className="ui-num">{dash}</td>
                    <td className="ui-num">{dash}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {platform.platform === 'github' ? (
            <Notice tone="info">Commits are today's totals as read from GitHub. They are not stored over time, so there is no commit change per period. GitHub's score change is shown above.</Notice>
          ) : null}
        </Card>

        <Card title={`Top students on ${meta.name}`} description="By score." className="ad-card">
          <People people={platform.top} label={`Top students on ${meta.name}`} empty="Nobody has a score yet" />
        </Card>

        {rating ? (
          <Card title={`${meta.name} ratings`} description={`${formatNumber(rating.rated)} of ${formatNumber(platform.linked)} linked students are rated.`} className="ad-card">
            <dl className="ad-facts">
              <div>
                <dt>Average</dt>
                <dd>{formatNumber(rating.avg)}</dd>
              </div>
              <div>
                <dt>Median</dt>
                <dd>{formatNumber(rating.median)}</dd>
              </div>
              <div>
                <dt>Highest</dt>
                <dd>{formatNumber(rating.max)}</dd>
                <dd className="ad-facts__note">Peak {formatNumber(rating.peakMax)}</dd>
              </div>
              <div>
                <dt>Average change</dt>
                <dd>{signed(rating.avgChange)}</dd>
                <dd className="ad-facts__note">
                  {rating.improved} up · {rating.declined} down
                </dd>
              </div>
            </dl>
            <BarChart
              data={rating.bands}
              getKey={(band) => band.label}
              getLabel={(band) => band.label}
              getValue={(band) => band.count}
              getTooltip={(band) => `${band.label}: ${formatNumber(band.count)} students`}
              colors={{ bar: meta.color, barHighlight: meta.color }}
              height={200}
              gap={6}
              minColumnWidth={44}
              highlight="none"
              title={`${meta.name} ratings`}
              summary={rating.rated ? `${formatNumber(rating.rated)} rated students in ${rating.bands.length} bands.` : 'Nobody is rated yet.'}
              emptyMessage="Nobody is rated yet"
            />
          </Card>
        ) : null}

        {rating ? (
          <Card title={`Highest rated on ${meta.name}`} className="ad-card">
            <People people={rating.top} label={`Highest rated on ${meta.name}`} empty="Nobody is rated yet" />
          </Card>
        ) : null}

        {difficulty.length > 0 ? (
          <Card title="Problems by difficulty" description="All selected students together." className="ad-card ad-card--wide">
            <PieChart
              data={difficulty}
              getColor={(slice) => slice.color}
              size={200}
              legend="right"
              totalLabel="Problems"
              title="Problems by difficulty"
              summary={difficulty.map((slice) => `${slice.label}: ${formatNumber(slice.value)}`).join(', ')}
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Platforms: a comparison of the six platforms, then the one chosen in detail, from the overview of
 * /api/admin/analytics. The filters are the same as on Performance and Students.
 */
export default function PlatformsView({ analytics }) {
  const { options, overview, filters, filtering, changeFilters, resetFilters } = analytics;
  const [selected, setSelected] = useState(PLATFORMS[0].key);
  const answer = overview.data;
  const platform = answer ? answer.platforms.find((entry) => entry.platform === selected) || answer.platforms[0] : null;

  return (
    <div className="ad-view">
      <AnalyticsFilters options={options.data} value={filters} onChange={changeFilters} onReset={resetFilters} filtering={filtering} />

      {!answer && overview.loading ? <ViewSkeleton label="Loading the platforms" tiles={4} cards={2} /> : null}
      {!answer && !overview.loading ? <LoadError title="We could not load the platforms" message={overview.error} onRetry={overview.reload} /> : null}

      {answer ? (
        <div className="ad-view" data-busy={overview.loading ? 'true' : 'false'} aria-busy={overview.loading}>
          {overview.error ? <LoadError title="We could not refresh the platforms" message={`${overview.error} You are looking at the last numbers that loaded.`} onRetry={overview.reload} /> : null}
          <ComparisonTable platforms={answer.platforms} selected={platform.platform} onSelect={setSelected} />
          <PillTabs
            role="radiogroup"
            label="Platform"
            items={PLATFORMS.map((entry) => ({ key: entry.key, label: entry.name }))}
            value={platform.platform}
            onChange={setSelected}
          />
          <PlatformDetail platform={platform} />
        </div>
      ) : null}
    </div>
  );
}
