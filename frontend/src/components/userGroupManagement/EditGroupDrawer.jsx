import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import { Button, Drawer, TextField } from '../ui';

/**
 * Rename a user group and change its description, from the Edit item of the card menu. Mount it only
 * while it is open: it starts from the group each time. The roll numbers are managed on the group's
 * own page (the Manage button).
 *
 *   group        a group of the list (needs _id, name, description)
 *   onSaved()    the group was saved; the page reloads its list
 *   onClose()
 *
 * Same rules as the group page's settings: a name is required, a name already in use answers 409
 * and is written beside the field.
 */
export default function EditGroupDrawer({ group, onSaved, onClose }) {
  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const changed = name.trim() !== (group.name || '') || description.trim() !== (group.description || '');

  const focusName = () => {
    const node = document.getElementById('ug-edit-name');
    if (node) node.focus();
  };

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a name for the group.');
      focusName();
      return;
    }
    setSaving(true);
    try {
      await userGroupApi.update(group._id, { name, description });
      toast.success('User group updated');
      onSaved();
      onClose();
    } catch (failure) {
      const message = apiErrorMessage(failure, 'Could not update the user group');
      toast.error(message);
      if (failure?.response?.status === 409) {
        setError(message);
        focusName();
      }
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      tone="accent"
      onClose={onClose}
      busy={saving}
      title="Edit user group"
      description={group.name}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="ug-edit-form" variant="primary" loading={saving} disabled={!changed}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="ug-edit-form" className="ug-form" onSubmit={save} noValidate>
        <section className="ug-form__section">
          <TextField
            id="ug-edit-name"
            label="Group name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            error={error}
            disabled={saving}
            data-autofocus
          />
          <TextField id="ug-edit-description" label="Description (optional)" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} />
        </section>
      </form>
    </Drawer>
  );
}
