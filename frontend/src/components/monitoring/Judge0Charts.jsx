import React, { useMemo } from 'react';
import { PieChart, TrendChart } from '../custom-components';
import { Card } from '../ui';
import { formatDayKey, formatDayKeyShort, formatPercent, judge0StatusColor } from './monitoringModel';

const SERIES = ['blue', 'teal', 'amber', 'violet', 'coral', 'green', 'sky'];
const MAX_SLICES = 7; // the languages after these are added together as "Other"

/**
 * Submissions per day: the last 30 full days Judge0 reports, then today so far. Judge0 counts
 * today separately and caches its statistics for 10 minutes, so the last bar can be a little behind.
 *
 *   statistics   Judge0's /statistics answer
 */
export function SubmissionsChart({ statistics }) {
  const days = useMemo(() => {
    const { last_30_days: perDay, today } = statistics.submissions;
    const points = Object.entries(perDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));
    points.push({ day: String(statistics.created_at).slice(0, 10), count: today });
    return points;
  }, [statistics]);

  const total = days.reduce((sum, point) => sum + point.count, 0);
  const busiest = days.reduce((best, point) => (point.count > best.count ? point : best), { count: 0, day: '' });

  return (
    <Card title="Submissions per day" description="Programs run on Judge0 in the last 30 days, and today so far." className="mon-chart mon-chart--wide">
      <TrendChart
        data={days}
        getLabel={(point) => formatDayKey(point.day)}
        formatX={(point) => formatDayKeyShort(point.day)}
        yDomain={[0, null]}
        height={240}
        title="Judge0 submissions per day"
        summary={
          total
            ? `${total.toLocaleString('en-IN')} submissions in this period; the busiest day was ${formatDayKey(busiest.day)} with ${busiest.count.toLocaleString('en-IN')}.`
            : 'No submissions in this period.'
        }
        series={[{ key: 'count', label: 'Submissions', type: 'bars', getValue: (point) => point.count, color: 'var(--ds-series-blue)' }]}
        emptyMessage="No submissions in the last 30 days"
      />
    </Card>
  );
}

/** How submissions ended: accepted, wrong answer, time limit, compile and runtime errors, Judge0's own errors. */
export function OutcomesCard({ statistics }) {
  const { statuses } = statistics;
  const total = statistics.submissions.total;
  const accepted = statuses.find((entry) => entry.status.id === 3)?.count || 0;

  return (
    <Card title="How submissions ended" description="Every submission Judge0 has run, by result." className="mon-chart">
      <PieChart
        data={statuses}
        getKey={(entry) => entry.status.id}
        getLabel={(entry) => entry.status.name}
        getValue={(entry) => entry.count}
        getColor={(entry) => judge0StatusColor(entry.status.id)}
        size={200}
        legend="right"
        sort="desc"
        title="How Judge0 submissions ended"
        summary={`${formatPercent(accepted, total)} accepted; ${statuses.map((entry) => `${entry.status.name} ${entry.count.toLocaleString('en-IN')}`).join(', ')}.`}
        emptyMessage="No submissions yet"
        totalLabel="Submissions"
      />
    </Card>
  );
}

/** Which languages students run, as shares of all submissions. */
export function LanguagesCard({ statistics }) {
  const slices = useMemo(() => {
    const sorted = [...statistics.languages].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, MAX_SLICES).map((entry, index) => ({
      key: entry.language.id,
      label: entry.language.name || `Language ${entry.language.id}`,
      value: entry.count,
      color: `var(--ds-series-${SERIES[index % SERIES.length]})`,
    }));
    const rest = sorted.slice(MAX_SLICES).reduce((sum, entry) => sum + entry.count, 0);
    return rest > 0 ? [...top, { key: 'other', label: 'Other languages', value: rest, color: 'var(--ds-series-slate)' }] : top;
  }, [statistics]);

  return (
    <Card title="Languages" description="Submissions by programming language." className="mon-chart">
      <PieChart
        data={slices}
        getKey={(slice) => slice.key}
        getLabel={(slice) => slice.label}
        getValue={(slice) => slice.value}
        getColor={(slice) => slice.color}
        size={200}
        legend="right"
        title="Judge0 submissions by language"
        summary={slices.map((slice) => `${slice.label} ${slice.value.toLocaleString('en-IN')}`).join(', ')}
        emptyMessage="No submissions yet"
        totalLabel="Submissions"
      />
    </Card>
  );
}
