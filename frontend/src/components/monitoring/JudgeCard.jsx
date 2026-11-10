import React from 'react';
import { Card, Notice, formatDate, formatNumber } from '../ui';
import { formatBytes, formatPercent } from './monitoringModel';

const dash = '\u2013';

/**
 * The space the speech judge's own usage data takes, and how its writer is doing. All of it comes
 * from the judge (/metrics/status and /metrics/storage). The judge's readiness checks are the row
 * at the top of the tab (JudgeChecks).
 *
 *   writer        the judge's usage writer: { backend, written, queued, dropped, last_error, retention_days }
 *   storage       the judge's /metrics/storage answer, or null
 *   storageError  why storage is missing
 */
export default function JudgeCard({ writer, storage, storageError }) {
  const rows = storage ? storage.tables.reduce((sum, table) => sum + (table.rows || 0), 0) : null;
  const retention = writer?.retention_days ? `${writer.retention_days} days` : 'Forever';
  const oldest = storage?.tables.map((table) => table.oldest).filter(Boolean).sort()[0];

  const facts = [
    ['Usage database', storage ? formatBytes(storage.database_bytes) : dash],
    [
      'Usage tables',
      storage && storage.tables_bytes != null
        ? `${formatBytes(storage.tables_bytes)} (${formatPercent(storage.tables_bytes, storage.database_bytes)})`
        : dash,
    ],
    ['Events stored', rows === null ? dash : formatNumber(rows)],
    ['Oldest event', oldest ? formatDate(oldest) : dash],
    ['Events kept for', writer ? retention : dash],
    ['Events written', writer ? formatNumber(writer.written) : dash],
    ['Waiting to be written', writer ? formatNumber(writer.queued) : dash],
    ['Dropped', writer ? formatNumber(writer.dropped) : dash],
  ];

  return (
    <Card title="Judge usage data" description="The space the speech judge's own usage records take." className="mon-judge">
      <dl className="mon-facts mon-facts--columns">
        {facts.map(([label, value]) => (
          <div key={label} className="mon-facts__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {storageError ? <p className="mon-note">Database size is not available: {storageError}</p> : null}

      {writer?.last_error ? (
        <Notice tone="warning" title="The judge could not write its last usage events" className="mon-judge__notice">
          {writer.last_error}
        </Notice>
      ) : null}
    </Card>
  );
}
