import React from 'react';
import { BarChart, PieChart, TrendChart } from '../../custom-components';
import useMediaQuery from '../../../hooks/useMediaQuery';
import { Card, EmptyState, StatGrid, StatTile, formatNumber, pluralize } from '../../ui';
import { monthLabel, percentOf, seriesColor } from '../model/format';
import { platformMeta } from '../model/platforms';
import { LoadError, ViewSkeleton } from '../parts/States';

/**
 * Overview: who is on the platform and how they are doing, from /api/admin/stats. The first row is
 * the figures the admin came for (the total users as the one inverted tile), then the departments as
 * shares of the students and as average scores, the platforms as shares of the problems solved and
 * as students linked, the registrations of each month, and the top five students. Every chart has
 * its text equivalent. Students who have graduated are left out by the server.
 */
export default function OverviewView({ remote }) {
  const { data: stats, loading, error, reload } = remote;
  const narrow = useMediaQuery('(max-width: 599.95px)');

  if (!stats && loading) return <ViewSkeleton label="Loading the overview" />;
  if (!stats) return <LoadError title="We could not load the overview" message={error} onRetry={reload} />;

  const users = stats.userStats || {};
  const departments = stats.departmentStats || [];
  const platformStats = stats.problemsStats?.platformStats || [];
  const engagement = stats.platformEngagement || [];
  const growth = (users.userGrowthData || []).slice(-12);
  const top = users.topUsers || [];

  const totalProblems = stats.problemsStats?.totalProblems ?? platformStats.reduce((sum, platform) => sum + (platform.totalProblems || 0), 0);
  const legend = narrow ? 'bottom' : 'right';

  return (
    <div className="ad-view">
      {error ? <LoadError title="We could not refresh the overview" message={`${error} You are looking at the last numbers that loaded.`} onRetry={reload} /> : null}

      <StatGrid label="Platform summary">
        <StatTile
          tone="spotlight"
          label="Total users"
          value={users.totalUsers || 0}
          context={`${formatNumber(users.regularUsers || 0)} students \u00b7 ${formatNumber(users.adminUsers || 0)} staff`}
        />
        <StatTile label="Active this week" value={users.activeUsers || 0} context={`${percentOf(users.activeUsers || 0, users.totalUsers || 0)}% of all users`} />
        <StatTile label="Problems solved" value={totalProblems || 0} context={`Across ${pluralize(platformStats.length, 'platform')}`} />
        <StatTile
          label="Top performer"
          size="m"
          value={top[0]?.name || '\u2013'}
          context={top[0] ? `Score ${formatNumber(top[0].totalScore)}${top[0].department ? ` \u00b7 ${top[0].department}` : ''}` : 'No scores yet'}
        />
      </StatGrid>

      <div className="ad-grid">
        <Card title="Students by department" description="How many students each department has." className="ad-card">
          <PieChart
            data={departments}
            getKey={(item) => item.department}
            getLabel={(item) => item.department}
            getValue={(item) => item.userCount}
            getColor={(item, index) => seriesColor(index)}
            size={200}
            legend={legend}
            totalLabel="Students"
            title="Students by department"
            summary={departments.length ? departments.map((item) => `${item.department}: ${formatNumber(item.userCount)}`).join(', ') : 'No departments yet.'}
            emptyMessage="No departments yet"
          />
        </Card>

        <Card title="Average score by department" description="Total score per student, averaged over the department." className="ad-card">
          <BarChart
            data={departments}
            getKey={(item) => item.department}
            getLabel={(item) => item.department}
            getValue={(item) => item.avgScore}
            getTooltip={(item) => `${item.department}: average score ${formatNumber(item.avgScore)}`}
            height={240}
            gap={8}
            minColumnWidth={48}
            highlight="max"
            title="Average score by department"
            summary={departments.length ? departments.map((item) => `${item.department}: ${formatNumber(item.avgScore)}`).join(', ') : 'No departments yet.'}
            emptyMessage="No departments yet"
          />
        </Card>

        <Card title="Problems solved by platform" description="Share of all problems solved." className="ad-card">
          <PieChart
            data={platformStats}
            getKey={(item) => item.platform}
            getLabel={(item) => platformMeta(item.platform).name}
            getValue={(item) => item.totalProblems}
            getColor={(item) => platformMeta(item.platform).color}
            getDetail={(item) => `${formatNumber(item.avgProblems)} per linked student`}
            size={200}
            legend={legend}
            sort="desc"
            totalLabel="Problems"
            title="Problems solved by platform"
            summary={platformStats.length ? platformStats.map((item) => `${platformMeta(item.platform).name}: ${formatNumber(item.totalProblems)}`).join(', ') : 'No platform data yet.'}
            emptyMessage="No problems solved yet"
          />
        </Card>

        <Card title="Students linked per platform" description="How many students connected each platform." className="ad-card">
          <BarChart
            data={engagement}
            getKey={(item) => item.platform}
            getLabel={(item) => platformMeta(item.platform).name}
            getValue={(item) => item.userCount}
            getColor={(item) => platformMeta(item.platform).color}
            getTooltip={(item) => `${platformMeta(item.platform).name}: ${formatNumber(item.userCount)} students linked`}
            height={240}
            gap={8}
            minColumnWidth={64}
            highlight="none"
            title="Students linked per platform"
            summary={engagement.length ? engagement.map((item) => `${platformMeta(item.platform).name}: ${formatNumber(item.userCount)}`).join(', ') : 'No platform linked yet.'}
            emptyMessage="No platform linked yet"
          />
        </Card>

        <Card title="New users each month" description="Accounts created, last 12 months." className="ad-card ad-card--wide">
          <TrendChart
            data={growth}
            getLabel={(item) => monthLabel(item.month)}
            formatX={(item) => monthLabel(item.month).split(' ')[0]}
            yDomain={[0, null]}
            height={220}
            title="New users each month"
            summary={growth.length ? `${formatNumber(growth[growth.length - 1].count)} new users in ${monthLabel(growth[growth.length - 1].month)}.` : 'No registrations yet.'}
            series={[{ key: 'count', label: 'New users', type: 'bars', getValue: (item) => item.count, color: 'var(--ds-series-blue)' }]}
            emptyMessage="No registrations yet"
          />
        </Card>

        <Card title="Top scorers" description="The five students with the highest total score." className="ad-card ad-card--wide">
          {top.length === 0 ? (
            <EmptyState compact title="No scores yet" text="Students appear here once their platforms are synced." />
          ) : (
            <ol className="ad-people" aria-label="Top scorers">
              {top.map((person, index) => (
                <li key={person._id || person.name} className="ad-person">
                  <span className="ad-person__rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="ad-person__text">
                    <span className="ad-person__name">{person.name}</span>
                    {person.department ? <span className="ad-person__meta">{person.department}</span> : null}
                  </span>
                  <span className="ad-person__value">{formatNumber(person.totalScore)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
