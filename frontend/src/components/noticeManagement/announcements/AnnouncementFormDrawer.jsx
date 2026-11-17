import React, { useState } from 'react';
import { Button, Drawer, Switch, TextField } from '../../ui';
import { RichTextEditor } from '../../custom-components';
import { AnnouncementDialog } from '../../notices';
import { ButtonFields, WindowFields } from '../shared/NoticeFields';
import { checkButton, checkWindow, plainTextOf } from '../shared/noticeFormat';
import { bodyFrom, isImageUrlValid, startingForm } from './announcementFormat';
import AudienceField from './AudienceField';
import ImageField from './ImageField';
import '../shared/noticeManagement.css';

const TITLE_LIMIT = 120;
const TEXT_LIMIT = 2000;

/** The first field with a problem takes focus, in the order they are on screen */
const FIELD_ORDER = ['title', 'imageUrl', 'description', 'userGroups', 'startsAt', 'endsAt', 'buttonText', 'buttonUrl'];
const FIELD_IDS = { userGroups: 'an-audience' };

/**
 * Create or edit an announcement: the title and the rich text description, the picture, who sees it,
 * when, an optional button and whether it is on. A longer form, so a wide drawer with the blue header
 * (design/screens.md section 17). "Preview" opens the real announcement card with what is written so
 * far, and counts nothing. Mount it only while it is open: it starts afresh each time.
 *
 *   item        the announcement being edited, or null for a new one
 *   saving      the server is saving
 *   onClose()
 *   onSave(body, id)   resolves true when the announcement was saved
 */
export default function AnnouncementFormDrawer({ item, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => startingForm(item));
  const [errors, setErrors] = useState({});
  const [previewing, setPreviewing] = useState(false);

  const change = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const problems = { ...checkWindow(form), ...checkButton(form) };
    if (!form.title.trim()) problems.title = 'Write a title.';
    if (!plainTextOf(form.description)) problems.description = 'Write the text of the announcement.';
    else if (plainTextOf(form.description).length > TEXT_LIMIT) problems.description = `Keep the text to ${TEXT_LIMIT} characters or fewer.`;
    if (form.imageUrl.trim() && !isImageUrlValid(form.imageUrl)) problems.imageUrl = 'Use an address that starts with https://';
    if (form.audience === 'groups' && form.userGroups.length === 0) problems.userGroups = 'Choose at least one user group.';
    setErrors(problems);
    const first = FIELD_ORDER.find((field) => problems[field]);
    if (first) {
      const node = document.getElementById(FIELD_IDS[first] || `an-${first}`);
      if (node) node.focus();
      return;
    }
    await onSave(bodyFrom(form), item ? item._id : undefined);
  };

  return (
    <>
      <Drawer
        open
        tone="accent"
        width="lg"
        onClose={onClose}
        busy={saving}
        title={item ? 'Edit announcement' : 'Create announcement'}
        description="A card that opens after sign-in, for the people you choose."
        footer={
          <>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => setPreviewing(true)} disabled={saving || !plainTextOf(form.description) || !form.title.trim()}>
              Preview
            </Button>
            <Button type="submit" form="an-form" variant="primary" loading={saving}>
              {item ? 'Save announcement' : 'Create announcement'}
            </Button>
          </>
        }
      >
        <form id="an-form" className="nm-form" onSubmit={submit} noValidate>
          <section className="nm-form__section" aria-labelledby="an-content">
            <h3 id="an-content" className="nm-form__title">
              What it says
            </h3>
            <TextField
              id="an-title"
              label="Title"
              required
              maxLength={TITLE_LIMIT}
              value={form.title}
              onChange={(event) => change('title', event.target.value)}
              error={errors.title}
              disabled={saving}
              data-autofocus
            />
            <ImageField id="an-imageUrl" value={form.imageUrl} error={errors.imageUrl} onChange={(url) => change('imageUrl', url)} disabled={saving} />
            <RichTextEditor
              id="an-description"
              label="Description"
              placeholder="Write the announcement. Use a heading, a list or a link where it helps."
              maxLength={TEXT_LIMIT}
              minHeight={180}
              value={form.description}
              onChange={(html) => change('description', html)}
              error={errors.description}
              disabled={saving}
            />
            <ButtonFields values={form} errors={errors} onChange={change} disabled={saving} idPrefix="an" />
          </section>

          <section className="nm-form__section" aria-labelledby="an-who">
            <h3 id="an-who" className="nm-form__title">
              Who sees it, and when
            </h3>
            <AudienceField audience={form.audience} userGroups={form.userGroups} error={errors.userGroups} onChange={change} disabled={saving} idPrefix="an" />
            <WindowFields values={form} errors={errors} onChange={change} disabled={saving} idPrefix="an" />
            <Switch label="Show this announcement" description="Switch it off to stop showing it without deleting it." checked={form.isActive} onChange={(value) => change('isActive', value)} disabled={saving} />
          </section>
        </form>
      </Drawer>

      {previewing ? (
        <AnnouncementDialog
          preview
          announcement={{ title: form.title.trim(), description: form.description, imageUrl: form.imageUrl.trim(), buttonText: form.buttonText.trim() }}
          onClose={() => setPreviewing(false)}
          onButton={() => setPreviewing(false)}
        />
      ) : null}
    </>
  );
}
