import React, { useState } from 'react';
import { Button, Drawer, TextField } from '../../ui';
import { emptyTopicForm, topicFormFrom, validateTopic } from '../model/bankLibrary';

const FORM_ID = 'topic-form';

/**
 * The drawer that creates or edits a topic. A topic becomes a module when it is imported into a
 * cohort, so it has the fields of a module: a name, a description, a video link and the notes
 * students read (HTML). Mount it when it should open and unmount it when it closes.
 *
 *   topic     the topic to edit (with its notes); null to create one
 *   saving    a save is running
 *   onClose(), onSave(form)
 */
export default function TopicDrawer({ topic, saving, onClose, onSave }) {
  const editing = Boolean(topic);
  const [form, setForm] = useState(() => (topic ? topicFormFrom(topic) : emptyTopicForm()));
  const [errors, setErrors] = useState({});

  const text = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validateTopic(form);
    setErrors(found);
    if (found.name) {
      const node = document.getElementById('topic-name');
      if (node) node.focus();
      return;
    }
    onSave({ ...form, name: form.name.trim(), description: form.description.trim(), videoResource: form.videoResource.trim() });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      busy={saving}
      width="lg"
      title={editing ? 'Edit topic' : 'Add topic'}
      description={editing ? topic.name : 'It becomes a module, with its questions, when a bank is imported into a cohort.'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={saving}>
            {editing ? 'Save topic' : 'Add topic'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="bl-form" onSubmit={submit} noValidate>
        <TextField id="topic-name" label="Name" required value={form.name} onChange={text('name')} error={errors.name} maxLength={120} />
        <TextField id="topic-description" label="Description" hint="Shown to students as the description of the module" multiline rows={3} value={form.description} onChange={text('description')} maxLength={1000} />
        <TextField id="topic-video" type="url" inputMode="url" label="Video URL" placeholder="https://youtu.be/example" value={form.videoResource} onChange={text('videoResource')} />
        <TextField
          id="topic-notes"
          label="Notes (HTML)"
          hint="Students read these from the Notes button of the module"
          multiline
          rows={10}
          spellCheck={false}
          value={form.documentationUrl}
          onChange={text('documentationUrl')}
        />
      </form>
    </Drawer>
  );
}
