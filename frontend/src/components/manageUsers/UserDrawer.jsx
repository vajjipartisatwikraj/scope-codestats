import React, { useEffect, useState } from 'react';
import { Avatar, Badge, Button, Drawer, SelectField, formatDate, formatDateTime, formatNumber } from '../ui';
import { ROLES, roleInfo } from './manageUsersModel';
import { RoleBadge } from './UserTable';

const dash = '\u2013';

/**
 * The 480px drawer of one person (design/screens.md section 16): who they are, the facts the server
 * holds, and the role. Choosing another role and pressing "Change role" hands the change to the
 * page, which asks for confirmation naming the person and the consequence. The server refuses a
 * change to your own role, so that select is locked and says why.
 *
 *   open, onClose
 *   person          the user shown (kept while the drawer closes)
 *   isOwn           this is the signed-in admin
 *   onChangeRole(person, newRole)
 */
export default function UserDrawer({ open, onClose, person, isOwn, onChangeRole }) {
  const [role, setRole] = useState(person ? person.userType : 'user');

  // A different person (or a role that changed) resets the choice
  useEffect(() => {
    if (person) setRole(person.userType);
  }, [person]);

  if (!person) return null;

  const unchanged = role === person.userType;
  const details = [
    ['Roll number', person.rollNumber || dash],
    ['Department', person.department || dash],
    ['Graduating year', person.graduatingYear || dash],
    ['Section', person.section || dash],
    ['Joined', formatDate(person.createdAt)],
    ['Last active', person.lastActive ? formatDateTime(person.lastActive) : dash],
    ['Total score', formatNumber(person.totalScore)],
  ];

  return (
    <Drawer
      open={open}
      tone="accent"
      onClose={onClose}
      title={person.name}
      description={person.email}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={isOwn || unchanged} onClick={() => onChangeRole(person, role)}>
            Change role
          </Button>
        </>
      }
    >
      <div className="mu-drawer">
        <div className="mu-drawer__identity">
          <Avatar name={person.name} src={person.profilePicture} size={48} />
          <div className="mu-drawer__who">
            <RoleBadge role={person.userType} />
            {isOwn ? <Badge tone="info">You</Badge> : null}
          </div>
        </div>

        <section className="mu-drawer__section" aria-labelledby="mu-role-heading">
          <h3 className="mu-drawer__heading" id="mu-role-heading">
            Role
          </h3>
          <SelectField
            label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={isOwn}
            hint={isOwn ? 'You cannot change your own role.' : `${roleInfo(role).label}: ${roleInfo(role).grants}.`}
            options={ROLES.map((option) => ({ value: option.value, label: option.label }))}
          />
        </section>

        <section className="mu-drawer__section" aria-labelledby="mu-details-heading">
          <h3 className="mu-drawer__heading" id="mu-details-heading">
            Details
          </h3>
          <dl className="mu-facts">
            {details.map(([label, value]) => (
              <div key={label} className="mu-facts__row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Drawer>
  );
}
