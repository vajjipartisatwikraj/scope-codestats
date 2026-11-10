import React, { useRef } from 'react';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { Button, Card, EmptyState, Notice, Skeleton, StatGrid, StatTile, formatNumber, pluralize } from '../ui';
import ChecksRow from './ChecksRow';
import ErrorContext from './ErrorContext';
import { LanguagesCard, OutcomesCard, SubmissionsChart } from './Judge0Charts';
import { LimitsCard, ServerCard } from './Judge0Facts';
import Judge0Workers from './Judge0Workers';
import MonitorBar from './MonitorBar';
import useRemoteData from './useRemoteData';
import { monitoringApi } from '../../services/monitoringApi';
import { formatBytes, formatClock, formatMs, formatPercent, humanSize } from './monitoringModel';

const POLL_MS = 30 * 1000; // workers and queues change quickly; Judge0 counts its statistics every 10 minutes

const sum = (list, read) => list.reduce((total, item) => total + (read(item) || 0), 0);

function Loading() {
  return (
    <div role="status" aria-label="Loading Judge0" className="mon-loading">
      <div className="ui-stats" data-cols="4">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} height={84} radius="var(--ds-radius-xl)" />
        ))}
      </div>
      <Skeleton height={300} radius="var(--ds-radius-xl)" />
    </div>
  );
}

/** The health checks of Judge0 in one row: the API, workers, the queue, failed jobs, maintenance mode. */
function checksOf(data) {
  const workers = data.workers;
  const available = workers ? sum(workers, (queue) => queue.available) : null;
  const waiting = workers ? sum(workers, (queue) => queue.size) : null;
  const failedJobs = workers ? sum(workers, (queue) => queue.failed) : null;
  const maxQueue = data.limits?.max_queue_size;
  const items = [
    { key: 'api', label: 'API', state: 'ok', text: data.pingMs === null ? 'Reachable' : `Reachable \u00b7 ${formatMs(data.pingMs)}` },
  ];

  if (workers) {
    items.push({
      key: 'workers',
      label: 'Workers',
      state: available > 0 ? 'ok' : 'bad',
      text: available > 0 ? `${formatNumber(available)} available` : 'None available',
    });
    const full = maxQueue && waiting >= maxQueue;
    const nearlyFull = maxQueue && waiting >= maxQueue * 0.8;
    items.push({
      key: 'queue',
      label: 'Queue',
      state: full ? 'bad' : nearlyFull ? 'warn' : 'ok',
      text: maxQueue ? `${formatNumber(waiting)} of ${formatNumber(maxQueue)} waiting` : `${formatNumber(waiting)} waiting`,
    });
    items.push({
      key: 'failed',
      label: 'Failed jobs',
      state: failedJobs > 0 ? 'warn' : 'ok',
      text: failedJobs > 0 ? formatNumber(failedJobs) : 'None',
    });
  }

  if (data.maintenance !== null) {
    items.push({
      key: 'maintenance',
      label: 'Maintenance mode',
      state: data.maintenance ? 'warn' : 'ok',
      text: data.maintenance ? 'On' : 'Off',
    });
  }
  return items;
}

/** The twelve summary tiles. Tiles whose report failed are left out. */
function tilesOf(data) {
  const { statistics: stats, workers, limits, system } = data;
  const tiles = [];

  if (stats) {
    const total = stats.submissions.total;
    const today = stats.submissions.today;
    const last30 = sum(Object.values(stats.submissions.last_30_days), (count) => count) + today;
    const countOf = (...ids) => sum(stats.statuses.filter((entry) => ids.includes(entry.status.id)), (entry) => entry.count);
    const accepted = countOf(3);
    const internal = countOf(13, 14);
    const database = stats.database.size_in_bytes;

    tiles.push(
      <StatTile key="total" tone="spotlight" size="m" label="Submissions" value={total} context={`${formatNumber(today)} today`} />,
      <StatTile key="30d" size="m" label="Last 30 days" value={last30} context={`About ${formatNumber(Math.round((last30 / 30) * 10) / 10)} a day`} />,
      <StatTile key="accepted" size="m" label="Acceptance rate" value={formatPercent(accepted, total)} context={`${formatNumber(accepted)} accepted`} />,
      <StatTile
        key="internal"
        size="m"
        label="Judge0 errors"
        value={internal}
        context={<ErrorContext count={internal} total={total} tone="danger" noun="submissions" />}
      />,
      <StatTile
        key="database"
        size="m"
        label="Database size"
        value={formatBytes(database)}
        context={total ? `${formatBytes(database / total)} per submission` : 'No submissions yet'}
      />
    );
  }

  tiles.push(<StatTile key="ping" size="m" label="API response time" value={formatMs(data.pingMs)} context="From this server" />);

  if (workers) {
    const available = sum(workers, (queue) => queue.available);
    tiles.push(
      <StatTile
        key="waiting"
        size="m"
        label="Waiting in queue"
        value={sum(workers, (queue) => queue.size)}
        context={limits?.max_queue_size ? `Limit ${formatNumber(limits.max_queue_size)}` : pluralize(workers.length, 'queue')}
      />,
      <StatTile
        key="workers"
        size="m"
        label="Workers"
        value={available}
        context={`${formatNumber(sum(workers, (queue) => queue.working))} working \u00b7 ${formatNumber(sum(workers, (queue) => queue.idle))} idle`}
      />,
      <StatTile
        key="failed"
        size="m"
        label="Failed jobs"
        value={sum(workers, (queue) => queue.failed)}
        context={`Across ${pluralize(workers.length, 'queue')}`}
      />
    );
  }

  tiles.push(<StatTile key="version" size="m" label="Judge0 version" value={data.version || '\u2013'} context={data.isolate ? `Sandbox isolate ${data.isolate}` : 'Code execution engine'} />);

  if (system) {
    tiles.push(
      <StatTile key="cpu" size="m" label="Processor" value={system.cpus === null ? '\u2013' : pluralize(system.cpus, 'CPU')} context={system.cpuModel || 'Web server'} />,
      <StatTile key="memory" size="m" label="Memory" value={system.memory ? humanSize(system.memory) : '\u2013'} context={system.swap ? `Swap ${humanSize(system.swap)}` : 'Web server'} />
    );
  }
  return tiles;
}

/**
 * The Judge0 API tab: how the code execution engine behind programming questions is doing. Every
 * figure is Judge0's own (its /statistics, /workers, /config_info, /system_info, /about and
 * /isolate), read through the backend (GET /api/admin/monitoring/judge0):
 *
 *   - health checks: API response time, workers, queue, failed jobs, maintenance mode
 *   - submissions in total, today and per day for 30 days; by result and by language
 *   - queues and workers; the limits it enforces; the server it runs on
 *
 * Judge0 counts its statistics once every 10 minutes, so the reload button asks it to count again.
 * Judge0 keeps no response-time history; the API response time is how long it took to answer this
 * server just now.
 */
export default function Judge0Api() {
  const refreshRef = useRef(false);
  const { data, loading, error, updatedAt, reload } = useRemoteData(
    (signal) => {
      const refresh = refreshRef.current;
      refreshRef.current = false;
      return monitoringApi.judge0({ refresh, signal });
    },
    'judge0',
    { pollMs: POLL_MS }
  );

  const reloadFresh = () => {
    refreshRef.current = true;
    reload();
  };

  const bar = (
    <MonitorBar
      onReload={reloadFresh}
      loading={loading}
      caption={
        updatedAt ? (
          <>
            Updated {formatClock(updatedAt)}
            <span className="mon-bar__hint">{' \u00b7 Judge0 counts submissions every 10 minutes; reload counts again'}</span>
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
            title="We could not load Judge0"
            action={
              <Button variant="ghost" onClick={reloadFresh}>
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

  if (!data.configured) {
    return (
      <div className="mon-tab">
        {bar}
        <Card>
          <EmptyState
            icon={<CodeIcon size={28} aria-hidden="true" />}
            title="Judge0 is not set up"
            text="Set JUDGE0_HOST (and JUDGE0_AUTH_HEADER and JUDGE0_AUTH_TOKEN, if it needs them) in the backend environment, then reload."
          />
        </Card>
      </div>
    );
  }

  if (data.reachable === false) {
    return (
      <div className="mon-tab">
        {bar}
        <Notice
          tone="danger"
          title="Judge0 is not reachable"
          action={
            <Button variant="ghost" onClick={reloadFresh}>
              Retry
            </Button>
          }
        >
          {data.error || 'The backend could not reach Judge0.'} Students cannot run or submit code until it is back.
        </Notice>
      </div>
    );
  }

  const noWorkers = data.workers && data.workers.length > 0 && data.workers.every((queue) => queue.available === 0);
  const tiles = tilesOf(data);

  return (
    <div className="mon-tab">
      {bar}
      <ChecksRow items={checksOf(data)} label="Judge0 checks" />

      {error ? (
        <Notice tone="warning" title="The numbers could not be refreshed">
          {error} Showing the last data that loaded.
        </Notice>
      ) : null}
      {noWorkers ? (
        <Notice tone="warning" title="No worker is listening for submissions">
          Judge0 reports no worker on its queue, so code students run would wait. If that is not expected, start the Judge0 worker.
        </Notice>
      ) : null}
      {data.maintenance ? (
        <Notice tone="warning" title="Judge0 is in maintenance mode">
          It is not accepting new submissions until maintenance mode is switched off.
        </Notice>
      ) : null}
      {data.problems.statistics ? (
        <Notice tone="warning" title="Statistics are not available">
          {data.problems.statistics}
        </Notice>
      ) : null}

      <StatGrid label="Summary of Judge0" className="mon-stats--compact">
        {tiles}
      </StatGrid>

      {data.statistics ? (
        <div className="mon-charts">
          <SubmissionsChart statistics={data.statistics} />
          <OutcomesCard statistics={data.statistics} />
          <LanguagesCard statistics={data.statistics} />
        </div>
      ) : null}

      <Judge0Workers workers={data.workers} problem={data.problems.workers} maxQueue={data.limits?.max_queue_size} />

      <div className="mon-pair">
        <LimitsCard limits={data.limits} problem={data.problems.limits} />
        <ServerCard system={data.system} version={data.version} isolate={data.isolate} problem={data.problems.system} />
      </div>

      <p className="mon-note">
        Read from Judge0 through the backend. Judge0 keeps no history of response times or worker counts, so those are as of the last reload.
      </p>
    </div>
  );
}
