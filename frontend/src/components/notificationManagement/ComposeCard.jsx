import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/csr/PaperPlaneTilt';
import { FloppyDiskIcon } from '@phosphor-icons/react/dist/csr/FloppyDisk';
import { Button, Card, ConfirmDialog, SearchField, SelectField, TextField, pluralize } from '../ui';
import NotificationPreview from './NotificationPreview';
import { EMPTY_FORM, FIELD_IDS, firstErrorField, formFromNotification, isGlobal, validateForm } from './notificationFormat';

/**
 * The compose card (design/screens.md section 14, Admin compose): a sectioned form with the message,
 * the audience and the auto-delete time, a sticky footer that says how many people will receive it,
 * and the live preview beside it (below it on a phone). Sending asks for a confirmation that names
 * the audience and the number of people.
 *
 *   users          the students a notification can go to ({ _id, name, email })
 *   studentCount   how many students "everyone" means, or null when the list did not load
 *   editing        the notification being edited, or null when composing a new one
 *   saving         a request is in progress
 *   onSave(form, editId)   resolves true when it worked
 *   onCancelEdit()         leave editing
 *
 * Editing changes the title, the message and the deletion time only: the server never moves a
 * notification to another audience, so the audience is shown but locked.
 */
export default function ComposeCard({ users, studentCount, editing, saving, onSave, onCancelEdit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [finding, setFinding] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cardRef = useRef(null);
  const editId = editing ? editing.id : null;

  // Entering or leaving edit mode loads the notification into the form, or empties it
  useEffect(() => {
    setErrors({});
    setConfirmOpen(false);
    if (editing) {
      setForm(formFromNotification(editing));
      if (cardRef.current) cardRef.current.scrollIntoView({ block: 'start' });
      const field = document.getElementById(FIELD_IDS.title);
      if (field) field.focus({ preventScroll: true });
    } else {
      setForm(EMPTY_FORM);
    }
    // Only a different notification (or none) should reload the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const set = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const setAudience = (event) => {
    const targetType = event.target.value;
    // Same as ever: choosing "everyone" forgets the chosen student
    setForm((current) => ({ ...current, targetType, selectedUser: targetType === 'global' ? '' : current.selectedUser }));
    setErrors((current) => ({ ...current, selectedUser: undefined }));
  };

  const chosen = useMemo(() => users.find((candidate) => candidate._id === form.selectedUser) || null, [users, form.selectedUser]);

  const visibleUsers = useMemo(() => {
    const query = finding.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (candidate) =>
        candidate._id === form.selectedUser ||
        String(candidate.name || '').toLowerCase().includes(query) ||
        String(candidate.email || '').toLowerCase().includes(query) ||
        String(candidate.rollNumber || '').toLowerCase().includes(query)
    );
  }, [users, finding, form.selectedUser]);

  // Who receives it, as a sentence and as a number
  const toEveryone = form.targetType === 'global';
  let audience;
  let recipients;
  if (editing) {
    audience = isGlobal(editing) ? 'Every student' : editing.user?.name || 'One student';
    recipients = isGlobal(editing) ? (editing.recipientCount ?? studentCount) : 1;
  } else if (toEveryone) {
    audience = 'Every student';
    recipients = studentCount;
  } else {
    audience = chosen ? chosen.name : 'One student';
    recipients = chosen ? 1 : null;
  }
  const recipientsKnown = recipients !== null && recipients !== undefined;

  const send = async () => {
    const ok = await onSave(form, editId);
    if (!ok) return;
    setConfirmOpen(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setFinding('');
    if (editing) onCancelEdit();
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validateForm(form, Boolean(editing));
    setErrors(found);
    const first = firstErrorField(found);
    if (first) {
      const field = document.getElementById(FIELD_IDS[first]);
      if (field) field.focus();
      return;
    }
    if (editing) send();
    else setConfirmOpen(true);
  };

  const summary = editing
    ? isGlobal(editing)
      ? `Saving updates the copy sent to ${recipientsKnown ? pluralize(recipients, 'person', 'people') : 'every student'}.`
      : `Saving updates the notification sent to ${audience}.`
    : recipientsKnown
      ? `Will be sent to ${pluralize(recipients, 'person', 'people')}.`
      : toEveryone
        ? 'Will be sent to every student.'
        : 'Choose who should receive it.';

  return (
    <div className="nm-compose" ref={cardRef}>
      <Card
        as="form"
        className="nm-form"
        title={editing ? 'Edit notification' : 'New notification'}
        description={editing ? 'Change the wording or when it removes itself.' : 'Write it, choose who gets it, and check the preview.'}
        onSubmit={submit}
        noValidate
        aria-label={editing ? 'Edit notification' : 'New notification'}
      >
        <div className="nm-form__sections">
          <section className="nm-section" aria-labelledby="nm-message-heading">
            <h3 className="nm-section__title" id="nm-message-heading">
              Message
            </h3>
            <TextField
              id={FIELD_IDS.title}
              label="Title"
              required
              value={form.title}
              onChange={set('title')}
              error={errors.title}
              autoComplete="off"
            />
            <TextField
              id={FIELD_IDS.message}
              label="Message"
              required
              multiline
              rows={4}
              value={form.message}
              onChange={set('message')}
              error={errors.message}
              hint="Keep it short. Students read it in their notification list."
            />
          </section>

          <section className="nm-section" aria-labelledby="nm-audience-heading">
            <h3 className="nm-section__title" id="nm-audience-heading">
              Audience
            </h3>
            {editing ? (
              <div className="nm-locked">
                <p className="nm-locked__value">{audience}</p>
                <p className="nm-locked__hint">
                  {isGlobal(editing) ? 'Sent to every student.' : editing.user?.email || 'Sent to one student.'} The audience cannot be changed after sending.
                </p>
              </div>
            ) : (
              <>
                <SelectField
                  label="Send to"
                  value={form.targetType}
                  onChange={setAudience}
                  options={[
                    { value: 'global', label: 'Every student' },
                    { value: 'user', label: 'One student' },
                  ]}
                />
                {form.targetType === 'user' ? (
                  <div className="nm-picker">
                    <SearchField value={finding} onChange={setFinding} label="Find a student" placeholder="Find by name, email or roll number" />
                    <SelectField
                      id={FIELD_IDS.selectedUser}
                      label="Student"
                      required
                      value={form.selectedUser}
                      onChange={set('selectedUser')}
                      error={errors.selectedUser}
                      hint={finding.trim() ? `${pluralize(visibleUsers.length, 'student')} match.` : undefined}
                    >
                      <option value="">Choose a student</option>
                      {visibleUsers.map((candidate) => (
                        <option key={candidate._id} value={candidate._id}>
                          {candidate.name} ({candidate.email})
                        </option>
                      ))}
                    </SelectField>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="nm-section" aria-labelledby="nm-delete-heading">
            <h3 className="nm-section__title" id="nm-delete-heading">
              Auto-delete
            </h3>
            <TextField
              id={FIELD_IDS.deletionTime}
              type="datetime-local"
              label="Remove it on"
              value={form.deletionTime}
              onChange={set('deletionTime')}
              error={errors.deletionTime}
              hint="Optional. Leave it empty to keep the notification until you delete it."
            />
          </section>
        </div>

        <div className="nm-form__footer">
          <p className="nm-form__summary" aria-live="polite">
            {summary}
          </p>
          <div className="nm-form__buttons">
            {editing ? (
              <Button onClick={onCancelEdit} disabled={saving}>
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              loading={editing ? saving : false}
              startIcon={editing ? <FloppyDiskIcon size={18} weight="regular" aria-hidden="true" /> : <PaperPlaneTiltIcon size={18} weight="regular" aria-hidden="true" />}
            >
              {editing ? 'Save changes' : 'Send notification'}
            </Button>
          </div>
        </div>
      </Card>

      <NotificationPreview
        title={form.title}
        message={form.message}
        audience={audience}
        recipients={recipientsKnown ? recipients : null}
        deletionTime={form.deletionTime}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={recipientsKnown ? `Send to ${pluralize(recipients, 'person', 'people')}?` : 'Send to every student?'}
        description={
          toEveryone
            ? 'Every student gets this in their notifications. Students who are online see it straight away. You can edit or delete it afterwards.'
            : `${audience} gets this in their notifications. You can edit or delete it afterwards.`
        }
        confirmLabel="Send notification"
        onConfirm={send}
        busy={saving}
      >
        <div className="nm-confirm">
          <p className="nm-confirm__title">{form.title.trim()}</p>
          <p className="nm-confirm__message">{form.message.trim()}</p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
