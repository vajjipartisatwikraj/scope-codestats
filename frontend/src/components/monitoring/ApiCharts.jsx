import React from 'react';
import { BarChart, PieChart, ProgressBar, TrendChart } from '../custom-components';
import { Badge, Card, EmptyState, formatNumber } from '../ui';
import { KIND_LABEL, STATUS_GROUPS, formatBytes, formatMs, formatPercent, statusInfo, timeLabels } from './monitoringModel';

const UNIT_MS = { ms: 1, s: 1000 };
const trimNumber = (value) => String(Math.round(value * 100) / 100);

/**
 * A short bar label from the server's: "under 25 ms" -> "<25", "25 ms to 50 ms" -> "25\u201350",
 * "500 ms to 1 s" -> "0.5\u20131 s", "10 s or more" -> "10 s+". Milliseconds carry no unit; the card
 * says so, and anything in seconds does.
 */
function shortLatencyLabel(label) {
  const range = label.match(/^([\d.]+) (ms|s) to ([\d.]+) (ms|s)$/);
  if (range) {
    const from = Number(range[1]) * UNIT_MS[range[2]];
    const to = Number(range[3]) * UNIT_MS[range[4]];
    return to >= 1000 ? `${trimNumber(from / 1000)}\u2013${trimNumber(to / 1000)} s` : `${trimNumber(from)}\u2013${trimNumber(to)}`;
  }
  const under = label.match(/^under ([\d.]+) ms$/);
  if (under) return `<${under[1]}`;
  return label.replace(/ or more$/, '+');
}
const windowMsOf = (overview) =>
  overview.from && overview.to ? new Date(overview.to).getTime() - new Date(overview.from).getTime() : null;

/** Requests over time: all of them, and the ones that failed. */
export function RequestsChart({ overview }) {
  const labels = timeLabels(overview.stepMs, windowMsOf(overview));
  const peak = overview.timeline.reduce((best, point) => (point.count > best.count ? point : best), { count: 0, t: 0 });
  const summary = peak.count
    ? `Most requests came at ${labels.full(peak.t)}: ${formatNumber(peak.count)}. In total ${formatNumber(overview.totals.count)} requests, ${formatNumber(overview.totals.clientErrors)} client errors and ${formatNumber(overview.totals.serverErrors)} server errors.`
    : 'No requests in this range.';

  return (
    <Card title="Requests over time" description="All requests, and the ones that ended in an error." className="mon-chart mon-chart--wide">
      <TrendChart
        data={overview.timeline}
        getX={(point) => point.t}
        getLabel={(point) => labels.full(point.t)}
        formatX={(point) => labels.axis(point.t)}
        yDomain={[0, null]}
        height={240}
        title="Requests over time"
        summary={summary}
        series={[
          { key: 'all', label: 'All requests', type: 'area', getValue: (point) => point.count, color: 'var(--ds-series-blue)', dots: 'none' },
          { key: 'client', label: 'Client errors (4xx)', type: 'line', getValue: (point) => point.clientErrors, color: 'var(--ds-series-amber)', dots: 'none', dashed: true },
          { key: 'server', label: 'Server errors (5xx)', type: 'line', getValue: (point) => point.serverErrors, color: 'var(--ds-series-coral)', dots: 'none' },
        ]}
      />
    </Card>
  );
}

/** The median and the slowest 5% of response times over time. */
export function ResponseTimeChart({ overview }) {
  const labels = timeLabels(overview.stepMs, windowMsOf(overview));
  const { totals } = overview;
  const summary = totals.count
    ? `Half of the requests took under ${formatMs(totals.p50)}; 19 in 20 took under ${formatMs(totals.p95)}.`
    : 'No requests in this range.';

  return (
    <Card title="Response time" description="How long requests took to answer." className="mon-chart">
      <TrendChart
        data={overview.timeline}
        getX={(point) => point.t}
        getLabel={(point) => labels.full(point.t)}
        formatX={(point) => labels.axis(point.t)}
        formatY={formatMs}
        yDomain={[0, null]}
        height={220}
        title="Response time over time"
        summary={summary}
        series={[
          { key: 'p50', label: 'Median', getValue: (point) => point.p50, color: 'var(--ds-series-green)', dots: 'none', format: formatMs },
          { key: 'p95', label: 'Slowest 5% (p95)', getValue: (point) => point.p95, color: 'var(--ds-series-violet)', dots: 'none', dashed: true, format: formatMs },
        ]}
      />
    </Card>
  );
}

/** How requests ended, as shares of the whole: successful, client errors, server errors. */
export function StatusMixCard({ overview }) {
  const { totals } = overview;
  const groups = STATUS_GROUPS.map((group) => ({
    ...group,
    value: group.key === 'success' ? totals.success : group.key === 'client' ? totals.clientErrors : totals.serverErrors,
  }));

  return (
    <Card title="How requests ended" description="Share of each kind of answer." className="mon-chart">
      <PieChart
        data={groups}
        getKey={(group) => group.key}
        getLabel={(group) => group.label}
        getValue={(group) => group.value}
        getColor={(group) => group.color}
        size={200}
        legend="right"
        title="How requests ended"
        summary={`${formatPercent(totals.success, totals.count)} successful, ${formatPercent(totals.clientErrors, totals.count)} client errors, ${formatPercent(totals.serverErrors, totals.count)} server errors.`}
        emptyMessage="No requests in this range"
        totalLabel="Requests"
      />
    </Card>
  );
}

/** Every exact status code the server answered with, and how often. */
export function StatusCodesCard({ overview }) {
  const { totals, statuses } = overview;
  return (
    <Card title="Status codes" description="The exact answers, most common first." className="mon-chart">
      {statuses.length === 0 ? (
        <EmptyState compact title="No requests yet" text="Status codes appear once requests are counted." />
      ) : (
        <ul className="mon-codes" aria-label="Status codes">
          {statuses.slice(0, 10).map(({ status, count }) => {
            const info = statusInfo(status);
            return (
              <li key={status} className="mon-codes__row">
                <Badge tone={info.tone}>{info.label}</Badge>
                <span className="mon-codes__count">{formatNumber(count)}</span>
                <span className="mon-codes__share">{formatPercent(count, totals.count)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
/** What the responses were: data, files, pages, images. */
export function ResponseTypesCard({ overview }) {
  const total = overview.totals.count;
  return (
    <Card title="Response types" description="What the server sent back." className="mon-chart mon-chart--wide">
      {overview.kinds.length === 0 ? (
        <EmptyState compact title="No requests yet" text="Response types appear once requests are counted." />
      ) : (
        <ul className="mon-kinds">
          {overview.kinds.map((kind) => (
            <li key={kind.kind}>
              <ProgressBar
                value={kind.count}
                max={total || 1}
                size="sm"
                label={KIND_LABEL[kind.kind] || kind.kind}
                valueLabel={`${formatNumber(kind.count)} \u00b7 ${formatBytes(kind.bytes)}`}
                tone="accent"
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** How many requests fell in each response time bucket. */
export function LatencySpreadCard({ overview }) {
  const total = overview.totals.count;
  // Only the time ranges that had requests: an empty bar says nothing
  const buckets = overview.latencyBuckets.filter((bucket) => bucket.count > 0);
  return (
    <Card title="Spread of response times" description="Requests by how long they took, in milliseconds unless marked s." className="mon-chart">
      <BarChart
        data={buckets}
        getKey={(bucket) => bucket.label}
        getLabel={(bucket) => shortLatencyLabel(bucket.label)}
        getValue={(bucket) => bucket.count}
        getTooltip={(bucket) => `${bucket.label}: ${formatNumber(bucket.count)} requests (${formatPercent(bucket.count, total)})`}
        height={200}
        gap={4}
        minColumnWidth={48}
        highlight="max"
        title="Spread of response times"
        summary={`Most requests finished in ${
          buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best), { count: 0, label: 'no time' }).label
        }.`}
        emptyMessage="No requests in this range"
      />
    </Card>
  );
}
