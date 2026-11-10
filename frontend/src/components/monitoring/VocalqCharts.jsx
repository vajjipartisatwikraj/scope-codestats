import React from 'react';
import { PieChart, TrendChart } from '../custom-components';
import { Card } from '../ui';
import { INTERVAL_MS, formatDuration, formatPercent, timeLabels } from './monitoringModel';

/** How the x axis of this overview's charts is written, from the interval and window the judge used. */
function labelsOf(overview) {
  const { interval, window } = overview.timeseries;
  const windowMs = window ? Date.parse(window.to) - Date.parse(window.from) : null;
  return timeLabels(INTERVAL_MS[interval] || INTERVAL_MS.hour, windowMs);
}

/** The props every chart of this tab shares: points placed in time, labelled like the other tabs. */
function timeProps(overview) {
  const labels = labelsOf(overview);
  return {
    data: overview.timeseries.points,
    getX: (point) => Date.parse(point.bucket),
    getLabel: (point) => labels.full(Date.parse(point.bucket)),
    formatX: (point) => labels.axis(Date.parse(point.bucket)),
    yDomain: [0, null],
  };
}

const sum = (points, read) => points.reduce((total, point) => total + (read(point) || 0), 0);

/** Evaluations over time: every scored recording, and the attempts that failed. */
export function EvaluationsChart({ overview }) {
  const { points } = overview.timeseries;
  const total = sum(points, (p) => p.evaluations);
  return (
    <Card title="Evaluations over time" description="Recordings the judge scored, and the attempts that failed." className="mon-chart mon-chart--wide">
      <TrendChart
        {...timeProps(overview)}
        height={240}
        title="Evaluations over time"
        summary={`${total.toLocaleString('en-IN')} evaluations in this range, ${sum(points, (p) => p.failed_attempts).toLocaleString('en-IN')} failed attempts.`}
        series={[
          { key: 'runs', label: 'Evaluations', type: 'area', getValue: (p) => p.evaluations, color: 'var(--ds-series-blue)', dots: 'none' },
          { key: 'failed', label: 'Failed attempts', type: 'line', getValue: (p) => p.failed_attempts, color: 'var(--ds-series-coral)', dots: 'none', dashed: true },
        ]}
      />
    </Card>
  );
}

/** Calls to the judge's API over time. */
export function JudgeCallsChart({ overview }) {
  const { points } = overview.timeseries;
  return (
    <Card title="API calls over time" description="Calls to the speech judge's API." className="mon-chart">
      <TrendChart
        {...timeProps(overview)}
        height={220}
        title="Speech judge API calls over time"
        summary={`${sum(points, (p) => p.api_requests).toLocaleString('en-IN')} calls, ${sum(points, (p) => p.api_errors).toLocaleString('en-IN')} of them errors.`}
        series={[
          { key: 'calls', label: 'API calls', type: 'area', getValue: (p) => p.api_requests, color: 'var(--ds-series-blue)', dots: 'none' },
          { key: 'errors', label: 'Errors (4xx, 5xx)', type: 'line', getValue: (p) => p.api_errors, color: 'var(--ds-series-amber)', dots: 'none', dashed: true },
          { key: 'server', label: 'Server errors (5xx)', type: 'line', getValue: (p) => p.api_server_errors, color: 'var(--ds-series-coral)', dots: 'none' },
        ]}
      />
    </Card>
  );
}

const CLASSES = [
  { key: '2xx', label: 'Successful', color: 'var(--ds-series-teal)' },
  { key: '3xx', label: 'Redirects', color: 'var(--ds-series-sky)' },
  { key: '4xx', label: 'Client errors (4xx)', color: 'var(--ds-series-amber)' },
  { key: '5xx', label: 'Server errors (5xx)', color: 'var(--ds-series-coral)' },
];

/** How the judge's API calls ended, as shares of the whole (the rounded pie chart). */
export function JudgeOutcomeCard({ overview }) {
  const { api } = overview.summary;
  const slices = CLASSES.map((group) => ({ ...group, value: api.by_status_class[group.key] || 0 }));
  return (
    <Card title="How API calls ended" description="Share of each kind of answer." className="mon-chart">
      <PieChart
        data={slices}
        getKey={(slice) => slice.key}
        getLabel={(slice) => slice.label}
        getValue={(slice) => slice.value}
        getColor={(slice) => slice.color}
        size={200}
        legend="right"
        title="How speech judge API calls ended"
        summary={`${formatPercent(slices[0].value, api.requests)} successful, ${formatPercent(api.errors, api.requests)} errors.`}
        emptyMessage="No API calls in this range"
        totalLabel="Calls"
      />
    </Card>
  );
}

/** Minutes of audio the judge turned into text. */
export function AudioChart({ overview }) {
  const { points } = overview.timeseries;
  const seconds = sum(points, (p) => p.whisper_audio_seconds);
  return (
    <Card title="Audio transcribed" description="Minutes of recordings turned into text." className="mon-chart">
      <TrendChart
        {...timeProps(overview)}
        formatY={(value) => `${Math.round(value * 10) / 10} min`}
        height={220}
        title="Audio transcribed over time"
        summary={`${formatDuration(seconds)} of audio in this range.`}
        series={[
          {
            key: 'audio',
            label: 'Audio',
            type: 'bars',
            getValue: (p) => p.whisper_audio_seconds / 60,
            color: 'var(--ds-series-violet)',
            format: (value) => formatDuration(value * 60),
          },
        ]}
      />
    </Card>
  );
}

/** Tokens the AI feedback step used. */
export function TokensChart({ overview }) {
  const { points } = overview.timeseries;
  return (
    <Card title="AI feedback tokens" description="Tokens the language model used to write feedback." className="mon-chart">
      <TrendChart
        {...timeProps(overview)}
        height={220}
        title="AI feedback tokens over time"
        summary={`${sum(points, (p) => p.gemini_tokens).toLocaleString('en-IN')} tokens in ${sum(points, (p) => p.gemini_calls).toLocaleString('en-IN')} calls.`}
        series={[
          { key: 'tokens', label: 'Tokens', type: 'bars', getValue: (p) => p.gemini_tokens, color: 'var(--ds-series-green)' },
        ]}
      />
    </Card>
  );
}
