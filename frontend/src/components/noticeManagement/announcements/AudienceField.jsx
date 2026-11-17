import React, { useEffect, useState } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { Checkbox, Notice, SelectField, SkeletonRows } from '../../ui';
import { userGroupApi } from '../../../services/userGroupApi';
import { AUDIENCES } from './announcementFormat';

/**
 * Who an announcement is for: a dropdown (everyone, students, teachers and admins, or specific user
 * groups) and, for groups, a checklist of the user groups that exist. The groups are read the first
 * time "Specific user groups" is chosen.
 *
 *   audience, userGroups   the form's values ('all' | 'students' | 'teachers' | 'groups', and group ids)
 *   error                  the sentence under the checklist ("Choose at least one user group.")
 *   onChange(field, value) field is 'audience' or 'userGroups'
 *   disabled               while the form is saving
 *   idPrefix               makes the ids unique per drawer
 */
export default function AudienceField({ audience, userGroups, error, onChange, disabled, idPrefix }) {
  const [state, setState] = useState({ groups: [], loading: false, failed: false, asked: false });

  useEffect(() => {
    if (audience !== 'groups' || state.asked) return undefined;
    let current = true;
    setState((now) => ({ ...now, loading: true, asked: true }));
    userGroupApi
      .list()
      .then((data) => current && setState({ groups: data.userGroups || [], loading: false, failed: false, asked: true }))
      .catch(() => current && setState({ groups: [], loading: false, failed: true, asked: true }));
    return () => {
      current = false;
    };
  }, [audience, state.asked]);

  const toggle = (id) => onChange('userGroups', userGroups.includes(id) ? userGroups.filter((entry) => entry !== id) : [...userGroups, id]);

  let groups = null;
  if (audience === 'groups') {
    if (state.loading) groups = <SkeletonRows count={3} height={40} />;
    else if (state.failed) groups = <Notice tone="danger" title="The user groups did not load">Close this form and open it again to retry.</Notice>;
    else if (state.groups.length === 0) groups = <Notice tone="info" title="No user groups yet">Create a user group first, then choose it here.</Notice>;
    else {
      groups = (
        <fieldset className="nm-fieldset" aria-describedby={error ? `${idPrefix}-groups-error` : undefined}>
          <legend className="nm-fieldset__legend">User groups</legend>
          <ul className="nm-groups">
            {state.groups.map((group) => (
              <li key={group._id}>
                <Checkbox label={`${group.name} (${group.memberCount} roll numbers)`} checked={userGroups.includes(group._id)} onChange={() => toggle(group._id)} disabled={disabled} />
              </li>
            ))}
          </ul>
          {error ? (
            <p className="ui-field__error" id={`${idPrefix}-groups-error`} role="alert">
              <span>{error}</span>
            </p>
          ) : null}
        </fieldset>
      );
    }
  }

  return (
    <>
      <SelectField id={`${idPrefix}-audience`} label="Who sees it" value={audience} onChange={(event) => onChange('audience', event.target.value)} options={AUDIENCES} disabled={disabled} />
      {groups}
    </>
  );
}
