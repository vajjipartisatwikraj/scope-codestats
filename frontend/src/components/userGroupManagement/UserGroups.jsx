import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { UsersThreeIcon } from '@phosphor-icons/react/dist/csr/UsersThree';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import { AdminCardGrid, AdminTop, Button, Card, EmptyState, Notice, Page, SearchField, SelectField, pluralize } from '../ui';
import useAutoHideScrollbars from '../../hooks/useAutoHideScrollbars';
import './userGroups.css';
import CreateGroupDrawer from './CreateGroupDrawer';
import DeleteGroupDialogs from './DeleteGroupDialogs';
import EditGroupDrawer from './EditGroupDrawer';
import GroupCard, { GroupCardSkeleton } from './GroupCard';

const SKELETON_CARDS = 6;

const USAGE = [
  { value: 'all', label: 'All groups' },
  { value: 'used', label: 'In use' },
  { value: 'unused', label: 'Not attached' },
];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A to Z' },
  { value: 'size', label: 'Most roll numbers' },
];

const inUse = (group) => (group.cohortCount || 0) + (group.testCount || 0) > 0;

/**
 * User groups (route /admin/user-groups, admins and teachers): named lists of roll numbers,
 * uploaded as a CSV or pasted. Attach a group to a cohort or a communication test (their
 * "User groups" buttons) to make its students eligible for it.
 *
 * The page has the fixed top every admin screen has (AdminTop: the heading with its tagline and the
 * Create button, then the search at the left and the dropdowns at the right) and a card per group.
 * A card shows the roll number count and what uses the group; its Manage button opens the group's
 * own page (UserGroupPage: students, adding roll numbers, where it is used), and its three dots
 * offer Edit (a drawer) and Delete (a dialog that names the consequence). The page works on a phone.
 * With no groups yet it explains what a group is and offers the one action to start.
 */
export default function UserGroups() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [usage, setUsage] = useState('all');
  const [sort, setSort] = useState('newest');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await userGroupApi.list();
      setGroups(data.userGroups || []);
      setError('');
    } catch (failure) {
      const message = apiErrorMessage(failure, 'Could not load the user groups');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    load();
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = groups.filter((group) => {
      if (usage === 'used' && !inUse(group)) return false;
      if (usage === 'unused' && inUse(group)) return false;
      if (!term) return true;
      return group.name.toLowerCase().includes(term) || (group.description || '').toLowerCase().includes(term);
    });
    if (sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'size') return [...list].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    return list; // the server sends the newest first
  }, [groups, search, usage, sort]);

  const empty = !loading && !error && groups.length === 0;
  const filtered = search.trim() !== '' || usage !== 'all';

  const clearFilters = () => {
    setSearch('');
    setUsage('all');
  };

  const createButton = (
    <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setCreating(true)}>
      Create user group
    </Button>
  );

  let body;
  if (loading) {
    body = (
      <div className="ui-grid" role="status" aria-label="Loading user groups">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <GroupCardSkeleton key={index} />
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <Notice
        tone="danger"
        title="We could not load the user groups"
        action={
          <Button variant="ghost" size="sm" onClick={retry}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (empty) {
    // First use: say what a group is for and how it reaches students, with the one action to start
    body = (
      <Card className="ug-first">
        <EmptyState
          icon={<UsersThreeIcon size={28} weight="regular" />}
          title="Create your first user group"
          text="A user group is a named list of roll numbers. Make it once, then reuse it wherever you need to choose who gets in."
        />
        <ol className="ug-steps" aria-label="How user groups work">
          <li className="ug-step">
            <span className="ug-step__number" aria-hidden="true">
              1
            </span>
            <span className="ug-step__text">
              <strong>Upload roll numbers</strong>
              <span>Upload a CSV or paste them.</span>
            </span>
          </li>
          <li className="ug-step">
            <span className="ug-step__number" aria-hidden="true">
              2
            </span>
            <span className="ug-step__text">
              <strong>Attach the group</strong>
              <span>Use the &quot;User groups&quot; button of a cohort or communication test.</span>
            </span>
          </li>
          <li className="ug-step">
            <span className="ug-step__number" aria-hidden="true">
              3
            </span>
            <span className="ug-step__text">
              <strong>Students get access</strong>
              <span>Those with an account see it now; the rest once they register.</span>
            </span>
          </li>
        </ol>
      </Card>
    );
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No user groups match"
        text={search.trim() ? `Nothing fits \u201c${search.trim()}\u201d with these filters. Try a different search.` : 'No group fits these filters.'}
        action={
          filtered ? (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      />
    );
  } else {
    body = (
      <AdminCardGrid label="User groups">
        {visible.map((group) => (
          <GroupCard key={group._id} group={group} onEdit={setEditing} onDelete={setDeleting} />
        ))}
      </AdminCardGrid>
    );
  }

  return (
    <Page className="ug">
      <AdminTop
        title="User groups"
        count={!loading && !error && groups.length > 0 ? pluralize(groups.length, 'group') : undefined}
        description="Named lists of roll numbers that choose who can join a cohort or test."
        actions={createButton}
        label="Search and filter user groups"
        search={<SearchField value={search} onChange={setSearch} placeholder="Search user groups" label="Search user groups by name or description" />}
        filters={
          <>
            <SelectField variant="pill" aria-label="Show groups" value={usage} onChange={(event) => setUsage(event.target.value)} options={USAGE} />
            <SelectField variant="pill" aria-label="Sort groups" value={sort} onChange={(event) => setSort(event.target.value)} options={SORTS} />
          </>
        }
      />

      {body}

      {creating ? <CreateGroupDrawer onCreated={load} onClose={() => setCreating(false)} /> : null}
      {editing ? <EditGroupDrawer key={editing._id} group={editing} onSaved={load} onClose={() => setEditing(null)} /> : null}
      <DeleteGroupDialogs group={deleting} onClose={() => setDeleting(null)} onDeleted={load} />
    </Page>
  );
}
