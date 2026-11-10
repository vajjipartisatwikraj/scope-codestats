import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import useAutoHideScrollbars from '../../hooks/useAutoHideScrollbars';
import useMediaQuery from '../../hooks/useMediaQuery';
import { AdminTop, Button, ConfirmDialog, EmptyState, Notice, Page, Pagination, PillTabs, SearchField, SkeletonRows, TextField, pluralize } from '../ui';
import './teacherRequests.css';
import RequestList from './RequestList';
import useTeacherRequests from './useTeacherRequests';

/**
 * Teacher requests (route /admin/teacher-requests, admins only). People who signed in from the
 * teacher page and asked for teacher access. Approving turns the person into a teacher; their
 * existing login keeps working and picks up the new role on its own.
 *
 * design/screens.md section 16: the fixed admin top (AdminTop: the title with the count and the
 * tagline; then the search at the left and the status switch Pending, Approved, Rejected at the
 * right end), then the table with no box around it, and pagination. Approve and Reject confirm in
 * a dialog; Reject takes an optional reason that the person sees. Below 900px the table becomes rows.
 */

const STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const EMPTY = {
  pending: { title: 'No requests are waiting', text: 'New requests appear here when someone asks for teacher access.', next: 'approved', nextLabel: 'See approved requests' },
  approved: { title: 'No approved requests', text: 'People you give teacher access to are listed here.', next: 'pending', nextLabel: 'Back to pending requests' },
  rejected: { title: 'No rejected requests', text: 'Requests you turn down are listed here, with your reason.', next: 'pending', nextLabel: 'Back to pending requests' },
};

const lower = (value) => String(value || '').toLowerCase();

export default function TeacherRequests() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const compact = useMediaQuery('(max-width: 899.95px)');
  const { status, setStatus, requests, loading, error, load, decide } = useTeacherRequests();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deciding, setDeciding] = useState(null); // { request, action: 'approve' | 'reject' }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const bodyRef = useRef(null);

  const term = search.trim().toLowerCase();
  const matching = useMemo(
    () => (term ? requests.filter((request) => [request.user?.name, request.user?.email, request.note, request.rejectionReason].some((value) => lower(value).includes(term))) : requests),
    [requests, term]
  );

  // A shorter list (a decision, a search, another tab) can leave the page number past the end
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(matching.length / pageSize));
    if (page > pages) setPage(pages);
  }, [matching.length, pageSize, page]);

  const changeStatus = (next) => {
    setStatus(next);
    setPage(1);
  };

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const start = (request, action) => {
    setReason('');
    setDeciding({ request, action });
  };

  const close = () => {
    if (busy) return;
    setDeciding(null);
    setReason('');
  };

  const confirm = async () => {
    const { request, action } = deciding;
    setBusy(true);
    const result = await decide(request, action, reason);
    setBusy(false);
    if (result.ok || result.stale) {
      setDeciding(null);
      setReason('');
      if (result.ok) setAnnouncement(result.message);
      // The row that had focus is gone: keep the keyboard on the list
      window.requestAnimationFrame(() => bodyRef.current && bodyRef.current.focus());
    }
  };

  const approving = deciding && deciding.action === 'approve';
  const person = deciding ? deciding.request.user || {} : {};
  const first = (page - 1) * pageSize;
  const visible = matching.slice(first, first + pageSize);
  const empty = EMPTY[status];

  let body;
  if (loading) {
    body = <SkeletonRows count={5} height={compact ? 120 : 64} />;
  } else if (error) {
    body = (
      <Notice
        tone="danger"
        title="We could not load the requests"
        action={
          <Button variant="ghost" size="sm" onClick={load}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (requests.length === 0) {
    body = (
      <EmptyState
        icon={status === 'pending' ? <ClockIcon size={28} weight="regular" /> : <GraduationCapIcon size={28} weight="regular" />}
        title={empty.title}
        text={empty.text}
        action={<Button onClick={() => changeStatus(empty.next)}>{empty.nextLabel}</Button>}
      />
    );
  } else if (matching.length === 0) {
    body = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No requests match"
        text={`Nothing fits \u201c${search.trim()}\u201d. Try a different search.`}
        action={<Button onClick={() => changeSearch('')}>Clear search</Button>}
      />
    );
  } else {
    body = <RequestList requests={visible} pending={status === 'pending'} compact={compact} onDecide={start} />;
  }

  return (
    <Page className="tr">
      <AdminTop
        title="Teacher requests"
        count={loading || error ? undefined : `${pluralize(requests.length, 'request')} ${status}`}
        description="Approve only people you recognise: teachers can see student data."
        label="Search requests and choose a status"
        search={<SearchField value={search} onChange={changeSearch} placeholder="Search by name, email or note" label="Search requests by name, email or note" />}
        filters={<PillTabs role="radiogroup" label="Request status" items={STATUSES} value={status} onChange={changeStatus} />}
      />

      <div ref={bodyRef} tabIndex={-1} className="tr-body" aria-busy={loading}>
        {body}
      </div>

      {!loading && !error && matching.length > 10 ? (
        <Pagination page={page} pageSize={pageSize} total={matching.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      ) : null}

      <p className="ui-sr" role="status" aria-live="polite">
        {announcement}
      </p>

      <ConfirmDialog
        open={Boolean(deciding)}
        onClose={close}
        busy={busy}
        title={approving ? `Approve ${person.name || 'this request'}?` : 'Reject this request?'}
        description={
          approving
            ? `${person.name || 'This person'} becomes a teacher: they can manage cohorts and tests and see student data. They get access automatically, with no new sign-in.`
            : `${person.name || 'This person'} (${person.email || 'no email'}) will not get teacher access. They see your reason, if you give one.`
        }
        confirmLabel={approving ? 'Approve request' : 'Reject request'}
        danger={!approving}
        onConfirm={confirm}
      >
        {approving ? null : (
          <TextField
            label="Reason (optional)"
            hint="The person sees this."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            multiline
            rows={3}
            disabled={busy}
          />
        )}
      </ConfirmDialog>
    </Page>
  );
}
