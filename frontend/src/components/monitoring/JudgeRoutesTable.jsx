import React from 'react';
import { Card, EmptyState, formatDateTime, formatNumber, relativeTime } from '../ui';
import useMediaQuery from '../../hooks/useMediaQuery';
import { MethodBadge } from './RouteTable';
import { formatMs, humanize } from './monitoringModel';

const dash = '\u2013';

/**
 * API calls by route, as the speech judge counts them: the route (with its method), what kind of
 * call it is (jobs, evaluation, other), how many calls, how many failed and how many of those were
 * server errors, the average, the slowest 5% (p95) and the slowest time, and when it was last
 * called. The judge's own health and metrics calls are left out. A compact table from 900px, rows
 * on a phone.
 *
 *   rows     the judge's `routes` answer (null when that report failed)
 *   problem  why `rows` is missing
 */
export default function JudgeRoutesTable({ rows, problem }) {
  const phone = useMediaQuery('(max-width: 899.95px)');

  let body;
  if (rows === null) {
    body = <EmptyState compact title="This report is not available" text={problem || 'The judge did not send it.'} />;
  } else if (rows.length === 0) {
    body = <EmptyState compact title="No API calls in this range" text="Routes appear here once the judge is called." />;
  } else if (phone) {
    body = (
      <ul className="ui-list">
        {rows.map((row) => (
          <li key={`${row.method} ${row.route}`} className="ui-list__row mon-row">
            <div className="mon-row__text">
              <span className="mon-row__route">
                <MethodBadge method={row.method} />
                <span className="mon-route__path">{row.route}</span>
              </span>
              <span className="mon-row__meta">
                {`${formatNumber(row.hits)} calls \u00b7 ${formatNumber(row.errors)} errors \u00b7 ${formatNumber(row.server_errors)} server errors`}
              </span>
              <span className="mon-row__meta">
                {`Average ${formatMs(row.avg_ms)} \u00b7 p95 ${formatMs(row.p95_ms)} \u00b7 slowest ${formatMs(row.max_ms)}`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="ui-table-wrap">
        <table className="ui-table mon-table" data-density="compact">
          <caption className="ui-sr">API calls to the speech judge by route.</caption>
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Kind</th>
              <th scope="col" className="ui-num">Calls</th>
              <th scope="col" className="ui-num">Errors</th>
              <th scope="col" className="ui-num">5xx</th>
              <th scope="col" className="ui-num">Average</th>
              <th scope="col" className="ui-num">p95</th>
              <th scope="col" className="ui-num">Slowest</th>
              <th scope="col" className="mon-wide">Last call</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.method} ${row.route}`}>
                <td className="mon-table__route">
                  <span className="mon-route mon-route--static">
                    <MethodBadge method={row.method} />
                    <span className="mon-route__path">{row.route}</span>
                  </span>
                </td>
                <td className="mon-table__muted">{humanize(row.category)}</td>
                <td className="ui-num mon-table__num">{formatNumber(row.hits)}</td>
                <td className="ui-num mon-table__num">{formatNumber(row.errors)}</td>
                <td className="ui-num mon-table__num" data-problem={row.server_errors > 0 ? 'true' : undefined}>
                  {formatNumber(row.server_errors)}
                </td>
                <td className="ui-num mon-table__num">{formatMs(row.avg_ms)}</td>
                <td className="ui-num mon-table__num">{formatMs(row.p95_ms)}</td>
                <td className="ui-num mon-table__num">{formatMs(row.max_ms)}</td>
                <td className="mon-wide mon-table__muted" title={row.last_seen ? formatDateTime(row.last_seen) : undefined}>
                  {row.last_seen ? relativeTime(row.last_seen) : dash}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card flush className="mon-card" title="API calls by route" description="Every route of the speech judge that was called in this range.">
      {body}
    </Card>
  );
}
