import React, { useMemo, useState } from 'react';
import { HandshakeIcon } from '@phosphor-icons/react/dist/csr/Handshake';
import { apiErrorMessage, myMentorshipApi, myRoster } from '../../../services/mentorshipApi';
import useAutoHideScrollbars from '../../../hooks/useAutoHideScrollbars';
import useRemote from '../../../hooks/useRemote';
import { AdminTop, Button, Card, EmptyState, Notice, Page, PillTabs, Skeleton, formatDate, formatNumber } from '../../ui';
import { isUpcoming } from '../model/mentorshipModel';
import '../mentorships.css';
import RosterScreen from '../roster/RosterScreen';

const messageOf = (failure) => apiErrorMessage(failure, 'Could not load your mentorships');

/**
 * My students (route /admin/my-students, teachers): the students a teacher mentors, one list per
 * mentorship they were chosen for. The top row has a tab for each mentorship with its student count;
 * the list below is the shared RosterScreen, where the teacher adds students by roll number (CSV or
 * paste) and removes them. A teacher is always themselves: the server decides who they are, never
 * the page.
 *
 * A teacher chosen for no mentorship sees an explanation instead.
 */
export default function MyStudents() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const { data, loading, error, reload } = useRemote((signal) => myMentorshipApi.list({ signal }), [], true, messageOf);
  const [chosen, setChosen] = useState('');

  const mentorships = useMemo(() => (data && data.mentorships) || [], [data]);
  const current = mentorships.find((item) => item._id === chosen) || mentorships[0] || null;
  const currentId = current ? current._id : null;
  const api = useMemo(() => (currentId ? myRoster(currentId) : null), [currentId]);

  const tabs = mentorships.map((item) => ({
    key: item._id,
    label: (
      <>
        {item.name}
        <span className="ms-count">{formatNumber(item.studentCount || 0)}</span>
      </>
    ),
  }));

  if (api) {
    const describe = () => ({
      title: 'My students',
      description: [current.description || `Your students in ${current.name}`, current.startsAt ? `${isUpcoming(current) ? 'Starts' : 'Started'} ${formatDate(current.startsAt)}` : null].filter(Boolean).join(' \u00b7 '),
      drawerDescription: current.name,
      filters: <PillTabs items={tabs} value={current._id} onChange={setChosen} label="Mentorship" role="radiogroup" />,
    });
    // The roster refreshes the counts on the tabs when students are added or removed
    return <RosterScreen key={api.key} api={api} describe={describe} onChanged={reload} />;
  }

  let body;
  if (loading && !data) {
    body = (
      <div className="ms-skeleton-gap" role="status" aria-busy="true" aria-label="Loading your mentorships">
        <Skeleton height={44} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
      </div>
    );
  } else if (error && !data) {
    body = (
      <Notice
        tone="danger"
        title="We could not load your mentorships"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else {
    body = (
      <Card>
        <EmptyState
          icon={<HandshakeIcon size={28} weight="regular" />}
          title="You are not a mentor yet"
          text="When an admin chooses you for a mentorship, it appears here and you can add your students."
        />
      </Card>
    );
  }

  return (
    <Page className="ms">
      <AdminTop title="My students" description="The students you mentor, by mentorship." />
      {body}
    </Page>
  );
}
