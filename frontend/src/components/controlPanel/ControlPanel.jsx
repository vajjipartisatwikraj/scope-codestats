import React, { useState } from 'react';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { useAuth } from '../../contexts/AuthContext';
import useAutoHideScrollbars from '../../hooks/useAutoHideScrollbars';
import useMediaQuery from '../../hooks/useMediaQuery';
import { AdminTop, Button, Card, ConfirmDialog, EmptyState, Page, PageHeader } from '../ui';
import './controlPanel.css';
import RankingsSection from './RankingsSection';
import SyncDetail from './SyncDetail';
import SyncHistory from './SyncHistory';
import SyncTiles from './SyncTiles';
import useProfileSync from './useProfileSync';
import useRankings from './useRankings';

/**
 * Control panel (route /admin/control-panel, admins only): the controls of the platform's background
 * work. Today that is the profile sync (the nightly run that reads every student's coding platforms,
 * and the runs an admin starts by hand) and the calculation of scores and ranks that follows it.
 *
 * It has the fixed admin top (AdminTop: the title, a one-line tagline, and "Run profile sync" as the
 * one primary action; there is no search), then the next sync and the totals of the last 30 days as
 * tiles, the runs of the sync as a band table, and the latest rank calculations. A run opens in a
 * panel from the right with its progress and the profiles that failed. Cancelling a run asks first.
 * Nothing here uses Material UI. design/screens.md sections 15 and 16.
 */
export default function ControlPanel() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const { user, token } = useAuth();
  const compact = useMediaQuery('(max-width: 899.95px)');
  const sync = useProfileSync(token);
  const rankings = useRankings(token);
  const [cancelId, setCancelId] = useState(null);

  // Only administrators open this page
  if (user && user.userType !== 'admin') {
    return (
      <Page>
        <PageHeader title="Control panel" />
        <Card>
          <EmptyState icon={<LockIcon size={28} weight="regular" />} title="Access denied" text="Only administrators can run the profile sync. Ask an administrator if you need access." />
        </Card>
      </Page>
    );
  }

  const refreshAll = () => {
    sync.refresh();
    rankings.load();
  };

  const confirmCancel = async () => {
    await sync.cancel(cancelId);
    setCancelId(null);
  };

  return (
    <Page className="cp">
      <AdminTop
        title="Control panel"
        description="Run the profile sync and recalculate scores and ranks."
        actions={
          <>
            <Button startIcon={<ArrowsClockwiseIcon size={18} weight="regular" aria-hidden="true" />} onClick={refreshAll}>
              Refresh
            </Button>
            <Button
              variant="primary"
              startIcon={<PlayIcon size={18} weight="fill" aria-hidden="true" />}
              loading={sync.starting}
              disabled={sync.hasRunning}
              onClick={sync.start}
              title={sync.hasRunning ? 'A profile sync is already running' : undefined}
            >
              {sync.hasRunning ? 'Sync running' : 'Run profile sync'}
            </Button>
          </>
        }
      />

      <SyncTiles stats={sync.stats} />
      <SyncHistory sync={sync} compact={compact} onCancel={setCancelId} />
      <RankingsSection rankings={rankings} compact={compact} />

      <SyncDetail sync={sync} onCancel={setCancelId} />

      <ConfirmDialog
        open={Boolean(cancelId)}
        onClose={() => !sync.cancelling && setCancelId(null)}
        busy={sync.cancelling}
        danger
        title="Cancel this sync?"
        description="The sync stops after the profiles it is working on. Profiles already updated keep their new stats."
        confirmLabel="Cancel sync"
        onConfirm={confirmCancel}
      />
    </Page>
  );
}
