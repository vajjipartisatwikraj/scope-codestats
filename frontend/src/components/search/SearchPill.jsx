import React, { forwardRef } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import RotatingPlaceholder from './RotatingPlaceholder';

/**
 * The search pill of the search page: the text at the left, a clear button once there is text, and
 * the magnifying glass at the right end (a spinner while a search runs). While the pill is empty the
 * placeholder is the sliding Search "Student" / "Course" / ... line.
 *
 *   value, onChange(text)   controlled text
 *   label                   the accessible name of the input
 *   words                   the words the placeholder cycles through
 *   loading                 swap the magnifying glass for a spinner
 *
 * The ref goes to the input.
 */
const SearchPill = forwardRef(function SearchPill({ value, onChange, label, words, loading = false }, ref) {
  return (
    <div className="srp-pill" onClick={() => ref?.current?.focus()}>
      <input
        ref={ref}
        className="srp-pill__input"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? null : <RotatingPlaceholder words={words} />}
      {value ? (
        <button
          type="button"
          className="srp-pill__clear"
          aria-label="Clear the search"
          // Keep the keyboard open: pressing it must not blur the input
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange('');
            ref?.current?.focus();
          }}
        >
          <XIcon size={14} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
      <span className="srp-pill__icon" aria-hidden="true">
        {loading ? <SpinnerGapIcon className="srp-spin" size={20} /> : <MagnifyingGlassIcon size={20} weight="bold" />}
      </span>
    </div>
  );
});

export default SearchPill;
