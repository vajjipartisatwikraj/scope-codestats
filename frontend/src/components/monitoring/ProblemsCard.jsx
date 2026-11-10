import React, { useState } from 'react';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { Badge, Button, Card, EmptyState, IconButton, Notice, SelectField, SkeletonRows, formatDateTime, formatNumber, relativeTime } from '../ui';
import useMediaQuery from '../../hooks/useMediaQuery';
import { MethodBadge } from './RouteTable';
import useProblemEvents from './useProblemEvents';
import { formatMs, shortId, statusInfo } from './monitoringModel';

const FILTERS = [
  { value: '0', label: 'All problems' },
  { value: '500', label: 'Server errors (5xx)' },
  { value: '400', label: 'Errors (4xx and 5xx)' },
];

const dash = '\u2013';

/** A response that took a second or more is "slow" even though it succeeded. */
const SLOW_MS = 1000;

/** The status as a badge with its word; a slow success says so. */
function StatusBadge({ event }) {
  const info = statusInfo(event.status);
  if (event.status < 400 && event.ms >= SLOW_MS) return <Badge tone="warning">Slow ({info.label})</Badge>;
  return <Badge tone={info.tone}>{info.label}</Badge>;
}

const who = (event) => (event.user ? `${event.userType || 'user'} ${shortId(event.user)}` : 'Not signed in');

/**
 * The server errors, client errors and slow requests the server kept one by one, newest first.
 * Expired sign-ins (401) and calls to routes that do not exist are only counted, not listed. Each
 * row names the user (type and the last 6 characters of the id, as the server log does), so a
 * report from a student can be matched with the request id in the log.
 */
export default function ProblemsCard() {
  const phone = useMediaQuery('(max-width: 899.95px)');
  const [filter, setFilter] = useState('0');
  const { events, loading, loadingMore, hasMore, error, loadMore, reload } = useProblemEvents(Number(filter));

  const filterControl = (
    <SelectField variant="pill" aria-label="Show" value={filter} onChange={(event) => setFilter(event.target.value)} options={FILTERS} />
  );
  const refresh = (
    <IconButton label="Reload errors" size="sm" onClick={reload}>
      <ArrowsClockwiseIcon size={18} aria-hidden="true" />
    </IconButton>
  );

  let body;
  if (loading) {
    body = <SkeletonRows count={5} height={44} />;
  } else if (error && events.length === 0) {
    body = (
      <div className="mon-state">
        <Notice
          tone="danger"
          title="We could not load the errors"
          action={
            <Button variant="ghost" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      </div>
    );
  } else if (events.length === 0) {
    body = (
      <EmptyState
        compact
        icon={<CheckCircleIcon size={28} aria-hidden="true" />}
        title="No problems recorded"
        text="Server errors, client errors and slow requests show up here about a minute after they happen."
      />
    );
  } else if (phone) {
    body = (
      <ul className="ui-list">
        {events.map((event) => (
          <li key={event.id} className="ui-list__row mon-problem">
            <div className="mon-problem__text">
              <span className="mon-row__route">
                <MethodBadge method={event.method} />
                <span className="mon-route__path">{event.route}</span>
              </span>
              <span className="mon-row__meta" title={formatDateTime(event.at)}>
                {`${relativeTime(event.at)} \u00b7 ${formatMs(event.ms)} \u00b7 ${who(event)}`}
              </span>
              {event.message ? <span className="mon-problem__message">{event.message}</span> : null}
            </div>
            <StatusBadge event={event} />
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="ui-table-wrap">
        <table className="ui-table mon-table" data-density="compact">
          <caption className="ui-sr">Recent errors and slow requests, newest first.</caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Request</th>
              <th scope="col">Result</th>
              <th scope="col" className="ui-num">
                Time
              </th>
              <th scope="col">User</th>
              <th scope="col">Message</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="mon-table__muted" title={formatDateTime(event.at)}>
                  {relativeTime(event.at)}
                </td>
                <td className="mon-table__route">
                  <span className="mon-route mon-route--static">
                    <MethodBadge method={event.method} />
                    <span className="mon-route__path">{event.route}</span>
                  </span>
                </td>
                <td>
                  <StatusBadge event={event} />
                </td>
                <td className="ui-num mon-table__num">{formatMs(event.ms)}</td>
                <td className="mon-table__muted">{who(event)}</td>
                <td className="mon-table__message" title={event.requestId ? `Request ${event.requestId}` : undefined}>
                  {event.message || dash}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card
      flush
      className="mon-card"
      title="Errors and slow requests"
      description={`Kept for 30 days. Showing ${formatNumber(events.length)}.`}
      actions={
        <div className="mon-card__tools">
          {filterControl}
          {refresh}
        </div>
      }
    >
      {body}
      {hasMore ? (
        <div className="mon-more">
          <Button onClick={loadMore} loading={loadingMore}>
            Show more
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
