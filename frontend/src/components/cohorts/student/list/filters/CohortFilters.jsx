import React from 'react';
import { Button, PillTabs, SearchField, Toolbar } from '../../../../ui';
import { STATUS_FILTERS, hasFilters } from '../model/cohortStatus';
import './cohortFilters.css';

/**
 * The filter row of the cohort list: a search over title and description on the left, and on the
 * right the status of the student's own progress (All, In progress, Not started, Completed) with how
 * many cohorts are in each. The status control is a plain choice, so it is a radio group of pills;
 * on a phone it takes its own line and scrolls sideways.
 *
 *   filters    { search, status }
 *   counts     { all, inProgress, notStarted, completed }, the numbers printed on the pills.
 *              Leave it out while the list is loading: a count that is not known is not zero.
 *   onChange   (key, value) => void
 *   onClear    clears every filter; the button shows only while one is on
 */
export default function CohortFilters({ filters, counts, onChange, onClear }) {
  const items = STATUS_FILTERS.map((option) => ({
    key: option.key,
    label: (
      <>
        {option.label}
        {counts ? <span className="chf-count">{counts[option.key] ?? 0}</span> : null}
      </>
    ),
  }));

  return (
    <Toolbar
      className="chf"
      label="Filter cohorts"
      search={<SearchField value={filters.search} onChange={(value) => onChange('search', value)} placeholder="Search cohorts" label="Search cohorts by title or description" />}
    >
      {hasFilters(filters) ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
      <PillTabs role="radiogroup" label="Show cohorts by status" size="sm" items={items} value={filters.status} onChange={(key) => onChange('status', key)} />
    </Toolbar>
  );
}
