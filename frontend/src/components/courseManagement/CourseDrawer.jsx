import React, { useState } from 'react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Button, Drawer, SelectField, TextField } from '../ui';
import TagInput from '../custom-components/TagInput';
import { CATEGORIES, FIELD_ORDER, LEVELS, emptyForm, formFromCourse, levelLabel, validate } from './courseModel';

/**
 * The drawer that creates or edits one course (design/screens.md sections 16 and 17).
 *
 * Mount it when it should open and unmount it when it closes: it starts from the course it is
 * given (or an empty form) every time.
 *
 * Props
 *   course        the course to edit; null to add one
 *   saving        a save is in progress: the primary button spins and nothing can be closed
 *   locked        something above the drawer (the delete confirmation) has the focus: Escape is ignored
 *   onClose()
 *   onSave(form)  called with the form once it passes validation
 *   onDelete(course)  the danger zone button (editing only)
 */

const FORM_ID = 'course-form';

export default function CourseDrawer({ course, saving, locked, onClose, onSave, onDelete }) {
  const editing = Boolean(course);
  const [form, setForm] = useState(() => (course ? formFromCourse(course) : emptyForm()));
  const [errors, setErrors] = useState({});

  const set = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      const node = document.getElementById(`course-${first}`);
      if (node) node.focus();
      return;
    }
    onSave(form);
  };

  return (
    <Drawer
      open
      tone="accent"
      onClose={onClose}
      busy={saving || locked}
      title={editing ? 'Edit course' : 'Add course'}
      description={editing ? course.title : 'Students see it on their Courses page as soon as you save.'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={saving}>
            {editing ? 'Save changes' : 'Create course'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="cm-form" onSubmit={submit} noValidate>
        <section className="cm-section" aria-labelledby="course-basics">
          <h3 className="cm-section__title" id="course-basics">
            Basics
          </h3>
          <TextField id="course-title" label="Title" required value={form.title} onChange={set('title')} error={errors.title} />
          <TextField id="course-description" label="Description" required multiline rows={4} value={form.description} onChange={set('description')} error={errors.description} />
          <TextField
            id="course-courseLink"
            label="Course link"
            required
            type="url"
            inputMode="url"
            placeholder="https://example.com/course"
            value={form.courseLink}
            onChange={set('courseLink')}
            error={errors.courseLink}
          />
          {editing && course.courseLink ? (
            <a className="ui-link cm-visit" href={course.courseLink} target="_blank" rel="noopener noreferrer">
              Open the saved link
              <ArrowSquareOutIcon size={16} weight="regular" aria-hidden="true" />
            </a>
          ) : null}
          <TextField
            id="course-image"
            label="Image URL"
            type="url"
            inputMode="url"
            placeholder="https://example.com/image.jpg"
            hint="Shown as the course picture. Leave it empty to use the default."
            value={form.image}
            onChange={set('image')}
          />
        </section>

        <section className="cm-section" aria-labelledby="course-details">
          <h3 className="cm-section__title" id="course-details">
            Details
          </h3>
          <div className="ui-form-grid">
            <TextField id="course-instructor" label="Instructor" value={form.instructor} onChange={set('instructor')} />
            <TextField id="course-duration" label="Duration" placeholder="For example, 8 weeks" value={form.duration} onChange={set('duration')} />
            <SelectField id="course-level" label="Level" value={form.level} onChange={set('level')} options={LEVELS.map((level) => ({ value: level, label: levelLabel(level) }))} />
            <SelectField id="course-category" label="Category" value={form.category} onChange={set('category')} options={CATEGORIES} />
          </div>
        </section>

        <section className="cm-section" aria-labelledby="course-topics">
          <h3 className="cm-section__title" id="course-topics">
            Topics and prerequisites
          </h3>
          <TagInput
            id="course-topics-input"
            label="Topics"
            value={form.topics}
            onChange={(topics) => setForm((previous) => ({ ...previous, topics }))}
            placeholder="Add topics and press Enter"
          />
          <TagInput
            id="course-prerequisites-input"
            label="Prerequisites"
            value={form.prerequisites}
            onChange={(prerequisites) => setForm((previous) => ({ ...previous, prerequisites }))}
            placeholder="Add prerequisites and press Enter"
          />
        </section>

        {editing ? (
          <section className="cm-danger" aria-labelledby="course-danger">
            <div className="cm-danger__text">
              <h3 className="cm-danger__title" id="course-danger">
                Delete this course
              </h3>
              <p className="cm-danger__body">It disappears for every student and cannot be recovered.</p>
            </div>
            <Button variant="danger" size="sm" startIcon={<TrashIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => onDelete(course)} disabled={saving}>
              Delete course
            </Button>
          </section>
        ) : null}
      </form>
    </Drawer>
  );
}
