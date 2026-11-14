import React, { useMemo, useState } from 'react';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { HandshakeIcon } from '@phosphor-icons/react/dist/csr/Handshake';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { apiErrorMessage, mentorshipApi } from '../../../services/mentorshipApi';
import useAutoHideScrollbars from '../../../hooks/useAutoHideScrollbars';
import useRemote from '../../../hooks/useRemote';
import { AdminCardGrid, AdminTop, Button, Card, EmptyState, Notice, Page, SearchField, SelectField, pluralize } from '../../ui';
import { SORTS, matchesTerm, sortMentorships } from '../model/mentorshipModel';
import '../mentorships.css';
import DeleteMentorshipDialog from './DeleteMentorshipDialog';
import MentorshipCard, { MentorshipCardSkeleton } from './MentorshipCard';
import MentorshipFormDrawer from './MentorshipFormDrawer';

const SKELETON_CARDS = 6;
const messageOf = (failure) => apiErrorMessage(failure, 'Could not load the mentorships');

/**
 * Mentorships (route /admin/mentorships, admins): the programmes in which teachers mentor students.
 * An admin creates a mentorship here, then opens it (Manage) to choose its teachers. The teachers
 * choose their own students.
 *
 * The fixed top every admin screen has (AdminTop), then a card per mentorship: the number of
 * students, the mentors and the start date, a Manage button and a three-dot menu (Edit, Delete). With
 * none yet the screen says what a mentorship is and offers the one action to start. Works on a phone.
 */
export default function MentorshipList() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const { data, loading, error, reload } = useRemote((signal) => mentorshipApi.list({ signal }), [], true, messageOf);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [form, setForm] = useState(null); // { mentorship } to edit, {} to create
  const [deleting, setDeleting] = useState(null);

  const mentorships = useMemo(() => (data && data.mentorships) || [], [data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortMentorships(
      mentorships.filter((item) => matchesTerm(term, [item.name, item.description])),
      sort
    );
  }, [mentorships, search, sort]);

  const firstLoad = loading && !data;
  const empty = !firstLoad && !error && mentorships.length === 0;

  let body;
  if (firstLoad) {
    body = (
      <div className="ui-grid" role="status" aria-label="Loading mentorships">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <MentorshipCardSkeleton key={index} />
        ))}
      </div>
    );
  } else if (error && !data) {
    body = (
      <Notice
        tone="danger"
        title="We could not load the mentorships"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (empty) {
    body = (
      <Card>
        <EmptyState
          icon={<HandshakeIcon size={28} weight="regular" />}
          title="Create your first mentorship"
          text="A mentorship is a programme in which chosen teachers each mentor a group of students. Create it, then choose its teachers."
        />
      </Card>
    );
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No mentorships match"
        text={`Nothing fits \u201c${search.trim()}\u201d. Try a different search.`}
        action={
          <Button variant="secondary" onClick={() => setSearch('')}>
            Clear search
          </Button>
        }
      />
    );
  } else {
    body = (
      <AdminCardGrid label="Mentorships">
        {visible.map((item) => (
          <MentorshipCard key={item._id} mentorship={item} onEdit={(mentorship) => setForm({ mentorship })} onDelete={setDeleting} />
        ))}
      </AdminCardGrid>
    );
  }

  return (
    <Page className="ms">
      <AdminTop
        title="Mentorships"
        count={data && mentorships.length > 0 ? pluralize(mentorships.length, 'mentorship') : undefined}
        description="Programmes where teachers mentor groups of students."
        actions={
          <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setForm({})}>
            Create mentorship
          </Button>
        }
        label="Search and sort mentorships"
        search={<SearchField value={search} onChange={setSearch} placeholder="Search mentorships" label="Search mentorships by name or description" />}
        filters={<SelectField variant="pill" aria-label="Sort mentorships" value={sort} onChange={(event) => setSort(event.target.value)} options={SORTS} />}
      />

      {body}

      {form ? <MentorshipFormDrawer key={form.mentorship?._id || 'new'} mentorship={form.mentorship} onSaved={reload} onClose={() => setForm(null)} /> : null}
      <DeleteMentorshipDialog mentorship={deleting} onClose={() => setDeleting(null)} onDeleted={reload} />
    </Page>
  );
}
