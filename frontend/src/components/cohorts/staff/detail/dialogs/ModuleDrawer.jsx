import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Button, Drawer, PillTabs, Prose, TextField } from '../../../../ui';
import { useAuth } from '../../../../../contexts/AuthContext';
import { getTopic } from '../../../../bankLibrary/api/bankLibraryApi';
import { applyAutofill, apiMessage } from '../../../../bankLibrary/model/bankLibrary';
import TopicChoice from '../../../../bankLibrary/picker/TopicChoice';
import { MODULE_FIELD_ORDER, emptyModuleForm, moduleFormFrom, validateModule } from '../model/staffContent';
import './dialogs.css';

const FORM_ID = 'module-form';
const VIEWS = [
  { key: 'edit', label: 'Edit HTML' },
  { key: 'preview', label: 'Preview' },
];
const NOTES_EXAMPLE = `<h2>Module overview</h2>
<p>This module covers <strong>fundamental concepts</strong>.</p>

<h3>Key topics</h3>
<ul>
  <li>Topic 1</li>
  <li>Topic 2</li>
</ul>

<pre><code>function example() {
  console.log("Hello");
}</code></pre>`;

/**
 * The drawer that creates or edits a module: its name and description, where it sits in the order, a
 * video link, and the notes students read (HTML, with a preview that shows them as students see
 * them, cleaned the same way). Mount it when it should open and unmount it when it closes.
 *
 *   module     the module to edit; null to create one
 *   order      the position a new module starts at (the number of modules now)
 *   saving     a save is in progress
 *   onClose(), onSave(form, { importTopic })   onSave is called once the form passes its checks.
 *               importTopic is the library topic chosen for a new module (null for none): the form
 *               is filled from it, and the page imports its questions once the module exists.
 */
export default function ModuleDrawer({ module, order, saving, onClose, onSave }) {
  const { token } = useAuth();
  const editing = Boolean(module);
  const [form, setForm] = useState(() => (module ? moduleFormFrom(module) : emptyModuleForm(order)));
  const [errors, setErrors] = useState({});
  const [view, setView] = useState('edit');
  const [importTopic, setImportTopic] = useState(null);
  const [readingTopic, setReadingTopic] = useState(false);
  const filledFromTopic = useRef({}); // what choosing a topic last put in the form

  // A topic brings its name, description, video and notes. They go into the module's fields unless
  // the person has written their own there; choosing another topic replaces the ones it filled.
  const chooseTopic = async (topic) => {
    setImportTopic(topic);
    if (!topic) return;
    setReadingTopic(true);
    try {
      const full = await getTopic(token, topic.bankId, topic.topicId);
      const { form: next, filled } = applyAutofill(form, filledFromTopic.current, {
        title: full.name,
        description: full.description || full.name,
        videoResource: full.videoResource,
        documentationUrl: full.documentationUrl,
      });
      filledFromTopic.current = filled;
      setForm(next);
      setErrors({});
    } catch (error) {
      toast.error(apiMessage(error, 'Could not read the topic. Its questions will still be imported.'));
    } finally {
      setReadingTopic(false);
    }
  };

  const text = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validateModule(form);
    setErrors(found);
    const first = MODULE_FIELD_ORDER.find((field) => found[field]);
    if (first) {
      const node = document.getElementById(`module-${first}`);
      if (node) node.focus();
      return;
    }
    // An empty order field means the start of the list, not "not a number"
    const parsed = parseInt(form.order, 10);
    onSave({ ...form, order: Number.isNaN(parsed) ? 0 : parsed }, { importTopic });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      busy={saving}
      width="lg"
      title={editing ? 'Edit module' : 'Add module'}
      description={editing ? module.title : 'It is added to this cohort and to every cohort cloned from it.'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={saving}>
            {editing ? 'Save module' : 'Create module'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="cad-form" onSubmit={submit} noValidate>
        {/* Only a new module can start from a library topic */}
        {!editing ? (
          <section className="cad-form__section" aria-labelledby="module-library">
            <h3 className="cad-form__title" id="module-library">
              From the bank library
            </h3>
            <p className="cad-form__hint">Optional. A topic fills the title, description, video and notes below, and its questions are imported into the module once it is created.</p>
            <TopicChoice value={importTopic} onChange={chooseTopic} disabled={saving} loading={readingTopic} />
          </section>
        ) : null}

        <section className="cad-form__section" aria-labelledby="module-basics">
          <h3 className="cad-form__title" id="module-basics">
            Basics
          </h3>
          <TextField id="module-title" label="Title" required value={form.title} onChange={text('title')} error={errors.title} />
          <TextField id="module-description" label="Description" required multiline rows={3} value={form.description} onChange={text('description')} error={errors.description} />
          <div className="ui-form-grid">
            <TextField id="module-order" type="number" inputMode="numeric" label="Order" hint="Modules are listed from the lowest number" value={form.order} onChange={text('order')} />
            <TextField id="module-videoResource" type="url" inputMode="url" label="Video URL" placeholder="https://youtu.be/example" value={form.videoResource} onChange={text('videoResource')} />
          </div>
        </section>

        <section className="cad-form__section" aria-labelledby="module-notes">
          <h3 className="cad-form__title" id="module-notes">
            Notes
          </h3>
          <p className="cad-form__hint">Write the notes in HTML. Students read them from the Notes button of the module.</p>
          <PillTabs
            items={[VIEWS[0], { ...VIEWS[1], disabled: !form.documentationUrl.trim() }]}
            value={view}
            onChange={setView}
            label="Edit or preview the notes"
            size="sm"
            role="radiogroup"
          />
          {view === 'edit' ? (
            <TextField
              id="module-documentationUrl"
              multiline
              rows={12}
              label="Notes (HTML)"
              className="cad-form__html"
              placeholder={NOTES_EXAMPLE}
              spellCheck={false}
              value={form.documentationUrl}
              onChange={text('documentationUrl')}
            />
          ) : (
            <div className="cad-form__preview" aria-label="Preview of the notes">
              <Prose html={form.documentationUrl} />
            </div>
          )}
        </section>
      </form>
    </Drawer>
  );
}
