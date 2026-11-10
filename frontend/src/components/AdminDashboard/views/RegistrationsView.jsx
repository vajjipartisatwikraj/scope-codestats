import React, { useState } from 'react';
import { BarChart, TrendChart } from '../../custom-components';
import { Card, PillTabs, StatGrid, StatTile, formatNumber } from '../../ui';
import { longDate, shortDate } from '../model/format';
import { LoadError, ViewSkeleton } from '../parts/States';

const VIEWS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'department', label: 'By department' },
];

const CHART = {
  daily: { title: 'Daily registrations', description: 'Students who joined, last 30 days.' },
  weekly: { title: 'Weekly registrations', description: 'Students who joined, last 12 weeks.' },
  monthly: { title: 'Monthly registrations', description: 'Students who joined, last 12 months.' },
  department: { title: 'Registrations by department', description: 'Students who have joined, by department.' },
};

/**
 * Registrations: how many students joined, per day, week or month, or in total by department, from
 * /api/admin/user-registration-stats. The first tile is the count for the chosen stretch (today,
 * this week or this month), as the one inverted tile; the totals follow. One chart changes with the
 * "View by" switch: an area over time, or bars by department.
 */
export default function RegistrationsView({ remote }) {
  const { data, loading, error, reload } = remote;
  const [view, setView] = useState('daily');

  if (!data && loading) return <ViewSkeleton label="Loading the registrations" tiles={3} cards={1} />;
  if (!data) return <LoadError title="We could not load the registrations" message={error} onRetry={reload} />;

  const summary = data.summary || {};
  const stretch = { daily: ['Registered today', summary.today], weekly: ['Registered this week', summary.thisWeek], monthly: ['Registered this month', summary.thisMonth] }[view];

  const points =
    view === 'daily'
      ? (data.dailyRegistrations || []).map((item) => ({ key: item._id, label: longDate(item._id), axis: shortDate(item._id), count: item.regularCount }))
      : view === 'weekly'
        ? (data.weeklyRegistrations || []).map((item) => ({ key: item.weekLabel, label: item.weekLabel, axis: item.weekLabel, count: item.regularCount }))
        : (data.monthlyRegistrations || []).map((item) => ({ key: item.monthLabel, label: item.monthLabel, axis: item.monthLabel, count: item.regularCount }));
  const departments = data.departmentRegistrations || [];
  const total = (view === 'department' ? departments.map((item) => item.regularCount) : points.map((item) => item.count)).reduce((sum, value) => sum + (value || 0), 0);

  return (
    <div className="ad-view">
      {error ? <LoadError title="We could not refresh the registrations" message={`${error} You are looking at the last numbers that loaded.`} onRetry={reload} /> : null}

      <StatGrid columns={3} label="Registration summary">
        {stretch ? (
          <StatTile tone="spotlight" label={stretch[0]} value={stretch[1] || 0} context="New student accounts" />
        ) : (
          <StatTile tone="spotlight" label="Departments" value={departments.length} context="With registered students" />
        )}
        <StatTile label="Total users" value={summary.totalUsers || 0} context="Students and staff" />
        <StatTile label="Students" value={summary.regularUsers || 0} context="Regular accounts" />
      </StatGrid>

      <Card
        title={CHART[view].title}
        description={CHART[view].description}
        actions={<PillTabs role="radiogroup" size="sm" label="View registrations by" items={VIEWS} value={view} onChange={setView} />}
        className="ad-card"
      >
        {view === 'department' ? (
          <BarChart
            data={departments}
            getKey={(item) => item.department}
            getLabel={(item) => item.department}
            getValue={(item) => item.regularCount}
            getTooltip={(item) => `${item.department}: ${formatNumber(item.regularCount)} students`}
            height={260}
            gap={8}
            minColumnWidth={48}
            highlight="max"
            title={CHART[view].title}
            summary={departments.length ? departments.map((item) => `${item.department}: ${formatNumber(item.regularCount)}`).join(', ') : 'No registrations yet.'}
            emptyMessage="No registrations yet"
          />
        ) : (
          <TrendChart
            data={points}
            getLabel={(item) => item.label}
            formatX={(item) => item.axis}
            yDomain={[0, null]}
            height={260}
            xTicks={6}
            title={CHART[view].title}
            summary={`${formatNumber(total)} students joined in this stretch.`}
            series={[{ key: 'count', label: 'Students', type: 'area', getValue: (item) => item.count, color: 'var(--ds-series-green)', dots: 'last' }]}
            emptyMessage="No registrations in this stretch"
          />
        )}
        <p className="ad-note">{formatNumber(total)} {total === 1 ? 'student' : 'students'} in this view.</p>
      </Card>
    </div>
  );
}
