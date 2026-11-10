import React from 'react';
import { CalculatorIcon } from '@phosphor-icons/react/dist/csr/Calculator';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { Button, EmptyState, IconButton, Notice, SkeletonRows, Badge, formatDateTime, formatNumber } from '../ui';
import { RANK_SOURCE, formatMillis, rankStatusInfo } from './syncModel';

const sourceOf = (run) => RANK_SOURCE[run.source] || run.source;

/**
 * Scores and ranks. Ranks are calculated by themselves after every profile sync; this lists the
 * latest calculations and lets an admin calculate now, from the scores already stored (for example
 * to start the history before the first nightly sync, or after fixing a student's department). It
 * contacts no platform. A band table from 900px and rows below that.
 *
 *   rankings   the result of useRankings
 *   compact    rows instead of the table
 */
export default function RankingsSection({ rankings, compact }) {
  const { runs, running, syncRunning, loading, error, starting, load, recompute } = rankings;
  const calculating = starting || running;

  let body;
  if (loading) {
    body = <SkeletonRows count={3} height={compact ? 80 : 64} />;
  } else if (runs.length === 0) {
    body = (
      <EmptyState
        compact
        icon={<CalculatorIcon size={28} weight="regular" />}
        title="No ranks calculated yet"
        text="They are calculated after the next profile sync, or press Recalculate ranks now to start."
      />
    );
  } else if (compact) {
    body = (
      <ul className="cp-rows" aria-label="Latest score and rank calculations">
        {runs.map((run) => {
          const info = rankStatusInfo(run.status);
          return (
            <li key={run.id} className="cp-run cp-run--static">
              <span className="cp-run__top">
                <Badge tone={info.tone}>{info.label}</Badge>
                <Badge>{sourceOf(run)}</Badge>
              </span>
              <span className="cp-run__when">{run.startedAt ? formatDateTime(run.startedAt) : '\u2013'}</span>
              <span className="cp-run__meta">
                {formatNumber(run.students)} students · {formatNumber(run.written)} written · {formatNumber(run.unchanged)} unchanged · {formatMillis(run.durationMs)}
              </span>
              {run.error ? <span className="cp-run__error">{run.error}</span> : null}
            </li>
          );
        })}
      </ul>
    );
  } else {
    body = (
      <div className="ui-table-wrap">
        <table className="ui-band-table cp-table cp-table--ranks">
          <caption className="ui-sr">Latest score and rank calculations, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Started</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col" className="ui-num">
                Students
              </th>
              <th scope="col" className="ui-num">
                Records written
              </th>
              <th scope="col" className="ui-num">
                Unchanged
              </th>
              <th scope="col" className="ui-num">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const info = rankStatusInfo(run.status);
              return (
                <tr key={run.id}>
                  <td>{run.startedAt ? formatDateTime(run.startedAt) : '\u2013'}</td>
                  <td>{sourceOf(run)}</td>
                  <td>
                    <span title={run.error || undefined}>
                      <Badge tone={info.tone}>{info.label}</Badge>
                    </span>
                  </td>
                  <td className="ui-num">{formatNumber(run.students)}</td>
                  <td className="ui-num">{formatNumber(run.written)}</td>
                  <td className="ui-num">{formatNumber(run.unchanged)}</td>
                  <td className="ui-num">{formatMillis(run.durationMs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="cp-section" aria-labelledby="cp-ranks-title">
      <header className="cp-section__head">
        <div>
          <h2 className="cp-section__title" id="cp-ranks-title">
            Scores and ranks
          </h2>
          <p className="cp-section__text">Calculated automatically after every profile sync. Recalculate now to use the scores already stored.</p>
        </div>
        <div className="cp-section__actions">
          <IconButton label="Refresh the ranking history" onClick={load}>
            <ArrowsClockwiseIcon size={20} weight="regular" aria-hidden="true" />
          </IconButton>
          <Button
            loading={calculating}
            disabled={syncRunning}
            startIcon={<CalculatorIcon size={18} weight="regular" aria-hidden="true" />}
            onClick={recompute}
            title={syncRunning ? 'A profile sync is running. Ranks are calculated when it finishes.' : undefined}
          >
            {calculating ? 'Calculating' : 'Recalculate ranks now'}
          </Button>
        </div>
      </header>

      {syncRunning ? (
        <Notice tone="info" title="A profile sync is running">
          Ranks are calculated when it finishes.
        </Notice>
      ) : null}
      {error ? (
        <Notice
          tone="danger"
          title="We could not load the ranking history"
          action={
            <Button variant="ghost" size="sm" onClick={load}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}
      {body}
    </section>
  );
}
