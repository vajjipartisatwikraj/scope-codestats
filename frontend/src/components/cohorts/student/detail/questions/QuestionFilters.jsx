import React from 'react';
import { Button, SearchField, SelectField, Toolbar } from '../../../../ui';
import { DIFFICULTIES, STATUS_OPTIONS, hasFilters } from '../model/questions';

/**
 * The filter row above a module's questions: the search over the titles at the left, and at the right
 * the status (all, solved, not solved) and the difficulty, with "Clear filters" while any is on.
 * Filtering happens on the page as you type; there is no search button because nothing waits for one.
 * On a narrow screen the filters drop under the search.
 *
 *   filters    { search, status, difficulty }
 *   onChange   (key, value) => void
 *   onClear    clears every filter
 */
export default function QuestionFilters({ filters, onChange, onClear }) {
  return (
    <Toolbar
      className="cdq-filters"
      label="Filter questions"
      search={<SearchField value={filters.search} onChange={(value) => onChange('search', value)} placeholder="Search questions" label="Search questions by title" />}
      end={
        <>
          {hasFilters(filters) ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          ) : null}
          <SelectField variant="pill" aria-label="Status" value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField variant="pill" aria-label="Difficulty" value={filters.difficulty} onChange={(event) => onChange('difficulty', event.target.value)}>
            <option value="all">All difficulties</option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.key} value={difficulty.key}>
                {difficulty.label}
              </option>
            ))}
          </SelectField>
        </>
      }
    />
  );
}
