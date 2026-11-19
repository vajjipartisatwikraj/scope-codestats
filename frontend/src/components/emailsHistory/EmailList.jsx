import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CircleNotchIcon } from '@phosphor-icons/react/dist/csr/CircleNotch';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { Avatar, Badge, Button, formatDateTime, relativeTime } from '../ui';
import { STATUS, typeLabel } from './emailFormat';

const STATUS_ICONS = {
  sent: <CheckCircleIcon size={14} weight="fill" aria-hidden="true" />,
  failed: <WarningCircleIcon size={14} weight="fill" aria-hidden="true" />,
  sending: <CircleNotchIcon size={14} weight="bold" aria-hidden="true" />,
};

/** The status as one badge: a word and an icon, never colour alone */
export function StatusBadge({ status }) {
  const entry = STATUS[status] || STATUS.sending;
  return (
    <Badge tone={entry.tone} icon={STATUS_ICONS[status] || STATUS_ICONS.sending}>
      {entry.label}
    </Badge>
  );
}

/** Who the email went to: picture (their initials), name and address */
function Recipient({ email }) {
  return (
    <div className="ui-table__cell-main">
      <Avatar name={email.recipientName || email.to} size={40} />
      <div className="ui-table__cell-text">
        <span className="ui-table__title">{email.recipientName || 'Unknown person'}</span>
        <span className="ui-table__meta">{email.to}</span>
      </div>
    </div>
  );
}

/** What it was: the subject, and the kind of email under it */
function Subject({ email }) {
  return (
    <div className="ui-table__cell-text">
      <span className="eh-subject">{email.subject}</span>
      <span className="ui-table__meta">{typeLabel(email.type)}</span>
    </div>
  );
}

/** When it was sent: "2 hours ago", with the exact time beneath */
function When({ email }) {
  const at = email.sentAt || email.createdAt;
  return (
    <div className="ui-table__cell-text">
      <span>{relativeTime(at)}</span>
      <span className="ui-table__meta">{formatDateTime(at)}</span>
    </div>
  );
}

/** The status, and for a failure the reason in one line */
function Result({ email }) {
  return (
    <div className="eh-result">
      <StatusBadge status={email.status} />
      {email.status === 'failed' && email.error ? <span className="eh-result__error">{email.error}</span> : null}
    </div>
  );
}

function ViewButton({ email, opening, onOpen }) {
  return (
    <Button size="sm" loading={opening} startIcon={<EyeIcon size={18} weight="regular" aria-hidden="true" />} aria-label={`View the email to ${email.recipientName || email.to}`} onClick={() => onOpen(email)}>
      View
    </Button>
  );
}

/**
 * The emails as a band table (900px and wider) or as rows (phones).
 *
 *   emails     the rows of the current page
 *   compact    render rows instead of a table
 *   openingId  the email whose detail is loading (its button shows the spinner)
 *   onOpen(email)   opens the detail panel
 */
export default function EmailList({ emails, compact, openingId, onOpen }) {
  if (compact) {
    return (
      <ul className="ui-list eh-list">
        {emails.map((email) => (
          <li key={email._id} className="eh-item">
            <Recipient email={email} />
            <Subject email={email} />
            <Result email={email} />
            <p className="eh-item__when">
              {relativeTime(email.sentAt || email.createdAt)}
              {email.sentBy ? ` by ${email.sentBy.name}` : ''}
            </p>
            <ViewButton email={email} opening={openingId === email._id} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-band-table">
        <caption className="ui-sr">Emails the platform sent, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Sent to</th>
            <th scope="col">Email</th>
            <th scope="col">Status</th>
            <th scope="col">Sent</th>
            <th scope="col">Sent by</th>
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email._id}>
              <td>
                <Recipient email={email} />
              </td>
              <td className="eh-subject-cell">
                <Subject email={email} />
              </td>
              <td>
                <Result email={email} />
              </td>
              <td>
                <When email={email} />
              </td>
              <td>{email.sentBy ? email.sentBy.name : <span className="ui-muted">System</span>}</td>
              <td>
                <ViewButton email={email} opening={openingId === email._id} onOpen={onOpen} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
