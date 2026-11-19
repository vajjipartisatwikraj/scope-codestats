import React from 'react';
import { Switch } from './Field';

/**
 * NotifySwitch: the "email this person" choice of a confirmation dialog (Suspend accounts, Manage
 * users). On by default in the dialogs that use it. The sentence under the label says what the person
 * gets, or that they are not told, and that the email is kept in the Emails history.
 *
 *   label      what the admin reads, for example "Email the student about this"
 *   name       the person's name, for the sentence under the label
 *   receives   what they get, finishing "<name> gets ...": "an email that says what was removed."
 *   checked, onChange(checked)
 *   disabled   while the action is running
 */
export default function NotifySwitch({ label, name, receives, checked, onChange, disabled }) {
  return (
    <Switch
      label={label}
      description={checked ? `${name} gets ${receives} It is recorded in Emails history.` : `${name} is not told. Nothing is recorded in Emails history.`}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
