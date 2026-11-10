import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { FunnelSimpleIcon } from '@phosphor-icons/react/dist/csr/FunnelSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import useMediaQuery from '../../hooks/useMediaQuery';
import { AdminTop, Button, Card, ConfirmDialog, EmptyState, Notice, Page, Pagination, SearchField, SelectField, SkeletonRows, pluralize } from '../ui';
import OpportunityDrawer from './OpportunityDrawer';
import OpportunityTable from './OpportunityTable';
import { CATEGORIES, STATUSES, categoryLabel, matches, sortOpportunities, statusLabel } from './opportunityModel';
import useOpportunities from './useOpportunities';
import './opportunityManagement.css';

/**
 * Opportunity management (routes /opportunity-management and /admin/opportunities, admins only).
 *
 * A table page (design/screens.md section 16): the header with the count and the primary action,
 * a filter row, the table (rows on a phone) and pagination. A row opens a drawer to edit the
 * opportunity; deleting asks first and names it.
 */
export default function OpportunityManagement() {
  const mobile = useMediaQuery('(max-width: 899.95px)');
  const { opportunities, loading, failed, reload, save, remove } = useOpportunities();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [registration, setRegistration] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // The drawer: { nonce, opportunity } while open (a new nonce gives it a fresh form)
  const [drawer, setDrawer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtering = Boolean(search.trim() || category || status || registration);

  const visible = useMemo(
    () => sortOpportunities(opportunities.filter((item) => matches(item, { search, category, status, registration })), sort),
    [opportunities, search, category, status, registration, sort]
  );

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);
  const rows = visible.slice((current - 1) * pageSize, current * pageSize);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const filterBy = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setRegistration('');
    setPage(1);
  };

  const onSort = (key) => {
    setSort((previous) => (previous.key === key ? { key, dir: previous.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const openDrawer = (opportunity = null) => setDrawer({ nonce: Date.now(), opportunity });

  const onSave = async (form) => {
    setSaving(true);
    const saved = await save(form, drawer.opportunity ? drawer.opportunity._id : undefined);
    setSaving(false);
    if (saved) setDrawer(null);
  };

  const onConfirmDelete = async () => {
    setDeleting(true);
    const removed = await remove(toDelete._id);
    setDeleting(false);
    if (removed) {
      setToDelete(null);
      setDrawer(null);
    }
  };

  const activeFilters = [
    category ? categoryLabel(category).toLowerCase() : null,
    status ? statusLabel(status).toLowerCase() : null,
    registration ? `registration ${registration}` : null,
    search.trim() ? `\u201c${search.trim()}\u201d` : null,
  ].filter(Boolean);

  const addButton = (
    <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => openDrawer()}>
      Add opportunity
    </Button>
  );

  const retry = (
    <Button variant="ghost" size="sm" onClick={reload}>
      Retry
    </Button>
  );

  let body;
  if (loading) {
    body = (
      <Card flush className="om-card" aria-busy="true" aria-label="Opportunities">
        <SkeletonRows count={7} height={mobile ? 64 : 48} />
      </Card>
    );
  } else if (failed && opportunities.length === 0) {
    body = (
      <Card className="om-card">
        <Notice tone="danger" title="We could not load the opportunities" action={retry}>
          Check your connection and try again. Nothing was changed.
        </Notice>
      </Card>
    );
  } else {
    body = (
      <Card flush className="om-card" aria-label="Opportunities">
        {failed ? (
          <div className="om-notice">
            <Notice tone="danger" title="We could not refresh the list" action={retry}>
              You are looking at the last list that loaded.
            </Notice>
          </div>
        ) : null}

        {opportunities.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon size={28} weight="regular" />}
            title="No opportunities yet"
            text="Add the first hackathon, internship or competition and students will see it on their Opportunities page."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<FunnelSimpleIcon size={28} weight="regular" />}
            title="No opportunities match"
            text={`Nothing matches ${activeFilters.join(', ')}. Try a broader search.`}
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <OpportunityTable opportunities={rows} mobile={mobile} sort={sort} onSort={onSort} onOpen={openDrawer} onDelete={setToDelete} />
            <Pagination
              page={current}
              pageSize={pageSize}
              total={visible.length}
              onPage={setPage}
              onPageSize={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              sizes={[10, 25, 50]}
            />
          </>
        )}
      </Card>
    );
  }

  return (
    <Page className="om-page">
      <AdminTop
        title="Opportunity management"
        count={!loading && opportunities.length > 0 ? pluralize(opportunities.length, 'opportunity', 'opportunities') : undefined}
        description="Add, edit and remove hackathons, internships and competitions."
        actions={addButton}
        label="Search and filter opportunities"
        search={
          (
            <SearchField
              value={search}
              onChange={(text) => {
                setSearch(text);
                setPage(1);
              }}
              placeholder="Search by title, description or organizer"
              label="Search opportunities"
            />
          )
        }
        filters={
          (
            <>
              <SelectField variant="pill" aria-label="Filter by category" value={category} onChange={filterBy(setCategory)} options={[{ value: '', label: 'Any category' }, ...CATEGORIES]} />
              <SelectField variant="pill" aria-label="Filter by status" value={status} onChange={filterBy(setStatus)} options={[{ value: '', label: 'Any status' }, ...STATUSES]} />
              <SelectField
                variant="pill"
                aria-label="Filter by registration"
                value={registration}
                onChange={filterBy(setRegistration)}
                options={[
                  { value: '', label: 'Any registration' },
                  { value: 'open', label: 'Registration open' },
                  { value: 'closed', label: 'Registration closed' },
                ]}
              />
              {filtering ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null}
            </>
          )
        }
      />
      <p className="ui-sr" aria-live="polite">
        {!loading && opportunities.length > 0 ? `${pluralize(visible.length, 'opportunity', 'opportunities')} shown` : ''}
      </p>

      {body}

      {drawer ? (
        <OpportunityDrawer
          key={drawer.nonce}
          opportunity={drawer.opportunity}
          saving={saving}
          locked={Boolean(toDelete)}
          onClose={() => setDrawer(null)}
          onSave={onSave}
          onDelete={setToDelete}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this opportunity?"
        description={toDelete ? `\u201c${toDelete.title}\u201d will disappear from the Opportunities page for every student, along with its registrations. This cannot be undone.` : ''}
        confirmLabel="Delete opportunity"
        danger
        busy={deleting}
        onConfirm={onConfirmDelete}
      />
    </Page>
  );
}
