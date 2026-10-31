import React from 'react';
import { Avatar, SelectField, TextField } from '../../ui';
import { SECTIONS, departmentOptions, graduationYearFromRoll } from '../profileModel';

/**
 * Personal details. Used by the edit drawer and by the first step of the setup.
 *
 *   draft, set, errors   from SectionEditor (or the setup)
 *   rollEditable         the roll number can be typed (setup). Once a profile is set up it is fixed.
 *   email, picture       shown read-only when given
 *
 * `draft.external` marks someone who signed in with an address that is not a college address. Their
 * roll number, department, graduating year and college cannot be read from the address, so they type
 * them, and the section is optional. College students see the form they always have.
 */
export default function BasicsForm({ draft, set, errors, rollEditable = false, email, picture }) {
  const batch = graduationYearFromRoll(draft.rollNumber);
  const external = Boolean(draft.external);

  return (
    <div className="pf-fields">
      {picture !== undefined ? (
        <div className="pf-fields__wide pf-photo">
          <Avatar name={draft.name} src={picture} size={56} />
          <p>Your picture comes from your Google account. To change it, update it there and sign in again.</p>
        </div>
      ) : null}

      <TextField
        className="pf-fields__wide"
        label="Full name"
        required
        autoComplete="name"
        value={draft.name}
        onChange={(event) => set({ name: event.target.value })}
        error={errors.name}
        hint="As you want it to appear on your public profile."
      />

      {external ? (
        <TextField
          className="pf-fields__wide"
          label="College name"
          required
          autoComplete="organization"
          maxLength={120}
          value={draft.collegeName}
          onChange={(event) => set({ collegeName: event.target.value })}
          error={errors.collegeName}
          hint="The college or university you study at."
        />
      ) : null}

      <TextField
        label={external ? 'Roll number or student ID' : 'Roll number'}
        required={rollEditable}
        autoCapitalize="characters"
        maxLength={external ? 40 : undefined}
        value={draft.rollNumber}
        readOnly={!rollEditable}
        onChange={(event) => set({ rollNumber: event.target.value.trim() })}
        error={errors.rollNumber}
        hint={
          rollEditable
            ? external
              ? 'As on your college ID card. It must be different from everyone else\u2019s, and it is fixed once your profile is set up.'
              : batch
                ? `This puts you in the class of ${batch}.`
                : 'Your batch comes from the first two digits.'
            : 'Fixed once your profile is set up. Ask a coordinator if it is wrong.'
        }
      />

      {email !== undefined ? <TextField label={external ? 'Email' : 'College email'} value={email} readOnly hint="You sign in with this address. It is not shown on your public profile." /> : null}

      {external ? (
        <>
          <TextField
            label="Department"
            required
            maxLength={60}
            value={draft.department}
            onChange={(event) => set({ department: event.target.value })}
            error={errors.department}
            hint="For example, Computer Science."
          />

          <TextField
            label="Graduating year"
            required
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={draft.graduationYear}
            onChange={(event) => set({ graduationYear: event.target.value.replace(/\D/g, '').slice(0, 4) })}
            error={errors.graduationYear}
            hint="The year you finish, like 2028."
          />

          <SelectField
            label="Section (optional)"
            value={draft.section}
            onChange={(event) => set({ section: event.target.value })}
            error={errors.section}
            options={[{ value: '', label: 'No section' }, ...SECTIONS.map((section) => ({ value: section, label: `Section ${section}` }))]}
          />
        </>
      ) : (
        <>
          <SelectField
            label="Department"
            required
            value={draft.department}
            onChange={(event) => set({ department: event.target.value })}
            error={errors.department}
            options={[{ value: '', label: 'Choose your department' }, ...departmentOptions.map((option) => ({ value: option.value, label: `${option.value} \u00b7 ${option.label}` }))]}
          />

          <SelectField
            label="Section"
            required
            value={draft.section}
            onChange={(event) => set({ section: event.target.value })}
            error={errors.section}
            options={[{ value: '', label: 'Choose your section' }, ...SECTIONS.map((section) => ({ value: section, label: `Section ${section}` }))]}
          />
        </>
      )}

      <TextField
        label="Mobile number"
        required
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        value={draft.phone}
        onChange={(event) => set({ phone: event.target.value.replace(/\D/g, '').slice(0, 10) })}
        error={errors.phone}
        hint="10 digits. Only you and your coordinators can see it."
      />
    </div>
  );
}
