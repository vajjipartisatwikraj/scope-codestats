import React, { useMemo } from 'react';
import { TrendChart } from '../custom-components';
import { Card, EmptyState } from '../ui';
import { formatBytes, formatDayKey, formatDayKeyShort } from './monitoringModel';

const SERIES = ['blue', 'teal', 'amber', 'violet', 'coral', 'green'];
const color = (index) => `var(--ds-series-${SERIES[index % SERIES.length]})`;
const dayMs = (key) => Date.parse(`${key}T12:00:00+05:30`);

const NEEDS_HISTORY = (
  <EmptyState
    compact
    title="The history is still building"
    text="The database is measured every hour and the last reading of each day is kept. This chart appears after two days of readings."
  />
);

/** One chart card, or the note that there are not yet two days of readings. */
function HistoryCard({ title, description, ready, className, children }) {
  return (
    <Card title={title} description={description} className={className ? `mon-chart ${className}` : 'mon-chart'}>
      {ready ? children : NEEDS_HISTORY}
    </Card>
  );
}

const lastOf = (list) => (list.length ? list[list.length - 1] : null);

/** The size of the database over time: what the data and the indexes take on disk. */
export function SizeChart({ history }) {
  const points = history.total;
  const last = lastOf(points);
  return (
    <HistoryCard title="Size on disk over time" description="Data and indexes, as the last reading of each day." ready={points.length >= 2} className="mon-chart--wide">
      <TrendChart
        data={points}
        getX={(point) => dayMs(point.day)}
        getLabel={(point) => formatDayKey(point.day)}
        formatX={(point) => formatDayKeyShort(point.day)}
        formatY={formatBytes}
        yDomain={[0, null]}
        height={240}
        title="Size of the database on disk over time"
        summary={last ? `On ${formatDayKey(last.day)} the data took ${formatBytes(last.storageSize)} and the indexes ${formatBytes(last.indexSize)}.` : ''}
        series={[
          { key: 'data', label: 'Data on disk', type: 'area', getValue: (point) => point.storageSize, color: color(0), dots: 'last', format: formatBytes },
          { key: 'indexes', label: 'Indexes', type: 'line', getValue: (point) => point.indexSize, color: color(1), dots: 'last', dashed: true, format: formatBytes },
        ]}
      />
    </HistoryCard>
  );
}

/** The number of records over time. */
export function RecordsChart({ history }) {
  const points = history.total;
  const last = lastOf(points);
  return (
    <HistoryCard title="Records over time" description="Documents in all collections." ready={points.length >= 2}>
      <TrendChart
        data={points}
        getX={(point) => dayMs(point.day)}
        getLabel={(point) => formatDayKey(point.day)}
        formatX={(point) => formatDayKeyShort(point.day)}
        yDomain={[0, null]}
        height={220}
        title="Records in the database over time"
        summary={last ? `On ${formatDayKey(last.day)} there were ${last.records.toLocaleString('en-IN')} records.` : ''}
        series={[{ key: 'records', label: 'Records', getValue: (point) => point.records, color: color(3), dots: 'last' }]}
      />
    </HistoryCard>
  );
}

/** The biggest collections over time, one line each. */
export function CollectionsChart({ history, modelOf }) {
  const names = useMemo(() => Object.keys(history.collections), [history]);
  const days = useMemo(() => {
    const set = new Set();
    names.forEach((name) => history.collections[name].forEach((point) => set.add(point.day)));
    return [...set].sort();
  }, [history, names]);

  const byName = useMemo(
    () =>
      Object.fromEntries(
        names.map((name) => [name, new Map(history.collections[name].map((point) => [point.day, point.size]))])
      ),
    [history, names]
  );

  return (
    <HistoryCard title="Biggest collections over time" description="Size on disk with indexes, for the five biggest now." ready={days.length >= 2}>
      <TrendChart
        data={days}
        getX={dayMs}
        getLabel={formatDayKey}
        formatX={formatDayKeyShort}
        formatY={formatBytes}
        yDomain={[0, null]}
        height={220}
        title="Size of the biggest collections over time"
        summary={`The five biggest collections: ${names.join(', ')}.`}
        series={names.map((name, index) => ({
          key: name,
          label: modelOf(name) || name,
          getValue: (day) => byName[name].get(day) ?? null,
          color: color(index),
          dots: 'last',
          dashed: index % 2 === 1,
          format: formatBytes,
        }))}
      />
    </HistoryCard>
  );
}
