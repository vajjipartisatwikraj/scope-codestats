import React, { useEffect, useRef } from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Avatar, Badge, Checkbox, IconButton, SelectField, formatDateTime, relativeTime } from '../ui';

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
];

/** Whether the person has signed in yet: a word and an icon, never colour alone */
function Account({ entry }) {
  const account = entry.account;
  if (!account) {
    return (
      <Badge tone="neutral" icon={<ClockIcon size={14} weight="fill" aria-hidden="true" />}>
        Not signed in yet
      </Badge>
    );
  }
  return (
    <div className="acl-account">
      <Badge tone="success" icon={<CheckCircleIcon size={14} weight="fill" aria-hidden="true" />}>
        Has an account
      </Badge>
      <span className="acl-meta" title={account.lastLoginAt ? formatDateTime(account.lastLoginAt) : undefined}>
        {account.lastLoginAt ? `Last sign-in ${relativeTime(account.lastLoginAt)}` : 'No sign-in recorded'}
      </span>
    </div>
  );
}

function Who({ entry, size }) {
  return (
    <div className="ui-table__cell-main">
      <Avatar name={entry.account?.name || entry.email} size={size} />
      <div className="ui-table__cell-text">
        <span className="ui-table__title">{entry.email}</span>
        <span className="ui-table__meta">{entry.note || entry.account?.name || 'No note'}</span>
      </div>
    </div>
  );
}

function RoleSelect({ entry, onRole }) {
  return (
    <SelectField
      variant="pill"
      aria-label={`Role of ${entry.email}`}
      value={entry.role}
      onChange={(event) => onRole(entry, event.target.value)}
      options={ROLE_OPTIONS}
    />
  );
}

/** The header checkbox: dashed when only some rows of the page are selected */
function SelectAll({ checked, partly, onChange }) {
  const holder = useRef(null);
  useEffect(() => {
    const input = holder.current ? holder.current.querySelector('input') : null;
    if (input) input.indeterminate = partly;
  }, [partly, checked]);
  return (
    <span ref={holder}>
      <Checkbox label={<span className="ui-sr">Select every address on this page</span>} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </span>
  );
}

function Added({ entry }) {
  return (
    <div className="ui-table__cell-text">
      <span title={formatDateTime(entry.createdAt)}>{relativeTime(entry.createdAt)}</span>
      <span className="ui-table__meta">{entry.addedBy ? `by ${entry.addedBy.name || entry.addedBy.email}` : entry.source === 'existing-accounts' ? 'from existing accounts' : 'added by the system'}</span>
    </div>
  );
}

/**
 * The page of the list: a table from 900px, rows on a phone.
 *
 *   entries       the rows
 *   phone         render rows instead of a table
 *   selected      Set of selected ids
 *   onToggle(id)  select or unselect one row
 *   onToggleAll(checked)
 *   onRole(entry, role)
 *   onRemove(entry)
 */
export default function AccessTable({ entries, phone, selected, onToggle, onToggleAll, onRole, onRemove }) {
  const everyone = entries.length > 0 && entries.every((entry) => selected.has(entry._id));
  const some = entries.some((entry) => selected.has(entry._id));

  if (phone) {
    return (
      <ul className="ui-list">
        {entries.map((entry) => (
          <li key={entry._id} className="ui-list__row acl-row" data-selected={selected.has(entry._id) ? 'true' : undefined}>
            <Checkbox
              label={<span className="ui-sr">Select {entry.email}</span>}
              checked={selected.has(entry._id)}
              onChange={() => onToggle(entry._id)}
            />
            <div className="acl-row__body">
              <Who entry={entry} size={36} />
              <Account entry={entry} />
              <div className="acl-row__controls">
                <RoleSelect entry={entry} onRole={onRole} />
                <IconButton label={`Remove ${entry.email}`} tone="danger" size="sm" onClick={() => onRemove(entry)}>
                  <TrashIcon size={20} weight="regular" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table acl-table" data-density="compact">
        <caption className="ui-sr">Email addresses allowed to sign in, newest first</caption>
        <thead>
          <tr>
            <th scope="col" className="acl-check">
              <SelectAll checked={everyone} partly={some && !everyone} onChange={onToggleAll} />
            </th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Account</th>
            <th scope="col">Added</th>
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry._id} data-selected={selected.has(entry._id) ? 'true' : undefined}>
              <td className="acl-check">
                <Checkbox
                  label={<span className="ui-sr">Select {entry.email}</span>}
                  checked={selected.has(entry._id)}
                  onChange={() => onToggle(entry._id)}
                />
              </td>
              <td className="acl-table__who">
                <Who entry={entry} size={32} />
              </td>
              <td>
                <RoleSelect entry={entry} onRole={onRole} />
              </td>
              <td>
                <Account entry={entry} />
              </td>
              <td>
                <Added entry={entry} />
              </td>
              <td>
                <div className="ui-table__actions">
                  <IconButton label={`Remove ${entry.email}`} tone="danger" size="sm" onClick={() => onRemove(entry)}>
                    <TrashIcon size={20} weight="regular" aria-hidden="true" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
