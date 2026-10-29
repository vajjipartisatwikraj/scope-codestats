import React, { useState } from 'react';
import { Button, Dialog, SelectField, TextField } from '../ui';
import { ACADEMIC_YEARS, yearLabel } from './academicYearModel';

const FORM_ID = 'ay-mapping-form';

/**
 * Add or edit one graduating year mapping (three fields, so a dialog: design/screens.md section 17).
 * The change is kept on the page and only reaches the server when the page is saved.
 *
 *   mapping     { graduationYear, academicYear, displayName } to start from
 *   original    the graduating year of the row being edited, or null when adding
 *   existing    the graduating years that already have a mapping
 *   onSubmit(mapping)   called with a valid mapping
 *   onClose
 *
 * Mount it only while it is open (it starts from `mapping` each time).
 */
export default function MappingDialog({ mapping, original, existing, onSubmit, onClose }) {
  const [year, setYear] = useState(mapping.graduationYear ? String(mapping.graduationYear) : '');
  const [academicYear, setAcademicYear] = useState(mapping.academicYear || ACADEMIC_YEARS[0]);
  const [displayName, setDisplayName] = useState(mapping.displayName || '');
  const [errors, setErrors] = useState({});

  const adding = original === null;
  const parsedYear = parseInt(year, 10);
  const replaces = Number.isInteger(parsedYear) && existing.includes(parsedYear) && parsedYear !== original;

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!Number.isInteger(parsedYear) || parsedYear <= 0) next.year = 'Enter the graduating year, for example 2028.';
    if (!displayName.trim()) next.name = 'Enter the name students see, for example II Year.';
    setErrors(next);
    if (next.year || next.name) {
      const target = document.getElementById(next.year ? 'ay-mapping-year' : 'ay-mapping-name');
      if (target) target.focus();
      return;
    }
    onSubmit({ graduationYear: parsedYear, academicYear, displayName: displayName.trim() });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={adding ? 'Add year mapping' : 'Edit year mapping'}
      description="Say which year of study students who graduate in a given year are in."
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID} variant="primary">
            {adding ? 'Add mapping' : 'Save mapping'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="ay-form" onSubmit={submit} noValidate>
        <TextField
          id="ay-mapping-year"
          label="Graduating year"
          type="number"
          inputMode="numeric"
          required
          value={year}
          onChange={(event) => setYear(event.target.value)}
          error={errors.year}
          hint={replaces ? `A mapping for ${parsedYear} already exists. Saving replaces it.` : undefined}
          data-autofocus
        />
        <SelectField
          label="Academic year"
          value={academicYear}
          onChange={(event) => setAcademicYear(event.target.value)}
          options={ACADEMIC_YEARS.map((value) => ({ value, label: yearLabel(value) }))}
        />
        <TextField
          id="ay-mapping-name"
          label="Display name"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={errors.name}
          hint="Examples: I Year, II Year, III Year, IV Year, Graduated."
        />
      </form>
    </Dialog>
  );
}
