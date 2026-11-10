import React from 'react';
import { toast } from 'react-toastify';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { ProhibitIcon } from '@phosphor-icons/react/dist/csr/Prohibit';
import { Badge, Button, DetailPanel, IconButton, Notice, Skeleton, formatDateTime, formatNumber } from '../ui';
import { ProgressBar } from '../custom-components';
import SyncStatusBadge from './SyncStatusBadge';
import { barTone, failedProfilesCsv, formatDuration, platformLabel, platformUrl } from './syncModel';

/** The failed profiles of a run: who, on which platform, and what went wrong */
function FailedList({ rows }) {
  return (
    <ul className="cp-failed" aria-label="Failed profiles">
      {rows.map((row, index) => {
        const url = platformUrl(row.platform, row.platformUsername);
        return (
          <li key={`${row.userId}-${row.platform}-${index}`} className="cp-failed__row">
            <div className="cp-failed__text">
              <span className="cp-failed__name">{row.userName || 'Unknown student'}</span>
              <span className="cp-failed__who">
                <Badge>{platformLabel(row.platform)}</Badge>
                <span className="cp-failed__user">{row.platformUsername}</span>
              </span>
              <span className="cp-failed__error">
                {row.errorCode ? `[${row.errorCode}] ` : ''}
                {row.error || 'Unknown error'}
              </span>
            </div>
            {url ? (
              <IconButton label={`Open ${row.platformUsername} on ${platformLabel(row.platform)}`} size="sm" tone="plain" href={url} target="_blank" rel="noopener noreferrer">
                <ArrowSquareOutIcon size={20} weight="regular" aria-hidden="true" />
              </IconButton>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Downloads the failed profiles of a run as a CSV */
function exportFailed(detail) {
  const rows = detail.failedProfilesList || [];
  if (rows.length === 0) {
    toast.warning('No failed profiles to export');
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([failedProfilesCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  link.download = `Failed_Profiles_${new Date(detail.startTime).toISOString().split('T')[0]}_${detail.id}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  toast.success(`Exported ${rows.length} failed profile(s)`);
}

/**
 * One run in detail, in the kit's DetailPanel (it only shows, so its header is the plain one): the
 * state, the progress, users processed, passed and failed, and the profiles that failed with a CSV
 * export. While the run is going the hook refreshes it every 2 seconds, and Cancel is offered.
 *
 *   sync          the result of useProfileSync (selectedId, detail, detailError)
 *   onCancel(id)  asks to cancel this run (the page owns the confirmation)
 */
export default function SyncDetail({ sync, onCancel }) {
  const { selectedId, setSelectedId, detail, detailError } = sync;
  const open = Boolean(selectedId);
  const close = () => setSelectedId(null);
  const failed = detail ? detail.failedProfilesList || [] : [];

  if (!detail) {
    return (
      <DetailPanel open={open} onClose={close} title="Sync details" width="lg" footer={<Button onClick={close}>Close</Button>}>
        {detailError ? (
          <Notice tone="danger" title="We could not load this sync">
            {detailError}
          </Notice>
        ) : (
          <div className="cp-detail-loading" aria-busy="true" aria-label="Loading the sync">
            <Skeleton height={24} width="40%" />
            <Skeleton height={64} radius="var(--ds-radius-lg)" />
            <Skeleton height={120} radius="var(--ds-radius-lg)" />
          </div>
        )}
      </DetailPanel>
    );
  }

  const preparing = detail.inProgress && detail.totalUsers === 0;

  return (
    <DetailPanel
      open={open}
      onClose={close}
      width="lg"
      title="Sync details"
      subtitle={`${detail.jobType === 'scheduled' ? 'Scheduled' : 'Manual'} run started ${formatDateTime(detail.startTime)}${detail.triggeredBy?.name ? ` by ${detail.triggeredBy.name}` : ''}`}
      badges={<SyncStatusBadge status={detail.status} />}
      figures={[
        { label: 'Users processed', value: `${formatNumber(detail.processedUsers)}/${formatNumber(detail.totalUsers)}` },
        { label: 'Profiles passed', value: formatNumber(detail.updatedProfiles) },
        { label: 'Profiles failed', value: formatNumber(detail.failedProfiles) },
      ]}
      facts={[{ label: 'Elapsed', value: formatDuration(detail.elapsedSeconds) }]}
      sections={[
        {
          key: 'progress',
          title: 'Progress',
          content: (
            <div className="cp-detail-progress">
              <ProgressBar
                value={detail.progress}
                label="Progress of this sync"
                hideLabel
                tone={barTone(detail.status)}
                valueLabel={`${detail.progress}% complete${preparing ? ' (preparing)' : ''}`}
              />
              {detail.error && detail.status !== 'completed' ? (
                <Notice tone={detail.status === 'cancelled' ? 'warning' : 'danger'}>{detail.error}</Notice>
              ) : null}
            </div>
          ),
        },
        {
          key: 'failed',
          title: `Failed profiles (${formatNumber(failed.length)})`,
          content: failed.length === 0 ? <Notice tone="success">No failed profiles in this sync.</Notice> : <FailedList rows={failed} />,
        },
      ]}
      footer={
        <>
          {failed.length > 0 ? (
            <Button startIcon={<DownloadSimpleIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => exportFailed(detail)}>
              Export failed profiles
            </Button>
          ) : null}
          {detail.inProgress ? (
            <Button variant="danger" startIcon={<ProhibitIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => onCancel(detail.id)}>
              Cancel sync
            </Button>
          ) : null}
          <Button onClick={close}>Close</Button>
        </>
      }
    />
  );
}
