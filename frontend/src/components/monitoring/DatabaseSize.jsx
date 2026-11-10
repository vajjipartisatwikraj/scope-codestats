import React, { useMemo, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { ProgressBar } from '../custom-components';
import { Button, Card, EmptyState, Notice, Pagination, SearchField, Skeleton, StatGrid, StatTile, formatDate, formatNumber, pluralize } from '../ui';
import useMediaQuery from '../../hooks/useMediaQuery';
import { monitoringApi } from '../../services/monitoringApi';
import CollectionTable from './CollectionTable';
import { CollectionsChart, RecordsChart, SizeChart } from './DatabaseCharts';
import MonitorBar from './MonitorBar';
import useRemoteData from './useRemoteData';
import { DB_RANGES, formatBytes, formatClock, formatDayKey, formatPercent, nextSort, searchRows, sortRows } from './monitoringModel';

const GETTERS = {
  name: (c) => c.name,
  count: (c) => c.count,
  dataSize: (c) => c.dataSize,
  onDisk: (c) => c.storageSize + c.indexSize,
  indexSize: (c) => c.indexSize,
  avgObjSize: (c) => c.avgObjSize,
};

function Loading() {
  return (
    <div role="status" aria-label="Loading the database size" className="mon-loading">
      <div className="ui-stats" data-cols="4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} height={108} radius="var(--ds-radius-xl)" />
        ))}
      </div>
      <Skeleton height={300} radius="var(--ds-radius-xl)" />
    </div>
  );
}

/** How full the disk is as a tone: calm, then a warning at 80%, then danger at 90%. */
const diskTone = (share) => (share >= 0.9 ? 'danger' : share >= 0.8 ? 'warning' : 'accent');

/**
 * The Database tab: how much space the database uses and how fast it grows. Every collection is
 * listed with its records and sizes, read from the database itself (so collections that no model
 * owns show up too). The history comes from the snapshots the server takes every hour; the last
 * reading of each day is kept.
 *
 * Sizes are in binary units (1 KB = 1,024 bytes). "Data size" is the data before compression,
 * "On disk" what it takes after compression.
 */
export default function DatabaseSize() {
  const phone = useMediaQuery('(max-width: 899.95px)');
  const [range, setRange] = useState('90d');
  const refreshRef = useRef(false);

  const { data, loading, error, updatedAt, reload } = useRemoteData(
    (signal) => {
      // The reload button asks the server to measure again instead of using its one-minute copy
      const refresh = refreshRef.current;
      refreshRef.current = false;
      return monitoringApi.database(range, { refresh, signal });
    },
    range
  );

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'onDisk', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const collections = data?.live.collections;
  const found = useMemo(() => searchRows(collections || [], query, (c) => `${c.name} ${c.model}`), [collections, query]);
  const sorted = useMemo(() => sortRows(found, sort, GETTERS), [found, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const reloadFresh = () => {
    refreshRef.current = true;
    reload();
  };

  const bar = (
    <MonitorBar
      ranges={DB_RANGES}
      range={range}
      onRange={setRange}
      onReload={reloadFresh}
      loading={loading}
      label="Time range of the database history"
      caption={updatedAt ? `Measured ${formatClock(data?.live.takenAt || updatedAt)}` : null}
    />
  );

  if (!data) {
    return (
      <div className="mon-tab">
        {bar}
        {error ? (
          <Notice
            tone="danger"
            title="We could not load the database size"
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

  const { database } = data.live;
  const { history } = data;
  const totalOnDisk = database.storageSize + database.indexSize;
  const hasDisk = database.fsUsedSize !== null && database.fsTotalSize !== null;
  const diskShare = hasDisk && database.fsTotalSize ? database.fsUsedSize / database.fsTotalSize : 0;
  const diskFree = hasDisk ? database.fsTotalSize - database.fsUsedSize : null;
  const modelOf = (name) => data.live.collections.find((c) => c.name === name)?.model || '';
  const firstDay = history.total[0]?.day;

  return (
    <div className="mon-tab">
      {bar}

      {error ? (
        <Notice tone="warning" title="The numbers could not be refreshed">
          {error} Showing the last data that loaded.
        </Notice>
      ) : null}
      {hasDisk && diskShare >= 0.8 ? (
        <Notice tone={diskShare >= 0.9 ? 'danger' : 'warning'} title={`The database disk is ${formatPercent(database.fsUsedSize, database.fsTotalSize)} full`}>
          Only {formatBytes(diskFree)} is free. Free up space or add storage before it fills, because MongoDB stops accepting writes on a full disk.
        </Notice>
      ) : null}

      <StatGrid label="Summary of the database size">
        <StatTile
          tone="spotlight"
          label="Database size on disk"
          value={formatBytes(totalOnDisk)}
          context={`Data ${formatBytes(database.storageSize)} \u00b7 indexes ${formatBytes(database.indexSize)}`}
        />
        <StatTile label="Records" value={database.records} context={`Across ${pluralize(database.collections, 'collection')}`} />
        <StatTile label="Data size" value={formatBytes(database.dataSize)} context={`Before compression. ${formatBytes(database.storageSize)} on disk`} />
        <StatTile label="Indexes" value={formatBytes(database.indexSize)} context={`${formatPercent(database.indexSize, totalOnDisk)} of the database`} />
        <StatTile label="Reusable space" value={formatBytes(database.freeSize)} context="Left by deleted data, reused by new data" />
        <StatTile
          label="Disk free"
          value={hasDisk ? formatBytes(diskFree) : '\u2013'}
          context={hasDisk ? `${formatPercent(database.fsUsedSize, database.fsTotalSize)} of ${formatBytes(database.fsTotalSize)} used` : 'The server did not report the disk'}
        />
        <StatTile
          label="Growth per day"
          value={history.growthPerDay === null ? '\u2013' : `${history.growthPerDay >= 0 ? '+' : '\u2212'}${formatBytes(Math.abs(history.growthPerDay))}`}
          context={history.growthPerDay === null ? 'Needs two days of readings' : 'Over the last 30 days'}
        />
        <StatTile
          label="Disk full in"
          value={history.daysUntilFull === null ? '\u2013' : history.daysUntilFull > 3650 ? 'Years' : pluralize(history.daysUntilFull, 'day')}
          context={history.daysUntilFull === null ? 'Needs a week of readings' : 'At the recent growth'}
        />
      </StatGrid>

      {hasDisk ? (
        <Card title="Disk of the database server" description="The disk that holds the database files. Other files on it count too.">
          <ProgressBar
            value={database.fsUsedSize}
            max={database.fsTotalSize}
            tone={diskTone(diskShare)}
            label={`${formatBytes(database.fsUsedSize)} used of ${formatBytes(database.fsTotalSize)}`}
            valueLabel={`${formatBytes(diskFree)} free`}
          />
        </Card>
      ) : null}

      <div className="mon-charts">
        <SizeChart history={history} />
        <RecordsChart history={history} />
        <CollectionsChart history={history} modelOf={modelOf} />
      </div>

      <Card
        flush
        className="mon-card"
        title="Collections"
        description={`${pluralize(database.collections, 'collection')}, biggest first. Read from the database, so collections without a model in the code are listed too.`}
        actions={
          <SearchField
            className="mon-search"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            label="Search collections"
            placeholder="Search collections"
          />
        }
      >
        {sorted.length === 0 ? (
          <EmptyState
            compact
            icon={<MagnifyingGlassIcon size={28} aria-hidden="true" />}
            title="No collection matches"
            text={`Nothing matches \u201c${query.trim()}\u201d.`}
            action={<Button onClick={() => setQuery('')}>Clear search</Button>}
          />
        ) : (
          <>
            <CollectionTable
              rows={rows}
              totalOnDisk={totalOnDisk}
              phone={phone}
              sort={sort}
              onSort={(key) => {
                setSort((now) => nextSort(now, key));
                setPage(1);
              }}
            />
            <Pagination
              page={current}
              pageSize={pageSize}
              total={sorted.length}
              onPage={setPage}
              onPageSize={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      <p className="mon-note">
        {firstDay ? `History starts on ${formatDayKey(firstDay)}. ` : ''}
        The database is measured every hour and the last reading of each day is kept, forever. {formatNumber(database.records)} records in total.
        Last measured {formatDate(data.live.takenAt)}.
      </p>
    </div>
  );
}
