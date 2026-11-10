import brand from '../../brand';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { useAuth } from '../../contexts/AuthContext';
import { SEARCH_SECTIONS as SECTIONS } from '../search/searchSections';
import useGlobalSearch from '../search/useGlobalSearch';
import Avatar from './Avatar';
import useDismiss from './useDismiss';

/**
 * The search pill with its results panel.
 *
 * Typing searches users, cohorts, VocalQ tests, opportunities and courses (after a short pause,
 * and a newer search cancels an older one). The panel works as a combobox: arrow keys move
 * through the results, Enter opens the highlighted one (or the first), Escape closes the panel.
 * What is searched and where a result leads is in ../search/searchSections.js.
 */
const SearchBox = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const baseId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const { results, loading } = useGlobalSearch(token, trimmed);

  // Every result in display order, with the id the combobox points at.
  const rows = useMemo(
    () =>
      SECTIONS.flatMap((section) =>
        (results?.[section.key] ?? []).map((item) => ({
          id: `${baseId}-${section.key}-${item._id}`,
          section,
          item,
        }))
      ).map((row, index) => ({ ...row, index })),
    [results, baseId]
  );

  // A fresh set of results starts with nothing highlighted.
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Keep the highlighted result in view while moving with the keyboard.
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(rows[activeIndex]?.id)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, rows]);

  useDismiss(rootRef, open, () => {
    setOpen(false);
    setActiveIndex(-1);
  });

  const choose = (row) => {
    navigate(row.section.path(row.item, user));
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (rows.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) =>
        current < 0 ? (step === 1 ? 0 : rows.length - 1) : (current + step + rows.length) % rows.length
      );
    } else if (event.key === 'Enter' && rows.length > 0) {
      event.preventDefault();
      choose(rows[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  const noResults = Boolean(trimmed) && results !== null && !loading && rows.length === 0;
  const panelOpen = open && (rows.length > 0 || noResults);
  const groups = SECTIONS.map((section) => ({
    section,
    rows: rows.filter((row) => row.section === section),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="ds-search" ref={rootRef}>
      <form
        className="ds-search__field"
        role="search"
        onSubmit={(event) => event.preventDefault()}
        // The whole pill is a target, not just the text line
        onClick={() => inputRef.current?.focus()}
      >
        <MagnifyingGlassIcon size={20} aria-hidden="true" />
        <input
          ref={inputRef}
          className="ds-search__input"
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search students, cohorts, courses"
          aria-label="Search students, cohorts, courses"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={panelOpen}
          aria-controls={`${baseId}-results`}
          aria-activedescendant={activeIndex >= 0 ? rows[activeIndex]?.id : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading ? <SpinnerGapIcon className="ds-spin" size={18} aria-hidden="true" /> : null}
      </form>

      <div className="ds-popover ds-popover--start ds-search__panel" data-open={panelOpen ? 'true' : 'false'}>
        {rows.length > 0 ? (
          <div id={`${baseId}-results`} role="listbox" aria-label="Search results">
            {groups.map(({ section, rows: groupRows }) => (
              <div key={section.key} role="group" aria-label={section.title}>
                <p className="ds-search__group-title" aria-hidden="true">
                  {section.title}
                </p>
                {groupRows.map((row) => {
                  const Icon = section.icon;
                  const detail = section.detail?.(row.item, user);
                  return (
                    <div
                      key={row.id}
                      id={row.id}
                      role="option"
                      aria-selected={row.index === activeIndex}
                      data-active={row.index === activeIndex ? 'true' : 'false'}
                      className="ds-search__option"
                      // Keep focus in the input so typing and arrow keys keep working
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseMove={() => setActiveIndex(row.index)}
                      onClick={() => choose(row)}
                    >
                      {Icon ? (
                        <span className="ds-search__option-icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                      ) : (
                        <Avatar name={row.item.name} src={row.item.profilePicture} size="sm" />
                      )}
                      <span className="ds-search__option-text">
                        <span className="ds-search__option-title">{section.label(row.item)}</span>
                        {detail ? <span className="ds-search__option-detail">{detail}</span> : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}

        {noResults ? (
          <div className="ds-search__empty">
            <img className="ds-search__empty-image" src={brand.shared.notFound}
 alt="" />
            <p className="ds-search__empty-text">No results found for “{trimmed}”</p>
          </div>
        ) : null}
      </div>

      <p className="ds-navbar__sr-only" role="status" aria-live="polite">
        {panelOpen ? (rows.length > 0 ? `${rows.length} results` : 'No results') : ''}
      </p>
    </div>
  );
};

export default SearchBox;
