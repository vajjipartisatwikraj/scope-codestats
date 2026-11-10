import React from 'react';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { Badge, SortHeader, formatNumber } from '../ui';
import { formatBytes, formatMs } from './monitoringModel';

const dash = '\u2013';

/** GET, POST ... as a quiet badge, so the route path stays the first thing in the row. */
export function MethodBadge({ method }) {
  return (
    <Badge tone="neutral" className="mon-method">
      {method}
    </Badge>
  );
}

/** The columns of the table: the label, how it sorts, and how a number is shown. */
const COLUMNS = [
  { key: 'count', label: 'Calls', value: (r) => formatNumber(r.count) },
  { key: 'success', label: 'Success', value: (r) => formatNumber(r.success) },
  { key: 'clientErrors', label: '4xx', value: (r) => formatNumber(r.clientErrors) },
  { key: 'serverErrors', label: '5xx', value: (r) => formatNumber(r.serverErrors) },
  { key: 'p50', label: 'Median', value: (r) => formatMs(r.p50) },
  { key: 'p95', label: 'Slowest 5%', value: (r) => formatMs(r.p95) },
  { key: 'bytes', label: 'Data sent', value: (r) => formatBytes(r.bytes) },
];

/**
 * Every route with its calls, outcomes and response times. A compact table from 900px, rows on a
 * phone. Pressing a row opens the route's details.
 *
 *   rows        the routes of this page, already sorted
 *   phone       render rows instead of a table
 *   sort        { key, dir }, onSort(key)
 *   onOpen(route)
 */
export default function RouteTable({ rows, phone, sort, onSort, onOpen }) {
  if (phone) {
    return (
      <ul className="ui-list">
        {rows.map((route) => (
          <li key={`${route.method} ${route.route}`} className="ui-list__row mon-row">
            <button type="button" className="mon-row__open" onClick={() => onOpen(route)} aria-label={`Open ${route.method} ${route.route}`}>
              <span className="mon-row__text">
                <span className="mon-row__route">
                  <MethodBadge method={route.method} />
                  <span className="mon-route__path">{route.route}</span>
                </span>
                <span className="mon-row__meta">
                  {formatNumber(route.count)} calls
                  {route.serverErrors ? ` \u00b7 ${formatNumber(route.serverErrors)} server errors` : ''}
                  {route.clientErrors ? ` \u00b7 ${formatNumber(route.clientErrors)} client errors` : ''}
                </span>
                <span className="mon-row__meta">
                  {`Median ${formatMs(route.p50)} \u00b7 Slowest 5% ${formatMs(route.p95)}`}
                </span>
              </span>
              <CaretRightIcon size={18} weight="bold" className="mon-row__caret" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table mon-table" data-density="compact">
        <caption className="ui-sr">Routes of the API with their calls, outcomes and response times. Press a row to open it.</caption>
        <thead>
          <tr>
            <SortHeader label="Route" sortKey="route" sort={sort} onSort={onSort} />
            {COLUMNS.map((column) => (
              <SortHeader key={column.key} label={column.label} sortKey={column.key} sort={sort} onSort={onSort} align="end" className="ui-num" />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((route) => (
            <tr key={`${route.method} ${route.route}`} className="mon-table__row" onClick={() => onOpen(route)}>
              <td className="mon-table__route">
                <button
                  type="button"
                  className="mon-route"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(route);
                  }}
                >
                  <MethodBadge method={route.method} />
                  <span className="mon-route__path">{route.route}</span>
                </button>
              </td>
              {COLUMNS.map((column) => (
                <td key={column.key} className="ui-num mon-table__num" data-problem={column.key === 'serverErrors' && route.serverErrors > 0 ? 'true' : undefined}>
                  {column.value(route) || dash}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
