import React from 'react';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { Avatar, Badge, IconButton, formatDate, relativeTime } from '../ui';
import { RoleIcon, roleInfo } from './manageUsersModel';

const dash = '\u2013';

export function RoleBadge({ role }) {
  const info = roleInfo(role);
  return (
    <Badge tone={info.tone} icon={<RoleIcon role={role} />}>
      {info.label}
    </Badge>
  );
}

/** The roll number first (it is what staff look people up by), then the email */
const metaOf = (person) => [person.rollNumber, person.email].filter(Boolean).join(' \u00b7 ') || dash;

/**
 * The users on this page: a compact table from 900px, a list of rows on a phone. Pressing a row
 * (or its Edit button) opens the drawer.
 *
 *   rows       the users to show
 *   phone      render rows instead of a table
 *   ownId      the signed-in admin's id, marked "You"
 *   onOpen(person)
 */
export default function UserTable({ rows, phone, ownId, onOpen }) {
  if (phone) {
    return (
      <ul className="ui-list">
        {rows.map((person) => (
          <li key={person._id} className="ui-list__row mu-row">
            <button type="button" className="mu-row__open" onClick={() => onOpen(person)} aria-label={`Open ${person.name}`}>
              <Avatar name={person.name} src={person.profilePicture} size={40} />
              <span className="mu-row__text">
                <span className="mu-row__name mu-name">
                  <span className="mu-name__text">{person.name}</span>
                  {person._id === ownId ? <Badge tone="info">You</Badge> : null}
                </span>
                <span className="mu-row__meta">{metaOf(person)}</span>
                <span className="mu-row__badges">
                  <RoleBadge role={person.userType} />
                  {person.department ? <span className="mu-row__meta">{person.department}</span> : null}
                </span>
              </span>
              <CaretRightIcon size={18} weight="bold" className="mu-row__caret" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table mu-table" data-density="compact">
        <caption className="ui-sr">Users, newest first. Press a row to open it.</caption>
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Role</th>
            <th scope="col">Department</th>
            <th scope="col">Graduating year</th>
            <th scope="col">Section</th>
            <th scope="col" className="mu-wide">
              Last active
            </th>
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((person) => (
            <tr key={person._id} className="mu-table__row" onClick={() => onOpen(person)}>
              <td className="mu-table__person">
                <div className="ui-table__cell-main">
                  <Avatar name={person.name} src={person.profilePicture} size={32} />
                  <div className="ui-table__cell-text">
                    <span className="ui-table__title mu-name">
                      <span className="mu-name__text">{person.name}</span>
                      {person._id === ownId ? <Badge tone="info">You</Badge> : null}
                    </span>
                    <span className="ui-table__meta">{metaOf(person)}</span>
                  </div>
                </div>
              </td>
              <td>
                <RoleBadge role={person.userType} />
              </td>
              <td>{person.department || dash}</td>
              <td className="mu-table__num">{person.graduatingYear || dash}</td>
              <td>{person.section || dash}</td>
              <td className="mu-wide mu-table__muted" title={person.lastActive ? formatDate(person.lastActive) : undefined}>
                {person.lastActive ? relativeTime(person.lastActive) : dash}
              </td>
              <td>
                <div className="ui-table__actions">
                  <IconButton
                    label={`Edit ${person.name}`}
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(person);
                    }}
                  >
                    <PencilSimpleIcon size={20} weight="regular" aria-hidden="true" />
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
