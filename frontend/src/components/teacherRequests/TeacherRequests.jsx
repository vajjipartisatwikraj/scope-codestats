import React, { useEffect, useRef, useState } from 'react';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Button, Card, ConfirmDialog, EmptyState, Notice, Page, PageHeader, Pagination, PillTabs, SkeletonRows, TextField, pluralize } from '../ui';
import './teacherRequests.css';
import RequestList from './RequestList';
import useTeacherRequests from './useTeacherRequests';

/**
 * Teacher requests (route /admin/teacher-requests, admins only). People who signed in from the
 * teacher page and asked for teacher access. Approving turns the person into a teacher; their
 * existing login keeps working and picks up the new role on its own.
 *
 * design/screens.md section 16: a page header with the count, a status segmented control (Pending,
 * Approved, Rejected), the table, pagination. Approve and Reject confirm in a dialog; Reject takes
 * an optional reason that the person sees. Below 900px the table becomes rows.
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

export default function TeacherRequests() {
  const compact = useMediaQuery('(max-width: 899.95px)');
  const { status, setStatus, requests, loading, error, load, decide } = useTeacherRequests();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deciding, setDeciding] = useState(null); // { request, action: 'approve' | 'reject' }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const bodyRef = useRef(null);

  // A shorter list (a decision, another tab) can leave the page number past the end
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(requests.length / pageSize));
    if (page > pages) setPage(pages);
  }, [requests.length, pageSize, page]);

  const changeStatus = (next) => {
    setStatus(next);
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
  const visible = requests.slice(first, first + pageSize);
  const empty = EMPTY[status];

  return (
    <Page className="tr">
      <PageHeader
        title="Teacher requests"
        count={loading || error ? undefined : `${pluralize(requests.length, 'request')} ${status}`}
        description="People who signed in from the teacher page and asked for teacher access. Approve only people you recognise: teachers can see and manage student data."
      />

      <Card flush>
        <h2 className="ui-sr">Requests</h2>
        <div className="tr-bar">
          <PillTabs role="radiogroup" label="Request status" items={STATUSES} value={status} onChange={changeStatus} />
        </div>

        <div ref={bodyRef} tabIndex={-1} className="tr-body" aria-busy={loading}>
          {loading ? (
            <SkeletonRows count={5} height={compact ? 120 : 56} />
          ) : error ? (
            <div className="tr-pad">
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
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={status === 'pending' ? <ClockIcon size={28} weight="regular" /> : <GraduationCapIcon size={28} weight="regular" />}
              title={empty.title}
              text={empty.text}
              action={<Button onClick={() => changeStatus(empty.next)}>{empty.nextLabel}</Button>}
            />
          ) : (
            <RequestList requests={visible} pending={status === 'pending'} compact={compact} onDecide={start} />
          )}
        </div>

        {!loading && !error && requests.length > 10 ? (
          <Pagination page={page} pageSize={pageSize} total={requests.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
        ) : null}
      </Card>

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
