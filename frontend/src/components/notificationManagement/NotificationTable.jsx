import React from 'react';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { UserIcon } from '@phosphor-icons/react/dist/csr/User';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { Badge, IconButton, formatDateTime, pluralize } from '../ui';
import { isGlobal } from './notificationFormat';

/** "Everyone" or "One student", with the icon, so the audience is never colour alone */
function AudienceBadge({ notification }) {
  return isGlobal(notification) ? (
    <Badge tone="info" icon={<UsersIcon size={14} weight="fill" aria-hidden="true" />}>
      Every student
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<UserIcon size={14} weight="fill" aria-hidden="true" />}>
      One student
    </Badge>
  );
}

/** Who exactly: how many people got a global one, or the name of the student */
function audienceDetail(notification) {
  if (isGlobal(notification)) return notification.recipientCount ? pluralize(notification.recipientCount, 'person', 'people') : 'Everyone';
  return notification.user?.name || 'Student not found';
}

/** Never, a date in the future (warning with a clock), or a date that has passed (Expired) */
function DeletionBadge({ value }) {
  if (!value) return <span className="nm-never">Never</span>;
  const passed = new Date(value).getTime() < Date.now();
  return passed ? (
    <Badge tone="danger" icon={<WarningIcon size={14} weight="fill" aria-hidden="true" />}>
      Expired {formatDateTime(value)}
    </Badge>
  ) : (
    <Badge tone="warning" icon={<ClockIcon size={14} weight="fill" aria-hidden="true" />}>
      {formatDateTime(value)}
    </Badge>
  );
}

function RowActions({ notification, onEdit, onDelete }) {
  return (
    <div className="ui-table__actions">
      <IconButton label={`Edit ${notification.title}`} size="sm" onClick={() => onEdit(notification)}>
        <PencilSimpleIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>
      <IconButton label={`Delete ${notification.title}`} size="sm" tone="danger" onClick={() => onDelete(notification)}>
        <TrashIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

/**
 * The notifications that were sent: a table from 900px, rows on a phone.
 *
 *   rows            the notifications to show
 *   phone           render rows instead of a table
 *   editingId       the notification loaded in the form, marked in its row
 *   onEdit, onDelete   called with the notification
 */
export default function NotificationTable({ rows, phone, editingId, onEdit, onDelete }) {
  if (phone) {
    return (
      <ul className="ui-list">
        {rows.map((notification) => (
          <li key={notification.id} className="ui-list__row nm-row" data-editing={notification.id === editingId ? 'true' : 'false'}>
            <div className="nm-row__main">
              <p className="nm-row__title">{notification.title}</p>
              <p className="nm-row__message">{notification.message}</p>
              <div className="nm-row__badges">
                <AudienceBadge notification={notification} />
                <span className="nm-row__detail">{audienceDetail(notification)}</span>
              </div>
              <p className="nm-row__detail">Sent {formatDateTime(notification.createdAt)}</p>
              <div className="nm-row__badges">
                <span className="nm-row__detail">Removes itself</span>
                <DeletionBadge value={notification.deletionTime} />
              </div>
            </div>
            <RowActions notification={notification} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table nm-table" data-density="compact">
        <caption className="ui-sr">Notifications that were sent, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Notification</th>
            <th scope="col">Audience</th>
            <th scope="col">Sent</th>
            <th scope="col">Removes itself</th>
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((notification) => (
            <tr key={notification.id} data-selected={notification.id === editingId ? 'true' : 'false'}>
              <td className="nm-table__main">
                <div className="ui-table__cell-text">
                  <span className="ui-table__title">{notification.title}</span>
                  <span className="ui-table__meta">{notification.message}</span>
                </div>
              </td>
              <td>
                <div className="nm-table__audience">
                  <AudienceBadge notification={notification} />
                  <span className="ui-table__meta">{audienceDetail(notification)}</span>
                </div>
              </td>
              <td className="nm-table__date">{formatDateTime(notification.createdAt)}</td>
              <td>
                <DeletionBadge value={notification.deletionTime} />
              </td>
              <td>
                <RowActions notification={notification} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
