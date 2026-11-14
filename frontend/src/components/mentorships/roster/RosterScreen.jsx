import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { UserMinusIcon } from '@phosphor-icons/react/dist/csr/UserMinus';
import { UserPlusIcon } from '@phosphor-icons/react/dist/csr/UserPlus';
import { apiErrorMessage } from '../../../services/mentorshipApi';
import useAutoHideScrollbars from '../../../hooks/useAutoHideScrollbars';
import useMediaQuery from '../../../hooks/useMediaQuery';
import { AdminTop, Badge, Button, ConfirmDialog, EmptyState, IconButton, Notice, Page, SearchField, Skeleton, formatNumber, pluralize } from '../../ui';
import { matchesTerm } from '../model/mentorshipModel';
import PeopleTable from '../shared/PeopleTable';
import AddStudentsDrawer from './AddStudentsDrawer';
import useRoster from './useRoster';

const COLUMNS = [
  { key: 'roll', label: 'Roll number', className: 'ms-roll', render: (student) => student.rollNumber },
  { key: 'department', label: 'Department', render: (student) => (student.department ? <Badge>{student.department}</Badge> : <span className="ms-none">Not set</span>) },
  { key: 'section', label: 'Section', render: (student) => student.section || <span className="ms-none">Not set</span> },
  { key: 'year', label: 'Graduating', className: 'ms-roll', render: (student) => student.graduatingYear || <span className="ms-none">Not set</span> },
];

const metaOf = (student) => [student.rollNumber, student.department].filter(Boolean).join(' \u00b7 ');

/**
 * One mentor's students in one mentorship, with adding and removing. The admin (a mentor's page) and
 * the teacher (My students) use this same screen; only the calls and the heading differ.
 *
 *   api        { key, get, add, remove } from adminRoster(...) or myRoster(...)
 *   describe   (data) => { crumbs, title, description, drawerDescription, filters } the heading for the
 *              loaded roster. `data` is null while loading. `drawerDescription` is the line under the
 *              title of the add drawer. `filters` is an optional node for the top row (the teacher's
 *              mentorship tabs).
 *   onChanged  students were added or removed (the teacher screen refreshes its tab counts)
 *
 * Mount it with key={api.key} so another roster never shows the previous one. Removing asks first.
 * The search, the table (rows on a phone) and an empty state with the one action to start are here.
 */
export default function RosterScreen({ api, describe, onChanged }) {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const compact = !useMediaQuery('(min-width: 900px)');
  const { data, students, loading, error, reload } = useRoster(api);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const heading = describe(data);
  const term = query.trim().toLowerCase();
  const shown = useMemo(() => students.filter((student) => matchesTerm(term, [student.name, student.rollNumber, student.email, student.department])), [students, term]);

  const changed = () => {
    reload();
    if (onChanged) onChanged();
  };

  const confirmRemove = async () => {
    setRemoveBusy(true);
    try {
      await api.remove([removing._id]);
      toast.success(`${removing.name} removed`);
      setRemoving(null);
      changed();
    } catch (failure) {
      toast.error(apiErrorMessage(failure, 'Could not remove the student'));
    } finally {
      setRemoveBusy(false);
    }
  };

  const closeRemove = () => {
    if (!removeBusy) setRemoving(null);
  };

  const addButton = (
    <Button variant="primary" startIcon={<UserPlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setAdding(true)} disabled={!data}>
      Add students
    </Button>
  );

  let body;
  if (loading && !data) {
    body = (
      <div className="ms-skeleton-gap" role="status" aria-busy="true" aria-label="Loading the students">
        <Skeleton height={44} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
      </div>
    );
  } else if (!data) {
    body = (
      <Notice
        tone="danger"
        title="We could not load the students"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error || 'Try again in a moment.'}
      </Notice>
    );
  } else if (students.length === 0) {
    body = <EmptyState icon={<UserPlusIcon size={28} weight="regular" />} title="No students yet" text="Add students by roll number. Upload a CSV or paste them." action={addButton} />;
  } else if (shown.length === 0) {
    body = (
      <EmptyState
        compact
        icon={<MagnifyingGlassIcon size={28} weight="regular" />}
        title="No students match your search"
        text={`Nobody in this list matches \u201c${query.trim()}\u201d.`}
        action={<Button onClick={() => setQuery('')}>Clear search</Button>}
      />
    );
  } else {
    body = (
      <>
        <p className="ms-results">{term ? `${formatNumber(shown.length)} of ${formatNumber(students.length)} students` : pluralize(students.length, 'student')}</p>
        <PeopleTable
          people={shown}
          compact={compact}
          caption="Students in this list"
          personLabel="Student"
          columns={COLUMNS}
          meta={metaOf}
          action={(student) => (
            <IconButton className="ms-remove" label={`Remove ${student.name}`} size="sm" tone="plain" onClick={() => setRemoving(student)}>
              <UserMinusIcon size={20} weight="regular" aria-hidden="true" />
            </IconButton>
          )}
        />
      </>
    );
  }

  return (
    <Page className="ms">
      <AdminTop
        crumbs={heading.crumbs}
        title={heading.title}
        description={heading.description}
        actions={addButton}
        label="Search students"
        search={<SearchField value={query} onChange={setQuery} placeholder="Search by name or roll number" label="Search students in this list" />}
        filters={heading.filters}
      />

      <div className="ms-body">{body}</div>

      {adding && data ? <AddStudentsDrawer api={api} description={heading.drawerDescription} onAdded={changed} onClose={() => setAdding(false)} /> : null}
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={closeRemove}
        busy={removeBusy}
        danger
        title={removing ? `Remove ${removing.name}?` : 'Remove student?'}
        description="They leave this mentor's list for this mentorship. Their account is not affected."
        confirmLabel="Remove student"
        onConfirm={confirmRemove}
      />
    </Page>
  );
}
