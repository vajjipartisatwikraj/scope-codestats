import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { Avatar, Badge, Button, formatDateTime, relativeTime } from '../ui';

/** The person a row is about: picture, name and email */
function Person({ user }) {
  const person = user || {};
  return (
    <div className="ui-table__cell-main">
      <Avatar name={person.name} src={person.profilePicture || undefined} size={40} />
      <div className="ui-table__cell-text">
        <span className="ui-table__title">{person.name || 'Unknown person'}</span>
        <span className="ui-table__meta">{person.email}</span>
      </div>
    </div>
  );
}

/** When the request was made: "2 days ago", with the exact time beneath */
function Requested({ value }) {
  return (
    <div className="ui-table__cell-text">
      <span>{relativeTime(value)}</span>
      <span className="ui-table__meta">{formatDateTime(value)}</span>
    </div>
  );
}

/** What happened to a request that is no longer pending: a badge with a word, who and when, and the reason */
function Decision({ request }) {
  const approved = request.status === 'approved';
  return (
    <div className="tr-decision">
      <Badge
        tone={approved ? 'success' : 'danger'}
        icon={approved ? <CheckCircleIcon size={14} weight="fill" aria-hidden="true" /> : <XCircleIcon size={14} weight="fill" aria-hidden="true" />}
      >
        {approved ? 'Approved' : 'Rejected'}
      </Badge>
      <span className="tr-decision__meta">
        {formatDateTime(request.reviewedAt)}
        {request.reviewedBy ? ` by ${request.reviewedBy.name}` : ''}
      </span>
      {request.rejectionReason ? <span className="tr-decision__meta">Reason: {request.rejectionReason}</span> : null}
    </div>
  );
}

function Actions({ request, onDecide }) {
  const name = request.user?.name || 'this person';
  return (
    <div className="tr-actions">
      <Button size="sm" startIcon={<CheckIcon size={18} weight="bold" aria-hidden="true" />} aria-label={`Approve ${name}`} onClick={() => onDecide(request, 'approve')}>
        Approve
      </Button>
      <Button size="sm" startIcon={<XIcon size={18} weight="bold" aria-hidden="true" />} aria-label={`Reject ${name}`} onClick={() => onDecide(request, 'reject')}>
        Reject
      </Button>
    </div>
  );
}

const Note = ({ note }) => (note ? <p className="tr-note">{note}</p> : <span className="ui-muted">No note</span>);

/**
 * The requests as a table (900px and wider) or as rows (phones).
 *
 *   requests   the rows of the current page
 *   pending    the pending tab: rows have Approve and Reject; otherwise they show the decision
 *   compact    render rows instead of a table
 *   onDecide(request, 'approve' | 'reject')
 */
export default function RequestList({ requests, pending, compact, onDecide }) {
  if (compact) {
    return (
      <ul className="ui-list tr-list">
        {requests.map((request) => (
          <li key={request._id} className="tr-item">
            <Person user={request.user} />
            <Note note={request.note} />
            <p className="tr-item__when">Requested {relativeTime(request.createdAt)}</p>
            {pending ? <Actions request={request} onDecide={onDecide} /> : <Decision request={request} />}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-band-table">
        <caption className="ui-sr">{pending ? 'Requests waiting for a decision' : 'Requests that have been decided'}</caption>
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Note</th>
            <th scope="col">Requested</th>
            <th scope="col">{pending ? 'Decision needed' : 'Decision'}</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request._id}>
              <td>
                <Person user={request.user} />
              </td>
              <td className="tr-note-cell">
                <Note note={request.note} />
              </td>
              <td>
                <Requested value={request.createdAt} />
              </td>
              <td>{pending ? <Actions request={request} onDecide={onDecide} /> : <Decision request={request} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
