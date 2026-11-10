import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import useAutoHideScrollbars from '../../hooks/useAutoHideScrollbars';
import { adminDashboardApi, dashboardErrorMessage } from '../../services/adminDashboardApi';
import { AdminTop, Button, Page, PillTabs } from '../ui';
import './adminDashboard.css';
import { exportLeaderboard } from './export/exportLeaderboard';
import useAnalytics from './hooks/useAnalytics';
import useRemote from './hooks/useRemote';
import OverviewView from './views/OverviewView';
import PerformanceView from './views/PerformanceView';
import PlatformsView from './views/PlatformsView';
import RegistrationsView from './views/RegistrationsView';
import StudentsView from './views/StudentsView';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'performance', label: 'Performance' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'students', label: 'Students' },
];

/**
 * Admin dashboard (routes /admin and /admin/dashboard, admins and teachers): how the platform is
 * used and how its students perform. It has the fixed admin top (AdminTop: the title, a one-line
 * tagline, Refresh and "Export leaderboard", and the five views as pills at the left because the
 * screen has no search) and one view at a time:
 *
 *   Overview       users, problems, departments and platforms (/api/admin/stats)
 *   Registrations  students who joined per day, week, month or department
 *   Performance    the selected students' scores, changes over a period, groups and leaders
 *   Platforms      the six platforms compared, and one in detail
 *   Students       every student with their numbers, sortable and searchable
 *
 * The last three share the filters of /api/admin/analytics (department, graduating year, section and
 * period). Each view loads only when it is open. The charts are the custom components, the tiles and
 * tables are the kit, and nothing uses Material UI. design/screens.md sections 15 and 16.
 */
export default function AdminDashboard() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const [tab, setTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  const stats = useRemote((signal) => adminDashboardApi.stats({ signal }), [], tab === 'overview', dashboardErrorMessage);
  const registrations = useRemote((signal) => adminDashboardApi.registrations({ signal }), [], tab === 'registrations', dashboardErrorMessage);
  const analytics = useAnalytics({ overviewOn: tab === 'performance' || tab === 'platforms', studentsOn: tab === 'students' });

  const refresh = () => {
    if (tab === 'overview') stats.reload();
    else if (tab === 'registrations') registrations.reload();
    else if (tab === 'students') analytics.students.reload();
    else analytics.overview.reload();
    toast.success('Dashboard data refreshed');
  };

  const exportToExcel = async () => {
    setExporting(true);
    toast.info('Preparing data for export...', { autoClose: 2000 });
    try {
      await exportLeaderboard();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page className="ad">
      <AdminTop
        title="Admin dashboard"
        description="Users, departments and how students perform on every platform."
        actions={
          <>
            <Button startIcon={<ArrowsClockwiseIcon size={18} weight="regular" aria-hidden="true" />} onClick={refresh}>
              Refresh
            </Button>
            <Button variant="spotlight" startIcon={<DownloadSimpleIcon size={18} weight="regular" aria-hidden="true" />} loading={exporting} onClick={exportToExcel}>
              Export leaderboard
            </Button>
          </>
        }
        label="Dashboard views"
        filters={<PillTabs items={TABS} value={tab} onChange={setTab} label="Dashboard views" idPrefix="ad" />}
      />

      <div role="tabpanel" id={`ad-panel-${tab}`} aria-labelledby={`ad-tab-${tab}`}>
        {tab === 'overview' ? <OverviewView remote={stats} /> : null}
        {tab === 'registrations' ? <RegistrationsView remote={registrations} /> : null}
        {tab === 'performance' ? <PerformanceView analytics={analytics} /> : null}
        {tab === 'platforms' ? <PlatformsView analytics={analytics} /> : null}
        {tab === 'students' ? <StudentsView analytics={analytics} /> : null}
      </div>
    </Page>
  );
}
