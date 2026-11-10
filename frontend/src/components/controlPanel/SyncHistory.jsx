import React from 'react';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { ProhibitIcon } from '@phosphor-icons/react/dist/csr/Prohibit';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { Badge, Button, EmptyState, IconButton, Notice, Pagination, SkeletonRows, formatDateTime, formatNumber, relativeTime } from '../ui';
import { ProgressBar } from '../custom-components';
import SyncStatusBadge from './SyncStatusBadge';
import { barTone, formatDuration } from './syncModel';

const typeLabel = (job) => (job.jobType === 'scheduled' ? 'Scheduled' : 'Manual');

/** View details, and Cancel while the run is going */
function Actions({ job, onOpen, onCancel }) {
  const when = formatDateTime(job.startTime);
  return (
    <div className="cp-actions">
      <IconButton label={`View the sync of ${when}`} size="sm" tone="plain" onClick={() => onOpen(job.id)}>
        <EyeIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>
      {job.status === 'running' ? (
        <IconButton label="Cancel this sync" size="sm" tone="plain" className="cp-cancel" onClick={() => onCancel(job.id)}>
          <ProhibitIcon size={20} weight="regular" aria-hidden="true" />
        </IconButton>
      ) : null}
    </div>
  );
}

/**
 * The runs of the profile sync, newest first, in pages: a band table from 900px (one row per run,
 * pressing it opens the run) and a list of rows below that. A run that is going shows a bar that
 * moves; passed and failed are counted in tabular figures.
 *
 *   sync        the result of useProfileSync
 *   compact     rows instead of the table
 *   onCancel(id)  asks to cancel a running run (the page owns the confirmation)
 */
export default function SyncHistory({ sync, compact, onCancel }) {
  const { jobs, total, loading, error, page, pageSize, setPage, setPageSize, setSelectedId, refresh } = sync;

  let body;
  if (loading) {
    body = <SkeletonRows count={5} height={compact ? 96 : 64} />;
  } else if (error && jobs.length === 0) {
    body = (
      <Notice
        tone="danger"
        title="We could not load the sync history"
        action={
          <Button variant="ghost" size="sm" onClick={refresh}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (jobs.length === 0) {
    body = (
      <EmptyState
        icon={<ArrowsClockwiseIcon size={28} weight="regular" />}
        title="No sync has run yet"
        text="The first one starts tonight at 12:00 AM IST, or press Run profile sync above to start it now."
      />
    );
  } else if (compact) {
    body = (
      <ul className="cp-rows" aria-label="Profile sync runs">
        {jobs.map((job) => (
          <li key={job.id} className="cp-run">
            <button type="button" className="cp-run__main" onClick={() => setSelectedId(job.id)} aria-label={`Open the sync of ${formatDateTime(job.startTime)}`}>
              <span className="cp-run__top">
                <SyncStatusBadge status={job.status} />
                <Badge>{typeLabel(job)}</Badge>
              </span>
              <span className="cp-run__when">{formatDateTime(job.startTime)}</span>
              <span className="cp-run__meta">
                {formatNumber(job.processedUsers)} of {formatNumber(job.totalUsers)} users · {formatNumber(job.updatedProfiles)} passed · {formatNumber(job.failedProfiles)} failed · {formatDuration(job.elapsedSeconds)}
              </span>
              <ProgressBar value={job.progress} label={`Progress of the sync of ${formatDateTime(job.startTime)}`} hideLabel tone={barTone(job.status)} size="sm" valueLabel={`${job.progress}%`} />
            </button>
            <Actions job={job} onOpen={setSelectedId} onCancel={onCancel} />
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="ui-table-wrap">
        <table className="ui-band-table cp-table">
          <caption className="ui-sr">Profile sync runs, newest first. Press a row to see its progress and failed profiles.</caption>
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Type</th>
              <th scope="col">Started</th>
              <th scope="col">Duration</th>
              <th scope="col" className="ui-num">
                Users
              </th>
              <th scope="col" className="ui-num">
                Passed
              </th>
              <th scope="col" className="ui-num">
                Failed
              </th>
              <th scope="col">Progress</th>
              <th scope="col">
                <span className="ui-sr">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="cp-clickable" onClick={() => setSelectedId(job.id)}>
                <td>
                  <SyncStatusBadge status={job.status} />
                </td>
                <td>
                  <Badge>{typeLabel(job)}</Badge>
                </td>
                <td>
                  <div className="ui-table__cell-text">
                    <span className="ui-table__title">{relativeTime(job.startTime)}</span>
                    <span className="ui-table__meta">{formatDateTime(job.startTime)}</span>
                  </div>
                </td>
                <td className="cp-figure">{formatDuration(job.elapsedSeconds)}</td>
                <td className="ui-num">
                  {formatNumber(job.processedUsers)}/{formatNumber(job.totalUsers)}
                </td>
                <td className="ui-num cp-passed">{formatNumber(job.updatedProfiles)}</td>
                <td className="ui-num cp-failed-count">{formatNumber(job.failedProfiles)}</td>
                <td className="cp-progress-cell">
                  <ProgressBar value={job.progress} label={`Progress of the sync of ${formatDateTime(job.startTime)}`} hideLabel tone={barTone(job.status)} size="sm" valueLabel={`${job.progress}%`} />
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <Actions job={job} onOpen={setSelectedId} onCancel={onCancel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="cp-section" aria-labelledby="cp-history-title">
      <header className="cp-section__head">
        <div>
          <h2 className="cp-section__title" id="cp-history-title">
            Profile sync runs
          </h2>
          <p className="cp-section__text">Every run, scheduled or manual. Press a run to see its progress and the profiles that failed.</p>
        </div>
      </header>
      {error && jobs.length > 0 ? (
        <Notice tone="danger" title="We could not refresh the history">
          {error} You are looking at the last list that loaded.
        </Notice>
      ) : null}
      {body}
      {!loading && jobs.length > 0 && total > 5 ? <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={setPageSize} sizes={[5, 10, 25]} /> : null}
    </section>
  );
}
