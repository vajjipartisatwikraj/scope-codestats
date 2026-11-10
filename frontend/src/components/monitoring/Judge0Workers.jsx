import React from 'react';
import { Card, EmptyState, formatNumber } from '../ui';
import useMediaQuery from '../../hooks/useMediaQuery';

/**
 * Queues and workers, as Judge0 reports them (/workers). A queue is where submissions wait; a
 * worker is a process that runs them. For each queue: submissions waiting, workers available, and
 * how many of those are idle, working or paused, plus jobs that failed. With no worker available
 * nothing is run: submissions only wait. A compact table from 900px, rows on a phone.
 *
 *   workers   the `workers` list (null when that report failed)
 *   problem   why it is missing
 *   maxQueue  Judge0's queue size limit (config_info.max_queue_size), when known
 */
export default function Judge0Workers({ workers, problem, maxQueue }) {
  const phone = useMediaQuery('(max-width: 899.95px)');

  let body;
  if (workers === null) {
    body = <EmptyState compact title="This report is not available" text={problem || 'Judge0 did not send it.'} />;
  } else if (workers.length === 0) {
    body = <EmptyState compact title="No queues yet" text="Judge0 lists a queue once its first worker starts." />;
  } else if (phone) {
    body = (
      <ul className="ui-list">
        {workers.map((row) => (
          <li key={row.queue} className="ui-list__row mon-row">
            <div className="mon-row__text">
              <span className="mon-row__route">
                <span className="mon-route__path">{row.queue}</span>
              </span>
              <span className="mon-row__meta">{`${formatNumber(row.size)} waiting \u00b7 ${formatNumber(row.available)} workers available`}</span>
              <span className="mon-row__meta">
                {`${formatNumber(row.idle)} idle \u00b7 ${formatNumber(row.working)} working \u00b7 ${formatNumber(row.paused)} paused \u00b7 ${formatNumber(row.failed || 0)} failed`}
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
          <caption className="ui-sr">Judge0 queues and workers.</caption>
          <thead>
            <tr>
              <th scope="col">Queue</th>
              <th scope="col" className="ui-num">Waiting</th>
              <th scope="col" className="ui-num">Workers available</th>
              <th scope="col" className="ui-num">Idle</th>
              <th scope="col" className="ui-num">Working</th>
              <th scope="col" className="ui-num">Paused</th>
              <th scope="col" className="ui-num">Failed jobs</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((row) => (
              <tr key={row.queue}>
                <td className="mon-table__route">
                  <span className="ui-table__title">{row.queue}</span>
                </td>
                <td className="ui-num mon-table__num">
                  {formatNumber(row.size)}
                  {maxQueue ? <span className="mon-table__muted">{` of ${formatNumber(maxQueue)}`}</span> : null}
                </td>
                <td className="ui-num mon-table__num">{formatNumber(row.available)}</td>
                <td className="ui-num mon-table__num">{formatNumber(row.idle)}</td>
                <td className="ui-num mon-table__num">{formatNumber(row.working)}</td>
                <td className="ui-num mon-table__num">{formatNumber(row.paused)}</td>
                <td className="ui-num mon-table__num" data-problem={row.failed > 0 ? 'true' : undefined}>
                  {formatNumber(row.failed || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card flush className="mon-card" title="Queues and workers" description="Where submissions wait, and the workers that run them.">
      {body}
    </Card>
  );
}
