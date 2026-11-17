import React from 'react';
import { TextField } from '../../ui';

/**
 * The two groups of fields that an alert and an announcement share, used inside the create and edit
 * drawers. Each takes the form's values and one change handler, so a drawer keeps its own state.
 *
 *   values      the form: { startsAt, endsAt } for the window, { buttonText, buttonUrl } for the button
 *   errors      { field: sentence } from noticeFormat.checkWindow / checkButton
 *   onChange(field, value)
 *   disabled    while the form is saving
 *   idPrefix    makes the field ids unique per drawer ("al" gives "al-startsAt")
 */

/** When the notice starts and ends: two datetime-local fields side by side (stacked on a phone) */
export function WindowFields({ values, errors, onChange, disabled, idPrefix }) {
  return (
    <div className="nm-pair">
      <TextField
        id={`${idPrefix}-startsAt`}
        type="datetime-local"
        label="Starts"
        required
        value={values.startsAt}
        onChange={(event) => onChange('startsAt', event.target.value)}
        error={errors.startsAt}
        disabled={disabled}
      />
      <TextField
        id={`${idPrefix}-endsAt`}
        type="datetime-local"
        label="Ends"
        required
        value={values.endsAt}
        onChange={(event) => onChange('endsAt', event.target.value)}
        error={errors.endsAt}
        disabled={disabled}
      />
    </div>
  );
}

/** The optional button: its text and the link it opens. Both or neither. */
export function ButtonFields({ values, errors, onChange, disabled, idPrefix }) {
  return (
    <>
      <TextField
        id={`${idPrefix}-buttonText`}
        label="Button text (optional)"
        maxLength={40}
        placeholder="Register now"
        value={values.buttonText}
        onChange={(event) => onChange('buttonText', event.target.value)}
        error={errors.buttonText}
        disabled={disabled}
      />
      <TextField
        id={`${idPrefix}-buttonUrl`}
        label="Button link (optional)"
        maxLength={500}
        placeholder="https://example.com or /cohorts"
        hint="An https:// address opens in a new tab. A path such as /cohorts opens inside the app."
        value={values.buttonUrl}
        onChange={(event) => onChange('buttonUrl', event.target.value)}
        error={errors.buttonUrl}
        disabled={disabled}
      />
    </>
  );
}
