import React, { useState } from 'react';
import { PulseIcon } from '@phosphor-icons/react/dist/csr/Pulse';
import { Button, Card, EmptyState, Notice, Skeleton, StatGrid, StatTile, formatDate, formatNumber } from '../ui';
import { LatencySpreadCard, RequestsChart, ResponseTimeChart, ResponseTypesCard, StatusCodesCard, StatusMixCard } from './ApiCharts';
import ErrorContext from './ErrorContext';
import MonitorBar from './MonitorBar';
import ProblemsCard from './ProblemsCard';
import RoutesCard from './RoutesCard';
import useRemoteData from './useRemoteData';
import { monitoringApi } from '../../services/monitoringApi';
import { API_RANGES, formatBytes, formatClock, formatMs, formatPercent } from './monitoringModel';

const POLL_MS = 60 * 1000; // the server writes its counters once a minute

/** "about 12 per minute", "about 3 per hour", "about 40 per day" */
function ratePhrase(count, spanMs) {
  if (!count || !spanMs) return 'No requests yet';
  const perMinute = count / (spanMs / 60000);
  if (perMinute >= 1) return `About ${formatNumber(Math.round(perMinute))} per minute`;
  const perHour = perMinute * 60;
  if (perHour >= 1) return `About ${formatNumber(Math.round(perHour))} per hour`;
  return `About ${formatNumber(Math.round(perHour * 24))} per day`;
}

function Loading() {
  return (
    <div role="status" aria-label="Loading the API traffic" className="mon-loading">
      <div className="ui-stats" data-cols="4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} height={108} radius="var(--ds-radius-xl)" />
        ))}
      </div>
      <Skeleton height={300} radius="var(--ds-radius-xl)" />
    </div>
  );
}

/**
 * The API tab: how many requests the server answered in a range, how they ended, how long they
 * took, which routes were called, and the individual errors and slow requests.
 *
 * Numbers come from counters the server keeps (services/monitoring), written once a minute, so the
 * newest minute can be missing. The page asks again every minute while it is open.
 */
export default function ApiTraffic() {
  const [range, setRange] = useState('24h');
  const { data, loading, error, updatedAt, reload } = useRemoteData(
    (signal) => monitoringApi.api(range, { signal }),
    range,
    { pollMs: POLL_MS }
  );

  const bar = (
    <MonitorBar
      ranges={API_RANGES}
      range={range}
      onRange={setRange}
      onReload={reload}
      loading={loading}
      label="Time range of the API traffic"
      caption={
        updatedAt ? (
          <>
            Updated {formatClock(updatedAt)}
            <span className="mon-bar__hint">{' \u00b7 the newest minute can be missing'}</span>
          </>
        ) : null
      }
    />
  );

  if (!data) {
    return (
      <div className="mon-tab">
        {bar}
        {error ? (
          <Notice
            tone="danger"
            title="We could not load the API traffic"
            action={
              <Button variant="ghost" onClick={reload}>
                Retry
              </Button>
            }
          >
            {error}
          </Notice>
        ) : (
          <Loading />
        )}
      </div>
    );
  }

  const { totals } = data;
  const spanMs = data.from ? new Date(data.to).getTime() - new Date(data.from).getTime() : 0;

  return (
    <div className="mon-tab">
      {bar}

      {error ? (
        <Notice tone="warning" title="The numbers could not be refreshed">
          {error} Showing the last data that loaded.
        </Notice>
      ) : null}
      {!data.enabled ? (
        <Notice tone="warning" title="Recording is switched off">
          New requests are not counted (MONITORING_ENABLED=false on the server). The figures below are what was counted before.
        </Notice>
      ) : null}

      {totals.count === 0 ? (
        <Card>
          <EmptyState
            icon={<PulseIcon size={28} aria-hidden="true" />}
            title="No requests in this range"
            text={
              data.dataSince
                ? `Counting started on ${formatDate(data.dataSince)}. Try a longer range.`
                : 'Requests appear here about a minute after the server answers them.'
            }
          />
        </Card>
      ) : (
        <>
          <StatGrid label="Summary of the API traffic">
            <StatTile tone="spotlight" label="Requests" value={totals.count} context={ratePhrase(totals.count, spanMs)} />
            <StatTile
              label="Success rate"
              value={formatPercent(totals.success, totals.count)}
              context={`${formatNumber(totals.success)} of ${formatNumber(totals.count)} requests`}
            />
            <StatTile label="Server errors (5xx)" value={totals.serverErrors} context={<ErrorContext count={totals.serverErrors} total={totals.count} tone="danger" />} />
            <StatTile label="Client errors (4xx)" value={totals.clientErrors} context={<ErrorContext count={totals.clientErrors} total={totals.count} tone="warning" />} />
            <StatTile label="Median response" value={formatMs(totals.p50)} context="Half of requests are faster" />
            <StatTile label="Slowest 5% start at" value={formatMs(totals.p95)} context="19 in 20 requests are faster" />
            <StatTile label="Slowest 1% start at" value={formatMs(totals.p99)} context={`Slowest request ${formatMs(totals.maxMs)}`} />
            <StatTile label="Data sent" value={formatBytes(totals.bytes)} context={`${formatBytes(totals.bytes / totals.count)} per request`} />
          </StatGrid>

          <div className="mon-charts">
            <RequestsChart overview={data} />
            <ResponseTimeChart overview={data} />
            <LatencySpreadCard overview={data} />
            <StatusMixCard overview={data} />
            <StatusCodesCard overview={data} />
            <ResponseTypesCard overview={data} />
          </div>

          <RoutesCard routes={data.routes} />
        </>
      )}

      <ProblemsCard />

      <p className="mon-note">
        {data.dataSince ? `Counting since ${formatDate(data.dataSince)}. ` : ''}
        Counters are written every {data.flushSeconds} seconds. Expired sign-ins and calls to routes that do not exist are counted but not listed one by one.
      </p>
    </div>
  );
}
