import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, mentorshipApi } from '../../../services/mentorshipApi';
import useRemote from '../../../hooks/useRemote';
import { Button, Checkbox, Drawer, EmptyState, Notice, SearchField, SkeletonRows, pluralize } from '../../ui';
import { matchesTerm } from '../model/mentorshipModel';
import { PersonCell } from '../shared/PeopleTable';

const messageOf = (failure) => apiErrorMessage(failure, 'Could not load the teachers');

/**
 * Choose the teachers who can mentor in a mentorship, in a drawer from the right (blue header): every
 * teacher account with a checkbox and a search. Save replaces the list. A teacher who still holds
 * students cannot be taken off: the server answers 409 and the drawer names them, so an admin
 * removes their students first. Mount it only while it is open.
 *
 *   mentorship   { _id, name }
 *   chosen       ids of the teachers already chosen
 *   onSaved()    the list was saved; the page reloads
 *   onClose()
 */
export default function AssignTeachersDrawer({ mentorship, chosen, onSaved, onClose }) {
  const { data, loading, error, reload } = useRemote((signal) => mentorshipApi.teachers({ signal }), [], true, messageOf);
  const [selected, setSelected] = useState(() => new Set(chosen));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [holding, setHolding] = useState([]); // teachers that cannot be taken off yet

  const teachers = useMemo(() => (data && data.teachers) || [], [data]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return teachers.filter((teacher) => matchesTerm(term, [teacher.name, teacher.email, teacher.department]));
  }, [teachers, search]);

  const changed = selected.size !== chosen.length || chosen.some((id) => !selected.has(id));

  const toggle = (id) => {
    setHolding([]);
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await mentorshipApi.setTeachers(mentorship._id, [...selected]);
      toast.success('Teachers updated');
      onSaved();
      onClose();
    } catch (failure) {
      if (failure?.response?.data?.reason === 'teachers_hold_students') {
        setHolding(failure.response.data.teachers || []);
      } else {
        toast.error(apiErrorMessage(failure, 'Could not update the teachers'));
      }
      setSaving(false);
    }
  };

  let list;
  if (loading && !data) {
    list = <SkeletonRows count={5} />;
  } else if (error && !data) {
    list = (
      <Notice
        tone="danger"
        title="We could not load the teachers"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (teachers.length === 0) {
    list = <EmptyState compact title="No teacher accounts yet" text="Teachers appear here once their account is approved." />;
  } else if (visible.length === 0) {
    list = <EmptyState compact title="No teachers match" text={`Nobody fits \u201c${search.trim()}\u201d.`} />;
  } else {
    list = (
      <ul className="ms-pick" aria-label="Teachers">
        {visible.map((teacher) => (
          <li key={teacher._id} className="ms-pick__row">
            <Checkbox checked={selected.has(teacher._id)} onChange={() => toggle(teacher._id)} disabled={saving} label={<PersonCell person={teacher} />} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Drawer
      open
      tone="accent"
      onClose={onClose}
      busy={saving}
      title="Assign teachers"
      description={mentorship.name}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="ms-teachers-form" variant="primary" loading={saving} disabled={!changed || !data}>
            {`Save ${pluralize(selected.size, 'teacher')}`}
          </Button>
        </>
      }
    >
      <form id="ms-teachers-form" className="ms-form" onSubmit={save} noValidate>
        <section className="ms-form__section">
          <p className="ms-lead">Choose who can mentor in this mentorship. Each chosen teacher then picks their own students.</p>
          <SearchField value={search} onChange={setSearch} placeholder="Search teachers" label="Search teachers by name, email or department" />
          {holding.length > 0 ? (
            <Notice tone="warning" title="These teachers still hold students">
              <ul className="ms-list">
                {holding.map((teacher) => (
                  <li key={teacher._id}>
                    {teacher.name} <span className="ui-muted">({pluralize(teacher.studentCount, 'student')})</span>
                  </li>
                ))}
              </ul>
              <p className="ms-note">Remove their students first (open the teacher from the mentorship), then take them off.</p>
            </Notice>
          ) : null}
          {list}
        </section>
      </form>
    </Drawer>
  );
}
