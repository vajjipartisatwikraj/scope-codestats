import React, { useState } from 'react';
import { Button, Drawer, Notice, SelectField, TextField } from '../../../../ui';
import { FIELD_ORDER, emptyForm, formFromCohort, fromInput, timeOnly, toInput, validate } from '../model/cohortAdmin';
import './cohortForm.css';

const FORM_ID = 'cohort-form';

/** A boolean setting as the two words the select shows */
const ACTIVE = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];
const PUBLICATION = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];
const ACCESS = [
  { value: 'userGroups', label: 'User groups' },
  { value: 'global', label: 'Global' },
];
const MODES = [
  { value: 'practice', label: 'Practice mode' },
  { value: 'exam', label: 'Exam mode' },
];

/** What the exam window means for students, in words that follow the duration field */
function ExamExplainer({ duration }) {
  const own = String(duration ?? '').trim() !== '';
  return (
    <Notice tone="info" title="How an exam cohort works">
      <p>
        Once published, an exam cohort is visible to every eligible student, but it can only be <strong>started</strong> between the two times below.
      </p>
      <p>
        {own ? (
          <>
            Each student gets <strong>{duration} minutes</strong> from the moment they start. A student who starts late keeps their full time even if it runs past the end time; after the end time nobody new can start.
          </>
        ) : (
          'With no time per student, everyone works until the exam end time and stops together.'
        )}{' '}
        When a student&apos;s time runs out their exam is submitted automatically.
      </p>
    </Notice>
  );
}

/**
 * The drawer that creates or edits a cohort (design/screens.md sections 16 and 17): sections for the
 * basics, the schedule, the resources, who sees it and how it is delivered, and a sticky footer.
 * Date fields are the browser's own date and time pickers, which suit a phone as well.
 *
 * Mount it when it should open and unmount it when it closes: it starts from the cohort it is given
 * (or an empty form) every time.
 *
 *   cohort      the cohort to edit; null to create one
 *   saving      a save is in progress: the primary button spins and nothing can be closed
 *   onClose()
 *   onSave(form)   called with the form once it passes validation
 */
export default function CohortFormDrawer({ cohort, saving, onClose, onSave }) {
  const editing = Boolean(cohort);
  const [form, setForm] = useState(() => (cohort ? formFromCohort(cohort) : emptyForm()));
  const [errors, setErrors] = useState({});

  const change = (patch) => setForm((previous) => ({ ...previous, ...patch }));
  const clearError = (field) => errors[field] && setErrors((previous) => ({ ...previous, [field]: undefined }));

  const text = (field) => (event) => {
    change({ [field]: event.target.value });
    clearError(field);
  };
  const when = (field) => (event) => {
    change({ [field]: fromInput(event.target.value) });
    clearError(field);
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      const node = document.getElementById(`cohort-${first}`);
      if (node) node.focus();
      return;
    }
    onSave(form);
  };

  const exam = form.mode === 'exam';
  const scheduled = Boolean(form.examStartTime && form.examEndTime);
  const hasDuration = String(form.examDurationMinutes ?? '').trim() !== '';

  return (
    <Drawer
      open
      onClose={onClose}
      busy={saving}
      width="lg"
      title={editing ? 'Edit cohort' : 'Create cohort'}
      description={editing ? cohort.title : 'It starts as a draft that only staff can see.'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={saving}>
            {editing ? 'Save changes' : 'Create cohort'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="cmf" onSubmit={submit} noValidate>
        <section className="cmf-section" aria-labelledby="cohort-basics">
          <h3 className="cmf-section__title" id="cohort-basics">
            Basics
          </h3>
          <TextField id="cohort-title" label="Title" required value={form.title} onChange={text('title')} error={errors.title} />
          <TextField id="cohort-description" label="Description" required multiline rows={4} value={form.description} onChange={text('description')} error={errors.description} />
        </section>

        <section className="cmf-section" aria-labelledby="cohort-schedule">
          <h3 className="cmf-section__title" id="cohort-schedule">
            Schedule
          </h3>
          <div className="ui-form-grid">
            <TextField id="cohort-startDate" type="datetime-local" label="Starts" required value={toInput(form.startDate)} onChange={when('startDate')} error={errors.startDate} />
            <TextField id="cohort-endDate" type="datetime-local" label="Ends" required value={toInput(form.endDate)} onChange={when('endDate')} error={errors.endDate} />
          </div>
        </section>

        <section className="cmf-section" aria-labelledby="cohort-resources">
          <h3 className="cmf-section__title" id="cohort-resources">
            Resources
          </h3>
          <div className="ui-form-grid">
            <TextField id="cohort-videoResource" type="url" inputMode="url" label="Video URL" placeholder="https://youtu.be/example" value={form.videoResource} onChange={text('videoResource')} />
            <TextField id="cohort-documentationUrl" type="url" inputMode="url" label="Documentation URL" placeholder="https://example.com/docs" value={form.documentationUrl} onChange={text('documentationUrl')} />
          </div>
        </section>

        <section className="cmf-section" aria-labelledby="cohort-visibility">
          <h3 className="cmf-section__title" id="cohort-visibility">
            Who sees it
          </h3>
          <div className="ui-form-grid">
            <SelectField
              id="cohort-isActive"
              label="Status"
              hint="Active cohorts are visible to eligible students"
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(event) => change({ isActive: event.target.value === 'active' })}
              options={ACTIVE}
            />
            <SelectField
              id="cohort-isDraft"
              label="Publication"
              hint="Drafts are only visible to staff"
              value={form.isDraft ? 'draft' : 'published'}
              onChange={(event) => change({ isDraft: event.target.value === 'draft' })}
              options={PUBLICATION}
            />
            {/* Who can open it is set once here; later changes use the User groups button */}
            {!editing ? (
              <SelectField
                id="cohort-accessType"
                label="Accessibility"
                hint={form.accessType === 'global' ? 'Every student on the platform, including those who sign up later' : 'Only students in the user groups you attach after creating'}
                value={form.accessType}
                onChange={text('accessType')}
                options={ACCESS}
              />
            ) : null}
          </div>
        </section>

        <section className="cmf-section" aria-labelledby="cohort-delivery">
          <h3 className="cmf-section__title" id="cohort-delivery">
            Delivery
          </h3>
          <SelectField
            id="cohort-mode"
            label="Cohort type"
            hint={exam ? 'Can only be started between the exam start and end times' : 'Open to eligible students at any time'}
            value={form.mode}
            onChange={text('mode')}
            options={MODES}
          />

          {exam ? (
            <>
              <ExamExplainer duration={form.examDurationMinutes} />
              <div className="ui-form-grid">
                <TextField id="cohort-examStartTime" type="datetime-local" label="Exam opens" required value={toInput(form.examStartTime)} onChange={when('examStartTime')} error={errors.examStartTime} />
                <TextField id="cohort-examEndTime" type="datetime-local" label="Exam closes" required value={toInput(form.examEndTime)} onChange={when('examEndTime')} error={errors.examEndTime} />
                <TextField
                  id="cohort-examDurationMinutes"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  step={1}
                  label="Minutes per student"
                  placeholder="For example, 120"
                  hint="Leave it empty to let everyone work until the exam closes"
                  value={form.examDurationMinutes}
                  onChange={text('examDurationMinutes')}
                  error={errors.examDurationMinutes}
                />
              </div>
              {scheduled && hasDuration ? (
                <Notice tone="success">
                  Students can start any time between <strong>{timeOnly(form.examStartTime)}</strong> and <strong>{timeOnly(form.examEndTime)}</strong>, and each gets {form.examDurationMinutes} minutes.
                </Notice>
              ) : null}
            </>
          ) : null}
        </section>
      </form>
    </Drawer>
  );
}
