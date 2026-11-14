import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import { Button, Drawer, RollNumberInput, TextField } from '../ui';

/**
 * Name a new user group and give it its roll numbers (CSV upload or pasted). A longer form, so a
 * drawer (design/screens.md section 17). Mount it only while it is open: it starts empty each time.
 *
 *   onCreated(group)   the group was saved; the page reloads its list and opens the new group
 *   onClose
 *
 * Same rules as before: a name and at least one roll number. They are checked when the person presses
 * Create group, each problem is written beside its field, and the first one takes focus.
 */
export default function CreateGroupDrawer({ onCreated, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rollNumbers, setRollNumbers] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const focus = (id) => {
    const node = document.getElementById(id);
    if (node) node.focus();
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const next = {};
    if (!name.trim()) next.name = 'Enter a name for the group.';
    if (rollNumbers.length === 0) next.rolls = 'Add at least one roll number: upload a CSV or paste them.';
    setErrors(next);
    if (next.name) return focus('ug-create-name');
    if (next.rolls) return focus('ug-create-rolls');

    setSaving(true);
    try {
      const { group } = await userGroupApi.create({ name, description, rollNumbers });
      toast.success(`User group "${group.name}" created with ${group.memberCount} roll numbers`);
      onCreated(group);
      onClose();
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not create the user group');
      toast.error(message);
      if (error?.response?.status === 409) {
        setErrors({ name: message });
        focus('ug-create-name');
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
      title="Create user group"
      description="A named list of roll numbers you can attach to cohorts and communication tests."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="ug-create-form" variant="primary" loading={saving}>
            Create group
          </Button>
        </>
      }
    >
      <form id="ug-create-form" className="ug-form" onSubmit={handleSave} noValidate>
        <section className="ug-form__section" aria-labelledby="ug-create-details">
          <h3 id="ug-create-details" className="ug-form__title">
            Details
          </h3>
          <TextField
            id="ug-create-name"
            label="Group name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            disabled={saving}
            data-autofocus
          />
          <TextField
            id="ug-create-description"
            label="Description (optional)"
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={saving}
          />
        </section>

        <section className="ug-form__section" aria-labelledby="ug-create-members">
          <h3 id="ug-create-members" className="ug-form__title">
            Roll numbers
          </h3>
          <RollNumberInput
            id="ug-create-rolls"
            label="Roll numbers"
            onChange={(list) => {
              setRollNumbers(list);
              if (list.length > 0) setErrors((current) => ({ ...current, rolls: undefined }));
            }}
            disabled={saving}
            error={errors.rolls}
            rows={8}
          />
        </section>
      </form>
    </Drawer>
  );
}
