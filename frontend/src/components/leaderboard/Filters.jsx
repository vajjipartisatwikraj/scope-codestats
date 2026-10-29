import React, { useId } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { FunnelIcon } from '@phosphor-icons/react/dist/csr/Funnel';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { ALL, DEPARTMENTS, SECTIONS } from './leaderboardModel';

/**
 * The search and the filters above the list: a search pill, then department, year of study and
 * section as compact pill selects, and a ghost "Reset" that appears once something is filtered.
 *
 * The selects are the browser's own <select> in a pill. That keeps them keyboard- and
 * screen-reader-correct and gives a phone its native picker; only the closed control is styled.
 */

/** A select drawn as a compact pill with the current value and a chevron */
export function PillSelect({ label, value, onChange, options, className }) {
  const id = useId();
  return (
    <div className={className ? `lb-select ${className}` : 'lb-select'}>
      <label className="lb-sr" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDownIcon className="lb-select__icon" size={14} weight="bold" aria-hidden="true" />
    </div>
  );
}

export function SearchField({ value, onChange }) {
  const id = useId();
  return (
    <div className="lb-search">
      <label className="lb-sr" htmlFor={id}>
        Search students by name, roll number or email
      </label>
      <MagnifyingGlassIcon className="lb-search__icon" size={18} weight="regular" aria-hidden="true" />
      <input
        id={id}
        type="search"
        autoComplete="off"
        spellCheck="false"
        placeholder="Search by name or roll number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button type="button" className="lb-search__clear" onClick={() => onChange('')} aria-label="Clear the search">
          <XIcon size={14} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Props
 *   filters, onChange(next)   the four filters ({ search, department, year, section })
 *   years                     the years of study to offer (names from the academic year setup)
 *   active                    true when any filter is on (shows Reset)
 *   onReset                   clears all four
 *   compact                   a phone: the selects sit in a panel opened by a button
 *   open, onToggle            whether that panel is open
 *   sortKey, sortOptions, onSortKey   (compact only) the list has no column headers on a phone, so the
 *                             order is chosen here: [{ value, label }]
 */
export default function Filters({ filters, onChange, years, active, onReset, compact, open, onToggle, sortKey, sortOptions, onSortKey }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });

  const selects = (
    <>
      <PillSelect
        label="Department"
        value={filters.department}
        onChange={set('department')}
        options={[{ value: ALL, label: 'All departments' }, ...DEPARTMENTS.map((code) => ({ value: code, label: code }))]}
      />
      <PillSelect
        label="Year of study"
        value={filters.year}
        onChange={set('year')}
        options={[{ value: ALL, label: 'All years' }, ...years.map((name) => ({ value: name, label: name }))]}
      />
      <PillSelect
        label="Section"
        value={filters.section}
        onChange={set('section')}
        options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map((code) => ({ value: code, label: `Section ${code}` }))]}
      />
    </>
  );

  const reset = active ? (
    <button type="button" className="lb-ghost" onClick={onReset}>
      Reset
    </button>
  ) : null;

  if (compact) {
    return (
      <div className="lb-filters" data-compact="true">
        <div className="lb-filters__bar">
          <SearchField value={filters.search} onChange={set('search')} />
          <button
            type="button"
            className="lb-pill-button"
            aria-expanded={open}
            aria-controls="lb-filter-panel"
            onClick={onToggle}
            data-active={active ? 'true' : 'false'}
          >
            <FunnelIcon size={18} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
            <span>Filters</span>
          </button>
        </div>
        {open && (
          <div className="lb-filters__panel" id="lb-filter-panel">
            <div className="lb-filters__grid">
              {selects}
              {sortOptions ? <PillSelect label="Sort by" value={sortKey} onChange={onSortKey} options={sortOptions} /> : null}
            </div>
            {reset}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lb-filters">
      <SearchField value={filters.search} onChange={set('search')} />
      <div className="lb-filters__selects">{selects}</div>
      {reset}
    </div>
  );
}
