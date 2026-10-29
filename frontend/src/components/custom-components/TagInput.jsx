import React, { useId, useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import './TagInput.css';

/**
 * TagInput: a list of short free-text values (topics, tags, prerequisites). Type a value and press
 * Enter or comma to add it; Backspace in an empty field removes the last one; a value that is
 * still being typed is added when the field loses focus. Duplicates are ignored.
 *
 * Props
 *   label          the label above the field
 *   value          string[]
 *   onChange(next) called with the new string[]
 *   suggestions    optional string[]; the ones not yet chosen show under the field as one-press adds
 *   placeholder    shown while the list is empty
 *   hint           one muted line under the field
 *   error          a sentence that says what to fix (linked to the field)
 *   id             optional id of the text input
 *   disabled
 *   maxSuggestions how many suggestions to show at once (default 8)
 *
 * Colours come from --ti-* variables that default to --ds-* tokens, so it follows Midnight and
 * Daylight without any theme code.
 */
export default function TagInput({
  label,
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Type and press Enter',
  hint,
  error,
  id: idProp,
  disabled = false,
  maxSuggestions = 8,
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return;
    if (!value.includes(text)) onChange([...value, text]);
  };

  const commit = () => {
    add(draft);
    setDraft('');
  };

  const remove = (index) => onChange(value.filter((_, position) => position !== index));

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter must not submit the surrounding form while a value is being typed
      if (draft.trim() || event.key === ',') event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value.length - 1);
    }
  };

  const open = suggestions.filter((suggestion) => !value.includes(suggestion)).slice(0, maxSuggestions);
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ti" data-invalid={error ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'}>
      {label ? (
        <label className="ti__label" htmlFor={id}>
          {label}
        </label>
      ) : null}

      <div className="ti__box">
        {value.length > 0 ? (
          <ul className="ti__tags" aria-label={label ? `${label} added` : 'Added values'}>
            {value.map((tag, index) => (
              <li key={`${tag}-${index}`} className="ti__tag">
                <span className="ti__tag-text">{tag}</span>
                <button type="button" className="ti__remove" onClick={() => remove(index)} disabled={disabled} aria-label={`Remove ${tag}`}>
                  <XIcon size={12} weight="bold" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={id}
          className="ti__input"
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : 'Add another'}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
      </div>

      {open.length > 0 && !disabled ? (
        <div className="ti__suggestions" role="group" aria-label="Suggestions">
          {open.map((suggestion) => (
            <button key={suggestion} type="button" className="ti__suggestion" onClick={() => add(suggestion)}>
              <PlusIcon size={12} weight="bold" aria-hidden="true" />
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {hint && !error ? (
        <p className="ti__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="ti__error" id={`${id}-error`} role="alert">
          <WarningCircleIcon size={16} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
