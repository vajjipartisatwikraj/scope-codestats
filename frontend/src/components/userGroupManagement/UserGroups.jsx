import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Button, Card, ConfirmDialog, Dialog, Page, PageHeader } from '../ui';
import './userGroups.css';
import CreateGroupDrawer from './CreateGroupDrawer';
import GroupDetails from './GroupDetails';
import GroupList from './GroupList';

/**
 * User groups (route /admin/user-groups, admins and teachers): named lists of roll numbers,
 * uploaded as a CSV or pasted. Attach a group to a cohort or a communication test (their
 * "User groups" buttons) to make its students eligible for it.
 *
 * design/screens.md section 16: two panes. The groups are at the left; the selected group is at the
 * right, with its numbers, its roll number field and the students in it. Below 900px the panes
 * become two screens: the list, then the group, with a button back to the list.
 *
 * Creating a group is a drawer (longer form). Deleting is a dialog that names the group and the
 * consequence; a group that is still attached to cohorts or tests cannot be deleted, and the dialog
 * lists them instead.
 */
export default function UserGroups() {
  const wide = useMediaQuery('(min-width: 900px)');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null); // the group being deleted
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteBlockedBy, setDeleteBlockedBy] = useState([]); // cohorts and tests that still use it
  const detailRef = useRef(null);

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
    if (!term) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(term) || (g.description || '').toLowerCase().includes(term));
  }, [groups, search]);

  // Wide: the right pane always shows a group. Phone: no group means the list.
  useEffect(() => {
    if (loading || error) return;
    const exists = groups.some((group) => group._id === selectedId);
    if (selectedId && !exists) setSelectedId(null);
    else if (!selectedId && wide && groups.length > 0) setSelectedId(groups[0]._id);
  }, [loading, error, groups, selectedId, wide]);

  const select = (id) => {
    setSelectedId(id);
    if (!wide) window.requestAnimationFrame(() => detailRef.current && detailRef.current.focus());
  };

  const backToList = () => {
    const id = selectedId;
    setSelectedId(null);
    window.requestAnimationFrame(() => {
      const item = document.querySelector(`[data-id="${id}"]`);
      if (item) item.focus();
    });
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeleting(null);
    setDeleteBlockedBy([]);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await userGroupApi.remove(deleting._id);
      toast.success(`User group "${deleting.name}" deleted`);
      const removed = deleting._id;
      setDeleting(null);
      setDeleteBlockedBy([]);
      await load();
      setSelectedId((current) => (current === removed ? null : current));
    } catch (failure) {
      const { cohorts = [], tests = [] } = failure?.response?.data || {};
      const blockedBy = [...cohorts.map((c) => ({ ...c, kind: 'cohort' })), ...tests.map((t) => ({ ...t, kind: 'communication test' }))];
      if (failure?.response?.status === 409 && blockedBy.length) {
        setDeleteBlockedBy(blockedBy);
      } else {
        toast.error(apiErrorMessage(failure, 'Could not delete the user group'));
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const created = async (group) => {
    await load();
    select(group._id);
  };

  const empty = !loading && !error && groups.length === 0;

  const listPane = (
    <Card flush className="ug-listcard" title="All groups" description={!loading && !error && groups.length > 0 && search.trim() ? `${visible.length} of ${groups.length} match` : undefined}>
      <GroupList
        groups={groups}
        visible={visible}
        loading={loading}
        error={error}
        search={search}
        onSearch={setSearch}
        selectedId={selectedId}
        onSelect={select}
        onRetry={retry}
        onCreate={() => setCreating(true)}
      />
    </Card>
  );

  const detailPane = (
    <div ref={detailRef} tabIndex={-1} className="ug-detail">
      {!wide ? (
        <Button variant="ghost" className="ug-back" startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={backToList}>
          All groups
        </Button>
      ) : null}
      {selectedId ? (
        <GroupDetails
          key={selectedId}
          groupId={selectedId}
          compact={!wide}
          onChanged={load}
          onDelete={(group) => {
            setDeleteBlockedBy([]);
            setDeleting(group);
          }}
        />
      ) : null}
    </div>
  );

  return (
    <Page className="ug">
      <PageHeader
        title="User groups"
        count={!loading && !error ? groups.length : undefined}
        description="Upload a list of roll numbers once, then attach it to any cohort or communication test to make those students eligible."
        actions={
          <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setCreating(true)}>
            Create user group
          </Button>
        }
      />

      {wide ? (
        <div className="ug-layout" data-empty={empty ? 'true' : 'false'}>
          {listPane}
          {empty ? null : detailPane}
        </div>
      ) : selectedId ? (
        detailPane
      ) : (
        listPane
      )}

      {creating ? <CreateGroupDrawer onCreated={created} onClose={() => setCreating(false)} /> : null}

      {deleting && deleteBlockedBy.length > 0 ? (
        <Dialog
          open
          onClose={closeDelete}
          size="sm"
          title={`${deleting.name} is still in use`}
          description="This group is attached to the items below. Detach it from each one first (the &quot;User groups&quot; button of the cohort or test), then delete it."
          actions={<Button onClick={closeDelete}>Close</Button>}
        >
          <ul className="ug-blocked">
            {deleteBlockedBy.map((item) => (
              <li key={item._id}>
                {item.title} <span className="ui-muted">({item.kind})</span>
              </li>
            ))}
          </ul>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={Boolean(deleting)}
          onClose={closeDelete}
          busy={deleteBusy}
          danger
          title={deleting ? `Delete "${deleting.name}"?` : 'Delete user group?'}
          description="The roll number list is removed. Students keep their accounts."
          confirmLabel="Delete group"
          onConfirm={confirmDelete}
        />
      )}
    </Page>
  );
}
