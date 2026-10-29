import React from 'react';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Button, Chip, TextField } from '../../ui';
import { TagInput } from '../../custom-components';
import { skillOptions } from '../../../constants/profileOptions';
import { formatSkillLabel } from '../../../utils/skillSets';
import { SKILL_SET_IDEAS } from '../profileModel';

/**
 * Skills in named sets, like Languages or Tools, so a visitor can scan them. Each set has a name and
 * its skills; type a skill and press Enter, or pick one of the suggestions.
 */
export default function SkillsForm({ draft, set, errors }) {
  const sets = draft.skills;
  const update = (index, patch) => set({ skills: sets.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)) });
  const remove = (index) => set({ skills: sets.filter((_, position) => position !== index) });
  const add = (name = '') => set({ skills: [...sets, { name, skills: [] }] });
  const unused = SKILL_SET_IDEAS.filter((idea) => !sets.some((entry) => entry.name.trim().toLowerCase() === idea.toLowerCase()));

  return (
    <div className="pf-sets">
      {sets.length === 0 ? <p className="pf-muted">No skill sets yet. Start with one, like Languages, then add the skills that belong in it.</p> : null}

      {sets.map((entry, index) => (
        <fieldset key={index} className="pf-set">
          <legend className="ui-sr">Skill set {index + 1}</legend>
          <TextField
            label="Set name"
            value={entry.name}
            onChange={(event) => update(index, { name: event.target.value })}
            onBlur={() => update(index, { name: formatSkillLabel(entry.name) })}
            error={errors[`set-${index}`]}
            placeholder="Languages"
          />
          <TagInput
            label="Skills in this set"
            value={entry.skills}
            onChange={(skills) => update(index, { skills: skills.map(formatSkillLabel) })}
            suggestions={skillOptions}
            maxSuggestions={8}
            placeholder="Type a skill and press Enter"
          />
          <Button size="sm" variant="ghost" startIcon={<TrashIcon size={16} aria-hidden="true" />} onClick={() => remove(index)}>
            Remove this set
          </Button>
        </fieldset>
      ))}

      <div className="pf-set-add">
        <Button startIcon={<PlusIcon size={18} aria-hidden="true" />} onClick={() => add('')}>
          Add a skill set
        </Button>
        {unused.length > 0 ? (
          <div className="pf-set-ideas" role="group" aria-label="Quick set names">
            {unused.map((idea) => (
              <Chip key={idea} onClick={() => add(idea)}>
                {idea}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
