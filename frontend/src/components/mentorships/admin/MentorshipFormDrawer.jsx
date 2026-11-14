import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, mentorshipApi } from '../../../services/mentorshipApi';
import { Button, Drawer, TextField } from '../../ui';
import { dateInputValue } from '../model/mentorshipModel';

/**
 * Create a mentorship or edit one, in a drawer from the right with the blue header. Mount it only
 * while it is open: it starts from the mentorship each time. Teachers and students are managed on the
 * mentorship's own page, not here.
 *
 *   mentorship   the mentorship being edited (_id, name, description, startsAt), or nothing to create one
 *   onSaved(saved)   the server saved it; the page reloads
 *   onClose()
 *
 * A name is required. A name that is already used answers 409 and is written beside the field.
 */
export default function MentorshipFormDrawer({ mentorship, onSaved, onClose }) {
  const editing = Boolean(mentorship);
  const [name, setName] = useState(mentorship?.name || '');
  const [description, setDescription] = useState(mentorship?.description || '');
  const [startsAt, setStartsAt] = useState(dateInputValue(mentorship?.startsAt));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const changed = !editing || name.trim() !== mentorship.name || description.trim() !== (mentorship.description || '') || startsAt !== dateInputValue(mentorship.startsAt);

  const focusName = () => document.getElementById('ms-form-name')?.focus();

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a name for the mentorship.');
      focusName();
      return;
    }
    setSaving(true);
    try {
      const values = { name, description, startsAt: startsAt || undefined };
      const saved = editing ? await mentorshipApi.update(mentorship._id, values) : await mentorshipApi.create(values);
      toast.success(editing ? 'Mentorship updated' : 'Mentorship created');
      onSaved(saved);
      onClose();
    } catch (failure) {
      const message = apiErrorMessage(failure, editing ? 'Could not update the mentorship' : 'Could not create the mentorship');
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
      title={editing ? 'Edit mentorship' : 'Create mentorship'}
      description={editing ? mentorship.name : 'A programme where teachers mentor students'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="ms-form" variant="primary" loading={saving} disabled={!changed}>
            {editing ? 'Save changes' : 'Create mentorship'}
          </Button>
        </>
      }
    >
      <form id="ms-form" className="ms-form" onSubmit={save} noValidate>
        <section className="ms-form__section">
          <TextField
            id="ms-form-name"
            label="Name"
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
          <TextField id="ms-form-description" label="Description (optional)" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} />
          <TextField id="ms-form-start" label="Start date" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} disabled={saving} hint={editing ? undefined : 'Leave it empty to start today.'} />
        </section>
      </form>
    </Drawer>
  );
}
