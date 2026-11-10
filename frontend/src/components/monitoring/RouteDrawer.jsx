import React from 'react';
import { Badge, Drawer, formatNumber } from '../ui';
import { MethodBadge } from './RouteTable';
import { formatBytes, formatMs, formatPercent, statusInfo } from './monitoringModel';

/**
 * The details of one route in a 480px drawer: how many calls, how they ended (every status code
 * with its count), and how long they took.
 *
 *   route     a row of the API overview (or null to close)
 *   onClose
 */
export default function RouteDrawer({ route, onClose }) {
  const facts = route
    ? [
        ['Calls', formatNumber(route.count)],
        ['Successful', `${formatNumber(route.success)} (${formatPercent(route.success, route.count)})`],
        ['Client errors (4xx)', `${formatNumber(route.clientErrors)} (${formatPercent(route.clientErrors, route.count)})`],
        ['Server errors (5xx)', `${formatNumber(route.serverErrors)} (${formatPercent(route.serverErrors, route.count)})`],
        ['Average time', formatMs(route.avgMs)],
        ['Median time', formatMs(route.p50)],
        ['Slowest 5% (p95)', formatMs(route.p95)],
        ['Slowest 1% (p99)', formatMs(route.p99)],
        ['Slowest request', formatMs(route.maxMs)],
        ['Data sent', formatBytes(route.bytes)],
      ]
    : [];

  return (
    <Drawer
      open={Boolean(route)}
      onClose={onClose}
      title={route ? route.route : 'Route'}
      description={route ? 'How this route has been used in the chosen range.' : undefined}
    >
      {route ? (
        <div className="mon-drawer">
          <div className="mon-drawer__route">
            <MethodBadge method={route.method} />
          </div>

          <dl className="mon-facts">
            {facts.map(([label, value]) => (
              <div key={label} className="mon-facts__row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <section className="mon-drawer__section" aria-labelledby="mon-drawer-statuses">
            <h3 id="mon-drawer-statuses" className="mon-drawer__heading">
              Status codes
            </h3>
            <ul className="mon-codes">
              {route.statuses.map(({ status, count }) => {
                const info = statusInfo(status);
                return (
                  <li key={status} className="mon-codes__row">
                    <Badge tone={info.tone}>{info.label}</Badge>
                    <span className="mon-codes__count">{formatNumber(count)}</span>
                    <span className="mon-codes__share">{formatPercent(count, route.count)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
