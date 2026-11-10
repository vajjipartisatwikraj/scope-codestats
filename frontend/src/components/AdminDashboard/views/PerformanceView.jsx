import React from 'react';
import { TrendChart } from '../../custom-components';
import { Card, Notice, StatGrid, StatTile, formatNumber, pluralize } from '../../ui';
import { loadedAt, longDate, shortDate, signed } from '../model/format';
import { platformMeta } from '../model/platforms';
import AnalyticsFilters from '../parts/AnalyticsFilters';
import { LoadError, ViewSkeleton } from '../parts/States';
import ComparisonCard from './ComparisonCard';
import InsightsCards from './InsightsCards';

/** The platforms that have a change in the points: the others would only be flat lines at 0 */
const platformsWithChange = (trend, field) => {
  const keys = Object.keys(trend[0]?.[field] || {});
  return keys.filter((key) => trend.some((point) => point[field][key] !== 0));
};

/** One line per platform, in the colour of the platform, for a chart of changes by platform */
const platformSeries = (field, keys) =>
  keys.map((key) => {
    const meta = platformMeta(key);
    return { key, label: meta.name, type: 'line', getValue: (point) => point[field][key], color: meta.color, dots: 'none', format: signed };
  });

/** How much the selected students gained since the start of the period, by platform */
function TrendCard({ title, description, trend, field, emptyMessage, className }) {
  const keys = platformsWithChange(trend, field);
  return (
    <Card title={title} description={description} className={className ? `ad-card ${className}` : 'ad-card'}>
      <TrendChart
        data={trend}
        getLabel={(point) => longDate(point.date)}
        formatX={(point) => shortDate(point.date)}
        formatY={formatNumber}
        height={220}
        title={title}
        summary={keys.length ? `${keys.map((key) => `${platformMeta(key).name} ${signed(trend[trend.length - 1][field][key])}`).join(', ')} by the end of the period.` : emptyMessage}
        series={platformSeries(field, keys)}
        emptyMessage={emptyMessage}
      />
    </Card>
  );
}

/**
 * Performance: how the selected students are doing over every platform and what changed in the
 * period, from /api/admin/analytics/overview. The filters are the same on the Platforms and Students
 * screens. Top to bottom: the figures (total score as the one inverted tile, then the totals and
 * the changes), the trend of the period, the groups side by side, and the spread of the students
 * with the leaders. A change is a signed figure from the start of the period; "–" means nothing was
 * recorded to measure it from.
 */
export default function PerformanceView({ analytics }) {
  const { options, overview, filters, filtering, changeFilters, resetFilters, groupBy, setGroupBy, selectedGroup } = analytics;
  const answer = overview.data;
  const period = answer ? `last ${answer.range.days} days` : '';
  const history = answer ? answer.tracking?.platformHistory || answer.tracking?.scoreHistory : null;

  return (
    <div className="ad-view">
      <AnalyticsFilters options={options.data} value={filters} onChange={changeFilters} onReset={resetFilters} filtering={filtering} />
      {options.error ? <Notice tone="warning">The filter lists could not be loaded: {options.error}</Notice> : null}

      {!answer && overview.loading ? <ViewSkeleton label="Loading the analytics. The first load can take a few seconds." tiles={4} cards={2} /> : null}
      {!answer && !overview.loading ? <LoadError title="We could not load the analytics" message={overview.error} onRetry={overview.reload} /> : null}

      {answer ? (
        <div className="ad-view" data-busy={overview.loading ? 'true' : 'false'} aria-busy={overview.loading}>
          {overview.error ? <LoadError title="We could not refresh the analytics" message={`${overview.error} You are looking at the last numbers that loaded.`} onRetry={overview.reload} /> : null}

          <p className="ad-note">
            {pluralize(answer.summary.students, 'student')} selected · changes over {longDate(answer.range.start)} to {longDate(answer.range.end)} (IST) · data loaded {loadedAt(answer.generatedAt)}
          </p>

          <StatGrid label="Summary of the selected students">
            <StatTile
              tone="spotlight"
              label="Total score"
              value={answer.summary.totalScore}
              context={`Average ${formatNumber(answer.summary.avgScore)} \u00b7 median ${formatNumber(answer.summary.medianScore)}`}
            />
            <StatTile label="Students" value={answer.summary.students} context={`${formatNumber(answer.summary.withLinkedPlatform)} linked a platform \u00b7 ${answer.summary.avgPlatformsLinked} on average`} />
            <StatTile label="Problems solved" value={answer.summary.totalProblems} context={`Average ${formatNumber(answer.summary.avgProblems)} per student`} />
            <StatTile label="Contests attended" value={answer.summary.totalContests} context={`Average ${formatNumber(answer.summary.avgContests)} per student`} />
            <StatTile label="Score change" value={signed(answer.summary.scoreGain)} context={period} />
            <StatTile label="Problems change" value={signed(answer.summary.problemsGain)} context={`${period}, on four platforms`} />
            <StatTile label="Contests change" value={signed(answer.summary.contestsGain)} context={`${period}, on three platforms`} />
            <StatTile
              label="Active students"
              value={`${answer.summary.activeRate}%`}
              context={`${formatNumber(answer.summary.activeStudents)} made progress in the ${period}`}
            />
          </StatGrid>

          {history && history > answer.range.start ? (
            <Notice tone="info">
              History is recorded from {longDate(history)}. Changes before that date are not available, so a long period can show less than students really did.
            </Notice>
          ) : null}

          <div className="ad-grid">
            <Card title="Score gained" description={`In total, since ${longDate(answer.range.start)}.`} className="ad-card ad-card--wide">
              <TrendChart
                data={answer.trend}
                getLabel={(point) => longDate(point.date)}
                formatX={(point) => shortDate(point.date)}
                formatY={formatNumber}
                height={240}
                title="Score gained"
                summary={`${signed(answer.summary.scoreGain)} points gained by the selected students in the ${period}.`}
                series={[{ key: 'score', label: 'Score gained', type: 'area', getValue: (point) => point.score, color: 'var(--ds-series-blue)', dots: 'last', format: signed }]}
                emptyMessage="No score changed in this period"
              />
            </Card>
            <TrendCard title="Score gained by platform" description="Only platforms where scores changed." trend={answer.trend} field="scoreByPlatform" emptyMessage="No score changed in this period" />
            <TrendCard title="Problems solved" description="Gained on LeetCode, Codeforces, CodeChef and HackerRank." trend={answer.trend} field="problemsByPlatform" emptyMessage="No problems were solved in this period" />
            <TrendCard title="Contests attended" description="Gained on LeetCode, Codeforces and CodeChef." trend={answer.trend} field="contestsByPlatform" emptyMessage="No contests were attended in this period" className="ad-card--wide" />
          </div>

          <ComparisonCard comparison={answer.comparison} onGroupByChange={setGroupBy} groupBy={groupBy} selected={selectedGroup} />
          <InsightsCards distributions={answer.distributions} leaders={answer.leaders} />
        </div>
      ) : null}
    </div>
  );
}
