import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import { Button, ConfirmDialog, Dialog } from '../ui';

/**
 * Deleting a user group, from the card menu and from the group's own page. A dialog that names the
 * group and the consequence. A group that is still attached to cohorts or tests cannot be deleted:
 * the server answers 409 with the ones that use it, and the dialog lists them instead.
 *
 *   group          the group being deleted, or null when nothing is
 *   onClose()      the dialog was dismissed
 *   onDeleted(g)   the group was deleted (the dialog has closed)
 */
export default function DeleteGroupDialogs({ group, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [blockedBy, setBlockedBy] = useState([]); // cohorts and tests that still use it

  useEffect(() => {
    setBlockedBy([]);
  }, [group]);

  const close = () => {
    if (busy) return;
    setBlockedBy([]);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await userGroupApi.remove(group._id);
      toast.success(`User group "${group.name}" deleted`);
      const removed = group;
      setBlockedBy([]);
      onClose();
      onDeleted(removed);
    } catch (failure) {
      const { cohorts = [], tests = [] } = failure?.response?.data || {};
      const found = [...cohorts.map((c) => ({ ...c, kind: 'cohort' })), ...tests.map((t) => ({ ...t, kind: 'communication test' }))];
      if (failure?.response?.status === 409 && found.length) {
        setBlockedBy(found);
      } else {
        toast.error(apiErrorMessage(failure, 'Could not delete the user group'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (group && blockedBy.length > 0) {
    return (
      <Dialog
        open
        onClose={close}
        size="sm"
        title={`${group.name} is still in use`}
        description='This group is attached to the items below. Detach it from each one first (the "User groups" button of the cohort or test), then delete it.'
        actions={<Button onClick={close}>Close</Button>}
      >
        <ul className="ug-blocked">
          {blockedBy.map((item) => (
            <li key={item._id}>
              {item.title} <span className="ui-muted">({item.kind})</span>
            </li>
          ))}
        </ul>
      </Dialog>
    );
  }

  return (
    <ConfirmDialog
      open={Boolean(group)}
      onClose={close}
      busy={busy}
      danger
      title={group ? `Delete "${group.name}"?` : 'Delete user group?'}
      description="The roll number list is removed. Students keep their accounts."
      confirmLabel="Delete group"
      onConfirm={confirm}
    />
  );
}
