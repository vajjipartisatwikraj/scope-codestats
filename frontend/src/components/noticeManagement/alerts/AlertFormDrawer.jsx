import React, { useState } from 'react';
import { Button, Drawer, Switch, TextField } from '../../ui';
import { AlertBar } from '../../notices';
import { ButtonFields, WindowFields } from '../shared/NoticeFields';
import { checkButton, checkWindow, defaultWindow, fromInput, toInput } from '../shared/noticeFormat';
import '../shared/noticeManagement.css';

const MESSAGE_LIMIT = 280;

const startingForm = (item) =>
  item
    ? { message: item.message, startsAt: toInput(item.startsAt), endsAt: toInput(item.endsAt), buttonText: item.buttonText || '', buttonUrl: item.buttonUrl || '', isActive: item.isActive }
    : { message: '', ...defaultWindow(), buttonText: '', buttonUrl: '', isActive: true };

/** The first field with a problem takes focus, in the order they are on screen */
const FIELD_ORDER = ['message', 'startsAt', 'endsAt', 'buttonText', 'buttonUrl'];

/**
 * Create or edit an alert: what it says, when it shows, an optional button and whether it is on. A
 * longer form, so a drawer with the blue header (design/screens.md section 17). A live preview shows
 * the band exactly as the app draws it. Mount it only while it is open: it starts afresh each time.
 *
 *   item        the alert being edited, or null for a new one
 *   saving      the server is saving
 *   onClose()
 *   onSave(body, id)   resolves true when the alert was saved
 */
export default function AlertFormDrawer({ item, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => startingForm(item));
  const [errors, setErrors] = useState({});

  const change = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const problems = { ...checkWindow(form), ...checkButton(form) };
    if (!form.message.trim()) problems.message = 'Write the message people will read.';
    else if (form.message.trim().length > MESSAGE_LIMIT) problems.message = `Keep it to ${MESSAGE_LIMIT} characters or fewer.`;
    setErrors(problems);
    const first = FIELD_ORDER.find((field) => problems[field]);
    if (first) {
      const node = document.getElementById(`al-${first}`);
      if (node) node.focus();
      return;
    }
    await onSave(
      {
        message: form.message.trim(),
        startsAt: fromInput(form.startsAt),
        endsAt: fromInput(form.endsAt),
        buttonText: form.buttonText.trim(),
        buttonUrl: form.buttonUrl.trim(),
        isActive: form.isActive,
      },
      item ? item._id : undefined
    );
  };

  return (
    <Drawer
      open
      tone="accent"
      onClose={onClose}
      busy={saving}
      title={item ? 'Edit alert' : 'Create alert'}
      description="A band across the top of the app for everyone who is signed in."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="al-form" variant="primary" loading={saving}>
            {item ? 'Save alert' : 'Create alert'}
          </Button>
        </>
      }
    >
      <form id="al-form" className="ntc-form" onSubmit={submit} noValidate>
        <section className="ntc-form__section" aria-labelledby="al-content">
          <h3 id="al-content" className="ntc-form__title">
            What it says
          </h3>
          <TextField
            id="al-message"
            label="Message"
            required
            multiline
            rows={3}
            maxLength={MESSAGE_LIMIT + 40}
            placeholder="Maintenance tonight from 10 pm to 11 pm. The site may be slow."
            hint={`${form.message.trim().length} of ${MESSAGE_LIMIT} characters`}
            value={form.message}
            onChange={(event) => change('message', event.target.value)}
            error={errors.message}
            disabled={saving}
            data-autofocus
          />
          <ButtonFields values={form} errors={errors} onChange={change} disabled={saving} idPrefix="al" />
          <div className="ntc-preview">
            <p className="ntc-preview__label">Preview</p>
            <div className="ntc-preview__frame">
              <AlertBar message={form.message.trim() || 'Your message appears here.'} buttonText={form.buttonText.trim()} onButton={() => {}} onClose={() => {}} preview />
            </div>
          </div>
        </section>

        <section className="ntc-form__section" aria-labelledby="al-when">
          <h3 id="al-when" className="ntc-form__title">
            When it shows
          </h3>
          <WindowFields values={form} errors={errors} onChange={change} disabled={saving} idPrefix="al" />
          <Switch label="Show this alert" description="Switch it off to stop showing it without deleting it." checked={form.isActive} onChange={(value) => change('isActive', value)} disabled={saving} />
        </section>
      </form>
    </Drawer>
  );
}
