import React, { useState } from 'react';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Button, Drawer, SelectField, Switch, TextField } from '../ui';
import TagInput from '../custom-components/TagInput';
import { CATEGORIES, DIFFICULTIES, FIELD_ORDER, STATUSES, TAG_SUGGESTIONS, emptyForm, formFromOpportunity, validate } from './opportunityModel';

/**
 * The drawer that creates or edits one opportunity (design/screens.md sections 16 and 17).
 *
 * Mount it when it should open and unmount it when it closes: it starts from the opportunity it
 * is given (or an empty form) every time.
 *
 * Props
 *   opportunity   the opportunity to edit; null to add one
 *   saving        a save is in progress: the primary button spins and nothing can be closed
 *   locked        something above the drawer (the delete confirmation) has the focus: Escape is ignored
 *   onClose()
 *   onSave(form)  called with the form once it passes validation
 *   onDelete(opportunity)  the danger zone button (editing only)
 */

const FORM_ID = 'opportunity-form';

export default function OpportunityDrawer({ opportunity, saving, locked, onClose, onSave, onDelete }) {
  const editing = Boolean(opportunity);
  const [form, setForm] = useState(() => (opportunity ? formFromOpportunity(opportunity) : emptyForm()));
  const [errors, setErrors] = useState({});

  const update = (patch) => setForm((previous) => ({ ...previous, ...patch }));

  const set = (field) => (event) => {
    update({ [field]: event.target.value });
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  // Another category than hackathon has no prize, so the prize is cleared with the change
  const setCategory = (event) => {
    const category = event.target.value;
    setForm((previous) => ({ ...previous, category, prize: category === 'hackathon' ? previous.prize : '' }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      const node = document.getElementById(`opportunity-${first}`);
      if (node) node.focus();
      return;
    }
    onSave(form);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      busy={saving || locked}
      title={editing ? 'Edit opportunity' : 'Add opportunity'}
      description={editing ? opportunity.title : 'Students see it on their Opportunities page as soon as you save.'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={saving}>
            {editing ? 'Save changes' : 'Create opportunity'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="om-form" onSubmit={submit} noValidate>
        <section className="om-section" aria-labelledby="opportunity-basics">
          <h3 className="om-section__title" id="opportunity-basics">
            Basics
          </h3>
          <TextField id="opportunity-title" label="Title" required value={form.title} onChange={set('title')} error={errors.title} />
          <TextField id="opportunity-description" label="Description" required multiline rows={4} value={form.description} onChange={set('description')} error={errors.description} />
        </section>

        <section className="om-section" aria-labelledby="opportunity-organizer-title">
          <h3 className="om-section__title" id="opportunity-organizer-title">
            Organizer
          </h3>
          <TextField id="opportunity-organizer" label="Organizer" required value={form.organizer} onChange={set('organizer')} error={errors.organizer} />
          <TextField
            id="opportunity-organizerImageUrl"
            label="Organizer image URL"
            type="url"
            inputMode="url"
            placeholder="https://example.com/image.jpg"
            hint="The organizer's logo or profile picture. If it is empty, the first letter is shown."
            value={form.organizerImageUrl}
            onChange={set('organizerImageUrl')}
            error={errors.organizerImageUrl}
          />
        </section>

        <section className="om-section" aria-labelledby="opportunity-event">
          <h3 className="om-section__title" id="opportunity-event">
            Event details
          </h3>
          <div className="ui-form-grid">
            <SelectField id="opportunity-category" label="Category" value={form.category} onChange={setCategory} options={CATEGORIES} />
            <SelectField id="opportunity-difficulty" label="Difficulty" value={form.difficulty} onChange={set('difficulty')} options={DIFFICULTIES} />
            <SelectField id="opportunity-status" label="Status" required value={form.status} onChange={set('status')} options={STATUSES} error={errors.status} />
            <TextField id="opportunity-deadline" label="Deadline" required type="date" value={form.deadline} onChange={set('deadline')} error={errors.deadline} />
            <TextField id="opportunity-location" label="Location" placeholder="City, country or online" value={form.location} onChange={set('location')} />
            {form.category === 'hackathon' ? (
              <TextField id="opportunity-prize" label="Prize" placeholder="For example, certificates or a cash prize" value={form.prize} onChange={set('prize')} />
            ) : null}
          </div>
          <Switch
            label="Registration open"
            description="Students can still register while this is on."
            checked={form.registrationOpen}
            onChange={(registrationOpen) => update({ registrationOpen })}
          />
        </section>

        <section className="om-section" aria-labelledby="opportunity-links">
          <h3 className="om-section__title" id="opportunity-links">
            Links and picture
          </h3>
          <TextField
            id="opportunity-link"
            label="Link"
            required
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            value={form.link}
            onChange={set('link')}
            error={errors.link}
          />
          <TextField
            id="opportunity-applicationLink"
            label="Application link"
            type="url"
            inputMode="url"
            placeholder="https://example.com/apply"
            value={form.applicationLink}
            onChange={set('applicationLink')}
            error={errors.applicationLink}
          />
          <TextField
            id="opportunity-image"
            label="Opportunity image URL"
            type="url"
            inputMode="url"
            placeholder="https://example.com/opportunity-image.jpg"
            hint="The banner image for the opportunity."
            value={form.image}
            onChange={set('image')}
            error={errors.image}
          />
        </section>

        <section className="om-section" aria-labelledby="opportunity-who">
          <h3 className="om-section__title" id="opportunity-who">
            Eligibility and tags
          </h3>
          <TextField id="opportunity-eligibility" label="Eligibility" multiline rows={2} placeholder="Who can take part?" value={form.eligibility} onChange={set('eligibility')} />
          <TagInput
            id="opportunity-tags"
            label="Tags"
            value={form.tags}
            onChange={(tags) => update({ tags })}
            suggestions={TAG_SUGGESTIONS}
            placeholder="Add tags and press Enter"
            hint="Press Enter to add a tag, or pick one of the suggestions."
          />
        </section>

        {editing ? (
          <section className="om-danger" aria-labelledby="opportunity-danger">
            <div className="om-danger__text">
              <h3 className="om-danger__title" id="opportunity-danger">
                Delete this opportunity
              </h3>
              <p className="om-danger__body">It disappears for every student and cannot be recovered.</p>
            </div>
            <Button variant="danger" size="sm" startIcon={<TrashIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => onDelete(opportunity)} disabled={saving}>
              Delete opportunity
            </Button>
          </section>
        ) : null}
      </form>
    </Drawer>
  );
}
