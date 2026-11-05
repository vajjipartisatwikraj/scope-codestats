import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { Button, EmptyState, Notice, Page, PageHeader, PillTabs, SearchField, Toolbar, formatNumber, pluralize } from '../../../ui';
import { ScrollRow } from '../../../custom-components';
import { useAuth } from '../../../../contexts/AuthContext';
import useAutoHideScrollbars from '../../../../hooks/useAutoHideScrollbars';
import useMediaQuery from '../../../../hooks/useMediaQuery';
import useStuck from '../../../../hooks/useStuck';
import AttachedUserGroupsDialog from '../../../userGroupManagement/AttachedUserGroupsDialog';
import { cohortUserGroupApi } from '../../../../services/userGroupApi';
import { CohortCardSkeleton } from '../../student/list/card/CohortCard';
import AdminCohortCard from './card/AdminCohortCard';
import DeleteCohortDialog from './dialogs/DeleteCohortDialog';
import DuplicateDialog from './dialogs/DuplicateDialog';
import CohortFormDrawer from './form/CohortFormDrawer';
import useAdminCohorts from './hooks/useAdminCohorts';
import useCohortReviews from './hooks/useCohortReviews';
import useDeletionImpact from './hooks/useDeletionImpact';
import { TABS, groupAdminCohorts, inTab, matchesSearch } from './model/cohortAdmin';
import ReviewsPanel from './reviews/ReviewsPanel';
import '../../student/list/filters/cohortFilters.css';
import '../../student/list/cohorts.css';
import './cohortManagement.css';

const SKELETON_CARDS = 6;
// The fixed navbar covers the top 64px of the window (Navbar.css)
const NAVBAR_HEIGHT = 64;

const EMPTY = {
  all: { title: 'No cohorts yet', text: 'Create a cohort to get started.' },
  active: { title: 'No active cohorts', text: 'Published cohorts that are switched on show up here.' },
  drafts: { title: 'No drafts', text: 'Cohorts that are not published yet show up here.' },
};

/**
 * The staff cohort dashboard (route /admin/cohorts, for admins and teachers): the heading and the
 * Create cohort button, the tabs (All cohorts, Active, Drafts, Reviews), a search, and the cohorts as
 * the same cards students see, with the staff actions on them. Forms and questions open in a drawer
 * and a dialog; deleting asks first and says what goes with the cohort. It follows design/screens.md
 * section 8 (admin cohort management) and works on a phone.
 *
 * The folder is organised by job: card/ (one cohort), form/ (create and edit), dialogs/ (delete and
 * duplicate), reviews/ (the Reviews tab), hooks/ (data and actions), api/ (every request), model/
 * (rules, no React). Teachers manage cohorts and attach user groups; they do not create, edit,
 * duplicate or delete.
 */
export default function CohortManagementPage() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const [topMarker, stuck] = useStuck(NAVBAR_HEIGHT);
  const navigate = useNavigate();
  const { user } = useAuth();
  const mobile = useMediaQuery('(max-width: 899.95px)');
  const canEdit = user?.userType !== 'teacher';

  const data = useAdminCohorts();
  const reviews = useCohortReviews();
  const impact = useDeletionImpact();
  const { cohorts, loading, failed, reload } = data;

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(null); // { nonce, cohort } while open (a new nonce gives the form a fresh start)
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [groupsCohort, setGroupsCohort] = useState(null);

  const counts = useMemo(() => ({ all: cohorts.length, active: cohorts.filter((c) => inTab(c, 'active')).length, drafts: cohorts.filter((c) => inTab(c, 'drafts')).length }), [cohorts]);
  const visible = useMemo(() => cohorts.filter((cohort) => inTab(cohort, tab) && matchesSearch(cohort, search)), [cohorts, tab, search]);
  const sections = useMemo(() => groupAdminCohorts(visible), [visible]);

  const openDrawer = (cohort = null) => setDrawer({ nonce: Date.now(), cohort });

  const save = async (form, extras) => {
    setSaving(true);
    const { ok, cohort } = await data.save(form, drawer.cohort ? drawer.cohort._id : undefined, extras);
    setSaving(false);
    if (!ok) return;
    setDrawer(null);
    // A cohort made with a bank from the library: its page shows the import while it runs
    if (cohort && extras?.importBank) navigate(`/admin/cohorts/${cohort._id}`);
  };

  const askDelete = (cohort) => {
    setToDelete(cohort);
    impact.clear();
    impact.check(cohort);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const result = await data.remove(toDelete);
    setDeleting(false);
    if (result === 'ok') setToDelete(null);
    // Someone may have attached a group meanwhile
    else if (result === 'attached') impact.check(toDelete);
  };

  // After user groups were attached or detached: the counts on the cards, and the delete check if it is open
  const groupsChanged = () => {
    reload();
    if (toDelete) impact.check(toDelete);
  };

  const tabItems = TABS.map((entry) => ({
    key: entry.key,
    label: (
      <>
        {entry.label}
        {!loading && entry.key !== 'reviews' ? <span className="chf-count">{counts[entry.key]}</span> : null}
      </>
    ),
  }));

  const createButton = canEdit ? (
    <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => openDrawer()}>
      Create cohort
    </Button>
  ) : null;

  let list;
  if (loading) {
    list = (
      <div role="status" aria-label="Loading cohorts">
        <ScrollRow label="Loading cohorts">
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <li key={index}>
              <CohortCardSkeleton />
            </li>
          ))}
        </ScrollRow>
      </div>
    );
  } else if (failed && cohorts.length === 0) {
    list = (
      <Notice
        tone="danger"
        title="Cohorts did not load"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        Check your connection and try again.
      </Notice>
    );
  } else if (visible.length === 0 && search.trim()) {
    list = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No cohorts match"
        text={`Nothing fits \u201c${search.trim()}\u201d. Try a different search.`}
        action={
          <Button variant="secondary" onClick={() => setSearch('')}>
            Clear search
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    list = <EmptyState icon={<StackIcon size={28} weight="regular" />} title={EMPTY[tab].title} text={EMPTY[tab].text} action={tab === 'all' ? createButton : undefined} />;
  } else {
    list = (
      <div className="chl-sections">
        {sections.map((section) => (
          <section key={section.key} aria-labelledby={`cmg-${section.key}-title`}>
            <header className="chl-section__head">
              <h2 className="chl-section__title" id={`cmg-${section.key}-title`}>
                {section.title}
              </h2>
              <span className="chl-section__count" aria-label={pluralize(section.cohorts.length, 'cohort')}>
                {formatNumber(section.cohorts.length)}
              </span>
              <p className="chl-section__caption">{section.caption}</p>
            </header>
            <ScrollRow label={section.title}>
              {section.cohorts.map((cohort) => (
                <li key={cohort._id}>
                  <AdminCohortCard
                    cohort={cohort}
                    canEdit={canEdit}
                    busy={loading || Boolean(data.duplicating)}
                    exporting={data.exportingId === cohort._id}
                    onEdit={openDrawer}
                    onDelete={askDelete}
                    onDuplicate={data.duplicate}
                    onExport={data.exportReport}
                    onUserGroups={setGroupsCohort}
                    onManage={(target) => navigate(`/admin/cohorts/${target._id}`)}
                  />
                </li>
              ))}
            </ScrollRow>
          </section>
        ))}
      </div>
    );
  }

  return (
    <Page className="cmg chl">
      <div ref={topMarker} className="chl-marker" aria-hidden="true" />
      {/* The heading and the search with the tabs stay in place while the cohorts scroll */}
      <div className="chl-top" data-stuck={stuck ? 'true' : 'false'}>
        <PageHeader
          title="Cohort management"
          count={!loading && cohorts.length > 0 ? pluralize(cohorts.length, 'cohort') : undefined}
          description="Create and manage programming cohorts with modules, learning paths and problem sets."
          actions={createButton}
        />
        <Toolbar className="chf" label="Search and views" search={tab === 'reviews' ? undefined : <SearchField value={search} onChange={setSearch} placeholder="Search cohorts" label="Search cohorts by title or description" />}>
          <PillTabs items={tabItems} value={tab} onChange={setTab} label="Cohort views" idPrefix="cmg" />
        </Toolbar>
      </div>

      <div role="tabpanel" id={`cmg-panel-${tab}`} aria-labelledby={`cmg-tab-${tab}`}>
        {tab === 'reviews' ? <ReviewsPanel cohorts={cohorts} data={reviews} mobile={mobile} /> : list}
      </div>

      {drawer ? <CohortFormDrawer key={drawer.nonce} cohort={drawer.cohort} saving={saving} onClose={() => setDrawer(null)} onSave={save} /> : null}

      <DeleteCohortDialog
        cohort={toDelete}
        impact={impact.impact}
        checking={impact.loading}
        deleting={deleting}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        onDetach={() => setGroupsCohort(toDelete)}
      />

      <DuplicateDialog progress={data.duplicating} />

      {/* The user groups attached to a cohort decide who is eligible */}
      <AttachedUserGroupsDialog open={Boolean(groupsCohort)} target={groupsCohort} api={cohortUserGroupApi} entityLabel="cohort" onClose={() => setGroupsCohort(null)} onChanged={groupsChanged} />
    </Page>
  );
}
