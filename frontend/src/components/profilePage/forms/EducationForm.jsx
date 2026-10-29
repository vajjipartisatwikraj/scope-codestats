import React from 'react';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Button, SelectField, TextField } from '../../ui';
import { LEVEL_WITHOUT_STREAM, LEVEL_WITH_DEPARTMENT_STREAM, educationLevels, emptyEducation, scoreLimits, scoreTypes } from '../profileModel';

/**
 * Education from school to college. Each entry has a level, the institution, the stream, the months
 * it ran and the score. School has no stream, and an Engineering entry always takes your department.
 *
 *   draft         { education: [...] }
 *   set, errors   from SectionEditor. `errors` holds `entries`, one object per entry
 *   department    the student's department code, used for the Engineering stream
 */
export default function EducationForm({ draft, set, errors, department = '' }) {
  const entries = draft.education;
  const entryErrors = errors.entries || [];
  const update = (index, patch) => set({ education: entries.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)) });
  const remove = (index) => set({ education: entries.filter((_, position) => position !== index) });

  const changeLevel = (index, level) => {
    const stream = level === LEVEL_WITHOUT_STREAM ? '' : level === LEVEL_WITH_DEPARTMENT_STREAM ? department : entries[index].stream;
    update(index, { level, stream });
  };

  return (
    <div className="pf-sets">
      {entries.length === 0 ? <p className="pf-muted">Nothing added yet. Start with your college, then add your school or intermediate if you like.</p> : null}

      {entries.map((entry, index) => {
        const problems = entryErrors[index] || {};
        const max = scoreLimits[entry.scoreType] ?? 100;
        return (
          <fieldset key={index} className="pf-set">
            <legend className="ui-sr">Education entry {index + 1}</legend>
            <div className="pf-fields">
              <SelectField
                label="Level"
                required
                value={entry.level}
                onChange={(event) => changeLevel(index, event.target.value)}
                error={problems.level}
                options={[{ value: '', label: 'Choose a level' }, ...educationLevels.map((level) => ({ value: level, label: level }))]}
              />
              <TextField
                label="Institution"
                value={entry.name}
                onChange={(event) => update(index, { name: event.target.value })}
                placeholder="College or school name"
                autoComplete="organization"
              />
              {entry.level && entry.level !== LEVEL_WITHOUT_STREAM ? (
                <TextField
                  label="Stream or branch"
                  value={entry.level === LEVEL_WITH_DEPARTMENT_STREAM ? department : entry.stream}
                  readOnly={entry.level === LEVEL_WITH_DEPARTMENT_STREAM}
                  onChange={(event) => update(index, { stream: event.target.value })}
                  placeholder="For example, MPC"
                  hint={entry.level === LEVEL_WITH_DEPARTMENT_STREAM ? 'Taken from your department.' : undefined}
                />
              ) : null}
              <TextField label="Started" type="month" value={entry.startDate} onChange={(event) => update(index, { startDate: event.target.value })} />
              <TextField
                label="Finished"
                type="month"
                value={entry.endDate}
                onChange={(event) => update(index, { endDate: event.target.value })}
                error={problems.date}
                hint="Leave empty if you are still studying here."
              />
              <SelectField label="Score type" value={entry.scoreType} onChange={(event) => update(index, { scoreType: event.target.value })} options={scoreTypes.map((type) => ({ value: type, label: type }))} />
              <TextField
                label="Score"
                inputMode="decimal"
                value={entry.score}
                onChange={(event) => update(index, { score: event.target.value.replace(/[^\d.]/g, '') })}
                error={problems.score}
                hint={`From 0 to ${max}. Optional.`}
              />
            </div>
            <Button size="sm" variant="ghost" startIcon={<TrashIcon size={16} aria-hidden="true" />} onClick={() => remove(index)}>
              Remove this entry
            </Button>
          </fieldset>
        );
      })}

      <Button startIcon={<PlusIcon size={18} aria-hidden="true" />} onClick={() => set({ education: [...entries, emptyEducation()] })}>
        Add an education entry
      </Button>
    </div>
  );
}
