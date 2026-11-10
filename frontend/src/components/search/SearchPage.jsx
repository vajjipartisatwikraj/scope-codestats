import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState, Skeleton } from '../ui';
import SearchPill from './SearchPill';
import SearchResultList from './SearchResultList';
import { SEARCH_SECTIONS, SEARCH_TERMS } from './searchSections';
import useGlobalSearch from './useGlobalSearch';
import './search.css';

/** Placeholder rows, shaped like the cards, while the first search runs. */
const LoadingGroups = () => (
  <div className="srp-groups" role="status" aria-label="Searching">
    {[0, 1].map((key) => (
      <div key={key} className="srp-skeleton">
        <Skeleton height={20} width="30%" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
      </div>
    ))}
  </div>
);

/**
 * The search page (route /search), which the search button in the navbar opens on a phone or
 * tablet; from 900px wide the navbar has its own search pill (Navbar/SearchBox.jsx).
 *
 * A blue back button and the search pill (SearchPill: the magnifying glass at its right end and a
 * sliding Search "Student" / "Course" / ... placeholder), then:
 *   - nothing typed: an empty page.
 *   - typed: the results in one card per kind (SearchResultList), or a notice when nothing matches.
 * The searching itself is useGlobalSearch, the list of kinds and where a result leads is
 * searchSections.js. The only motion is the sliding word of the placeholder.
 */
const SearchPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const { results, loading } = useGlobalSearch(token, trimmed);

  // Opened to type: the keyboard is ready as the page appears
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const groups = useMemo(
    () =>
      SEARCH_SECTIONS.map((section) => ({ section, items: results?.[section.key] ?? [] })).filter(
        (group) => group.items.length > 0
      ),
    [results]
  );
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  const open = (section, item) => navigate(section.path(item, user));

  let content;
  if (!trimmed) {
    // Nothing typed: the page stays empty, the sliding placeholder shows what can be searched
    content = null;
  } else if (results === null) {
    content = loading ? <LoadingGroups /> : null;
  } else if (total === 0) {
    content = (
      <EmptyState
        icon={<MagnifyingGlassIcon size={28} aria-hidden="true" />}
        title={`No results for \u201c${trimmed}\u201d`}
        text="Check the spelling or try a shorter word."
      />
    );
  } else {
    content = <SearchResultList groups={groups} user={user} onOpen={open} />;
  }

  return (
    <div className="srp">
      <div className="srp-bar" role="search">
        <button type="button" className="srp-back" aria-label="Back" onClick={() => navigate(-1)}>
          <ArrowLeftIcon size={20} weight="bold" aria-hidden="true" />
        </button>
        <SearchPill
          ref={inputRef}
          value={query}
          onChange={setQuery}
          label="Search students, cohorts, courses, opportunities and VocalQ tests"
          words={SEARCH_TERMS}
          loading={loading}
        />
      </div>

      <p className="ui-sr" role="status" aria-live="polite">
        {trimmed && results !== null && !loading ? (total > 0 ? `${total} results` : 'No results') : ''}
      </p>

      {content}
    </div>
  );
};

export default SearchPage;
