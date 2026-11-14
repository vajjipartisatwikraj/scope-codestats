import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChalkboardTeacherIcon } from '@phosphor-icons/react/dist/csr/ChalkboardTeacher';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { apiErrorMessage, mentorshipApi } from '../../../services/mentorshipApi';
import useAutoHideScrollbars from '../../../hooks/useAutoHideScrollbars';
import useMediaQuery from '../../../hooks/useMediaQuery';
import useRemote from '../../../hooks/useRemote';
import { AdminTop, Badge, Button, EmptyState, Notice, Page, SearchField, Skeleton, formatDate, formatNumber, pluralize } from '../../ui';
import { LIST_PATH, matchesTerm, rosterPath } from '../model/mentorshipModel';
import '../mentorships.css';
import PeopleTable from '../shared/PeopleTable';
import AssignTeachersDrawer from './AssignTeachersDrawer';

const messageOf = (failure) => apiErrorMessage(failure, 'Could not load the mentorship');

const COLUMNS = [
  { key: 'department', label: 'Department', render: (mentor) => (mentor.department ? <Badge>{mentor.department}</Badge> : <span className="ms-none">Not set</span>) },
  { key: 'students', label: 'Students', className: 'ui-num', render: (mentor) => formatNumber(mentor.studentCount || 0) },
];

/**
 * One mentorship, on its own page (route /admin/mentorships/:typeId, opened by the Manage button of
 * its card). The top shows the path "/ Mentorships / Name", the tagline and the "Assign teachers"
 * button; the search sits below it. The table lists the mentors (the teachers chosen for it) with how
 * many students each holds, and "Manage students" opens that mentor's list.
 */
export default function MentorshipPage() {
  const { typeId } = useParams();
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const compact = !useMediaQuery('(min-width: 900px)');
  const { data, loading, error, reload } = useRemote((signal) => mentorshipApi.get(typeId, { signal }), [typeId], true, messageOf);
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState(false);

  const mentorship = data ? data.mentorship : null;
  const mentors = useMemo(() => (data && data.mentors) || [], [data]);
  const term = query.trim().toLowerCase();
  const shown = useMemo(() => mentors.filter((mentor) => matchesTerm(term, [mentor.name, mentor.email, mentor.department])), [mentors, term]);

  const assignButton = (
    <Button variant="primary" startIcon={<ChalkboardTeacherIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setAssigning(true)} disabled={!mentorship}>
      Assign teachers
    </Button>
  );

  const manageLink = (mentor) => (
    <Button as={Link} to={rosterPath(typeId, mentor._id)} size="sm" aria-label={`Manage students of ${mentor.name}`}>
      Manage students
    </Button>
  );

  let body;
  if (loading && !data) {
    body = (
      <div className="ms-skeleton-gap" role="status" aria-busy="true" aria-label="Loading the mentorship">
        <Skeleton height={44} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
      </div>
    );
  } else if (!data) {
    body = (
      <Notice
        tone="danger"
        title="We could not open this mentorship"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error || 'Try again in a moment.'}
      </Notice>
    );
  } else if (mentors.length === 0) {
    body = <EmptyState icon={<ChalkboardTeacherIcon size={28} weight="regular" />} title="No teachers yet" text="Choose the teachers who can mentor in this mentorship. Each one then picks their own students." action={assignButton} />;
  } else if (shown.length === 0) {
    body = (
      <EmptyState
        compact
        icon={<MagnifyingGlassIcon size={28} weight="regular" />}
        title="No teachers match your search"
        text={`Nobody here matches \u201c${query.trim()}\u201d.`}
        action={<Button onClick={() => setQuery('')}>Clear search</Button>}
      />
    );
  } else {
    body = (
      <>
        <p className="ms-results">{term ? `${formatNumber(shown.length)} of ${formatNumber(mentors.length)} mentors` : `${pluralize(mentors.length, 'mentor')} holding ${pluralize(mentorship.studentCount, 'student')}`}</p>
        <PeopleTable
          people={shown}
          compact={compact}
          caption="Mentors of this mentorship"
          personLabel="Mentor"
          columns={COLUMNS}
          meta={(mentor) => [mentor.department, pluralize(mentor.studentCount || 0, 'student')].filter(Boolean).join(' \u00b7 ')}
          action={manageLink}
          wideAction
        />
      </>
    );
  }

  return (
    <Page className="ms">
      <AdminTop
        crumbs={[{ label: 'Mentorships', to: LIST_PATH }, { label: mentorship ? mentorship.name : 'Mentorship' }]}
        title={mentorship ? mentorship.name : 'Mentorship'}
        description={mentorship ? [mentorship.description, mentorship.startsAt ? `Starts ${formatDate(mentorship.startsAt)}` : null].filter(Boolean).join(' \u00b7 ') : undefined}
        actions={assignButton}
        label="Search mentors"
        search={<SearchField value={query} onChange={setQuery} placeholder="Search by name or email" label="Search mentors of this mentorship" />}
      />

      <div className="ms-body">{body}</div>

      {assigning && mentorship ? <AssignTeachersDrawer mentorship={mentorship} chosen={mentors.map((mentor) => mentor._id)} onSaved={reload} onClose={() => setAssigning(false)} /> : null}
    </Page>
  );
}
