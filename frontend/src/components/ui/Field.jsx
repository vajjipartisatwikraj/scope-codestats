import React, { forwardRef, useId } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';

/**
 * Form controls (DESIGN.md, Inputs and filters). Every field has a label above it, optional help
 * below it, and an error that says what to fix (with an icon, linked to the field with
 * aria-describedby). Native elements underneath, so the keyboard, autofill and phones' pickers work.
 */

/** One ref callback that fills a forwarded ref and an inputRef together */
function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    });
  };
}

function describedBy(...ids) {
  const list = ids.filter(Boolean).join(' ');
  return list || undefined;
}

function FieldFrame({ id, label, hint, error, required, className, children }) {
  return (
    <div className={className ? `ui-field ${className}` : 'ui-field'} data-invalid={error ? 'true' : 'false'}>
      {label ? (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required ? <span className="ui-field__required" aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="ui-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="ui-field__error" id={`${id}-error`} role="alert">
          <WarningCircleIcon size={16} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * TextField: a text input (44px, raised, 14px radius, field-border outline) or, with `multiline`, a
 * text area.
 *
 *   label, hint, error, required   as above
 *   multiline, rows                a text area
 *   className                      added to the wrapper
 *   ref, inputRef                  both reach the input (or text area), so a form can focus the first
 *                                  field with an error; pass either or both
 *   ...rest                        passed to the input (type, value, onChange, placeholder, name, ...)
 */
export const TextField = forwardRef(function TextField({ label, hint, error, required, multiline = false, rows = 4, className, id: idProp, inputRef, ...rest }, ref) {
  const autoId = useId();
  const id = idProp || autoId;
  const props = {
    id,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy(hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null),
    ref: mergeRefs(ref, inputRef),
    ...rest,
  };
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required} className={className}>
      {multiline ? <textarea className="ui-input ui-input--area" rows={rows} {...props} /> : <input className="ui-input" {...props} />}
    </FieldFrame>
  );
});

/**
 * SelectField: a native select with the design's caret.
 *
 *   variant   'field' (44px, with a label above; the default) | 'pill' (36px compact filter, no label
 *             above: pass `aria-label`)
 *   options   [{ value, label }] , or pass <option> children
 *   ref, inputRef   both reach the select element
 *   ...rest   value, onChange, disabled, name, aria-label, ...
 */
export const SelectField = forwardRef(function SelectField({ label, hint, error, required, variant = 'field', options, className, children, id: idProp, inputRef, ...rest }, ref) {
  const autoId = useId();
  const id = idProp || autoId;
  const select = (
    <span className="ui-select" data-variant={variant}>
      <select
        ref={mergeRefs(ref, inputRef)}
        className="ui-select__control"
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null)}
        {...rest}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      <CaretDownIcon className="ui-select__caret" size={16} weight="regular" aria-hidden="true" />
    </span>
  );
  if (variant === 'pill') return <span className={className ? `ui-field-inline ${className}` : 'ui-field-inline'}>{select}</span>;
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required} className={className}>
      {select}
    </FieldFrame>
  );
});

/** A checkbox with its label (the target is 44px high; the box is 22px) */
export function Checkbox({ label, className, ...rest }) {
  return (
    <label className={className ? `ui-check ${className}` : 'ui-check'}>
      <input type="checkbox" className="ui-check__input" {...rest} />
      <span className="ui-check__box" aria-hidden="true" />
      <span className="ui-check__label">{label}</span>
    </label>
  );
}

/**
 * Switch: a setting that is on or off.
 *
 *   label, description   the name of the setting and one line about it
 *   checked, onChange(checked)
 *   controlId           an id for the toggle itself, so a form can move focus to it
 */
export function Switch({ label, description, checked, onChange, disabled, className, controlId }) {
  const autoId = useId();
  const id = autoId;
  return (
    <div className={className ? `ui-switch ${className}` : 'ui-switch'}>
      <span className="ui-switch__text">
        <span className="ui-switch__label" id={`${id}-label`}>
          {label}
        </span>
        {description ? (
          <span className="ui-switch__description" id={`${id}-description`}>
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        id={controlId}
        className="ui-switch__control"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="ui-switch__thumb" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * SearchField: a pill with a search icon and a clear button.
 *
 *   value, onChange(text)   controlled text
 *   placeholder, label      the placeholder and the accessible name
 */
export function SearchField({ value, onChange, placeholder = 'Search', label = 'Search', className }) {
  return (
    <div className={className ? `ui-search ${className}` : 'ui-search'}>
      <MagnifyingGlassIcon className="ui-search__icon" size={20} weight="regular" aria-hidden="true" />
      <input
        type="search"
        className="ui-search__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
      />
      {value ? (
        <button type="button" className="ui-search__clear" onClick={() => onChange('')} aria-label="Clear the search">
          <XIcon size={14} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
