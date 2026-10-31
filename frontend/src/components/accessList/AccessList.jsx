import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { UsersThreeIcon } from '@phosphor-icons/react/dist/csr/UsersThree';
import { useAuth } from '../../contexts/AuthContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import { BulkBar, Button, Card, ConfirmDialog, EmptyState, Notice, Page, PageHeader, Pagination, SearchField, SelectField, SkeletonRows, StatGrid, StatTile, Toolbar, formatNumber, pluralize } from '../ui';
import AccessTable from './AccessTable';
import AddEmailsDrawer from './AddEmailsDrawer';
import useAccessList from './useAccessList';
import './accessList.css';

/**
 * Access control list (route /admin/access-list, admins only; teachers are refused even though
 * teachers can be on the list). The email addresses allowed to sign in when the server runs with
 * LOGIN_MODE=allowlist, whatever their domain. Taking an address off the list blocks that person
 * from their next request, including a person who already has an account. Admins are never blocked.
 *
 * design/screens.md section 16: a page header with the count, summary tiles, a filter row, the
 * table with pagination, a bulk bar for removing. Adding is a drawer (type, paste or upload a CSV).
 *
 * When the server is in domain mode the list is not used; the page says so and still lets the admin
 * prepare it, so nobody is locked out on the day the mode is switched.
 */
export default function AccessList() {
  const { user } = useAuth();
  const phone = useMediaQuery('(max-width: 899.95px)');
  const list = useAccessList();
  const { data, loading, error } = list;

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null); // entries waiting for confirmation
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [announcement, setAnnouncement] = useState('');
  const bodyRef = useRef(null);

  const entries = data.entries;
  const counts = data.counts;
  const firstLoad = loading && entries.length === 0 && !error;
  const domainMode = data.loginMode === 'domain';
  const listIsEmpty = !loading && !error && counts.total === 0;

  // Selections belong to the page that is shown: a new page, search or filter starts clean
  useEffect(() => {
    setSelected(new Set());
  }, [list.page, list.pageSize, list.role, list.query]);

  const selectedEntries = useMemo(() => entries.filter((entry) => selected.has(entry._id)), [entries, selected]);

  const toggle = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (checked) => setSelected(checked ? new Set(entries.map((entry) => entry._id)) : new Set());

  const keepFocusOnList = () => window.requestAnimationFrame(() => bodyRef.current && bodyRef.current.focus());

  const confirmRemove = async () => {
    setBusy(true);
    const ok = await list.remove(removing);
    setBusy(false);
    if (!ok) return;
    setAnnouncement(removing.length === 1 ? `${removing[0].email} was removed from the list` : `${removing.length} addresses were removed from the list`);
    setRemoving(null);
    setSelected(new Set());
    keepFocusOnList();
  };

  const confirmImport = async () => {
    setBusy(true);
    const result = await list.importExisting();
    setBusy(false);
    if (!result) return;
    setImporting(false);
    setAnnouncement(`${result.added} existing accounts were added to the list`);
  };

  // Only administrators manage the list
  if (user && user.userType !== 'admin') {
    return (
      <Page>
        <PageHeader title="Access control list" />
        <Card>
          <EmptyState icon={<LockIcon size={28} weight="regular" />} title="Access denied" text="Only administrators can manage who may sign in. Ask an administrator if you need access." />
        </Card>
      </Page>
    );
  }

  const removeTitle = removing && removing.length === 1 ? `Remove ${removing[0].email}?` : `Remove ${removing ? removing.length : 0} addresses?`;
  const removeAccounts = removing ? removing.filter((entry) => entry.account).length : 0;

  return (
    <Page className="acl">
      <PageHeader
        title="Access control list"
        count={firstLoad || error ? undefined : data.total === counts.total ? pluralize(counts.total, 'address', 'addresses') : `${formatNumber(data.total)} of ${pluralize(counts.total, 'address', 'addresses')}`}
        description="The email addresses that can sign in with Google, from any domain. Admins can always sign in."
        actions={
          <>
            <Button startIcon={<UsersThreeIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => setImporting(true)}>
              Add existing accounts
            </Button>
            <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setAdding(true)}>
              Add emails
            </Button>
          </>
        }
      />

      {domainMode ? (
        <Notice tone="warning" title="The list is not in use right now" className="acl-notice">
          The server is set to domain mode, so only college email addresses can sign in and this list is ignored. You can prepare it here. To use it, set LOGIN_MODE=allowlist in the backend .env file and restart the server.
        </Notice>
      ) : null}

      <StatGrid columns={3} label="Summary" className="acl-stats">
        <StatTile size="m" tone="spotlight" label="On the list" value={firstLoad ? '\u2013' : counts.total} context="Can sign in with Google" />
        <StatTile size="m" label="Students" value={firstLoad ? '\u2013' : counts.students} context="Regular accounts" />
        <StatTile size="m" label="Teachers" value={firstLoad ? '\u2013' : counts.teachers} context="Staff access on first sign-in" />
      </StatGrid>

      <Toolbar
        label="Filter the list"
        search={<SearchField value={list.query} onChange={list.setQuery} label="Search the list" placeholder="Search by email or note" />}
        end={
          list.filtering ? (
            <Button variant="ghost" onClick={list.clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      >
        <SelectField
          variant="pill"
          aria-label="Role"
          value={list.role}
          onChange={(event) => list.setRole(event.target.value)}
          options={[
            { value: 'all', label: 'All roles' },
            { value: 'student', label: 'Students' },
            { value: 'teacher', label: 'Teachers' },
          ]}
        />
      </Toolbar>

      <Card flush className="acl-card">
        <h2 className="ui-sr">Addresses</h2>
        <div ref={bodyRef} tabIndex={-1} className="acl-body" aria-busy={loading}>
          {firstLoad ? (
            <SkeletonRows count={6} height={phone ? 96 : 56} />
          ) : error && entries.length === 0 ? (
            <div className="acl-pad">
              <Notice
                tone="danger"
                title="We could not load the list"
                action={
                  <Button variant="ghost" size="sm" onClick={list.reload}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Notice>
            </div>
          ) : listIsEmpty ? (
            <EmptyState
              icon={<ShieldCheckIcon size={28} weight="regular" />}
              title="No addresses on the list yet"
              text={
                domainMode
                  ? 'Add the addresses now, then switch the server to allowlist mode.'
                  : 'Only admins can sign in until you add addresses. Add every account that exists today in one step, or add new people.'
              }
              action={
                <>
                  <Button onClick={() => setImporting(true)}>Add existing accounts</Button>
                  <Button variant="primary" onClick={() => setAdding(true)}>
                    Add emails
                  </Button>
                </>
              }
            />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<MagnifyingGlassIcon size={28} weight="regular" />}
              title="No addresses match these filters"
              text="Try a different search, or show everyone again."
              action={<Button onClick={list.clearFilters}>Clear filters</Button>}
            />
          ) : (
            <AccessTable entries={entries} phone={phone} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onRole={list.changeRole} onRemove={(entry) => setRemoving([entry])} />
          )}
        </div>

        {!firstLoad && !error && data.total > 0 ? <Pagination page={list.page} pageSize={list.pageSize} total={data.total} onPage={list.setPage} onPageSize={list.setPageSize} sizes={[25, 50, 100]} /> : null}
      </Card>

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button variant="danger" size="sm" onClick={() => setRemoving(selectedEntries)}>
          Remove from the list
        </Button>
      </BulkBar>

      <p className="ui-sr" role="status" aria-live="polite">
        {announcement}
      </p>

      {adding ? <AddEmailsDrawer onClose={() => setAdding(false)} onAdded={() => list.reload()} /> : null}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => !busy && setRemoving(null)}
        busy={busy}
        danger
        title={removeTitle}
        description={
          removeAccounts > 0
            ? `${pluralize(removeAccounts, 'of them has an account', 'of them have accounts')}. They are blocked on their next request and signed out of live sessions. Their data is kept, and adding the address again gives access back.`
            : 'They will not be able to sign in. Adding the address again lets them in.'
        }
        confirmLabel={removing && removing.length === 1 ? 'Remove address' : 'Remove addresses'}
        onConfirm={confirmRemove}
      />

      <ConfirmDialog
        open={importing}
        onClose={() => !busy && setImporting(false)}
        busy={busy}
        title="Add every existing account?"
        description="Every student and teacher who already has an account is added to the list, so nobody is locked out when you switch to allowlist mode. Addresses already on the list are left as they are. Admins are never checked, so they are not added."
        confirmLabel="Add existing accounts"
        onConfirm={confirmImport}
      />
    </Page>
  );
}
