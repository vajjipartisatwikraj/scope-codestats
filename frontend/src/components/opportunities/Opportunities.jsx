import React, { useCallback, useMemo, useState } from 'react';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { Button, Card, Chip, EmptyState, Notice, Page, PageHeader, SearchField, formatNumber, pluralize } from '../ui';
import './opportunities.css';
import OpportunityDrawer from './OpportunityDrawer';
import OpportunityRow, { OpportunityRowSkeleton } from './OpportunityRow';
import { EMPTY_FILTERS, TYPES, describeFilters, filterOpportunities, hasFilters } from './opportunitiesModel';
import useOpportunities from './useOpportunities';

const SKELETON_ROWS = 7;

function joinWords(parts) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The opportunities (route /opportunities): a filter row (search and type chips) over a list of
 * rows, one per opportunity, each with only its organisation mark, title, organiser, type and deadline
 * badge. Choosing a row opens the detail panel with everything else, including the Apply link.
 *
 * Follows design/screens.md section 12 and the shared kit in ../ui. Filters apply on the client;
 * the list is loaded once (useOpportunities). Loading shows row-shaped skeletons, a failed load
 * shows a Retry notice, and a filter that removes everything is named with a "Clear filters" action.
 */
export default function Opportunities() {
  const { opportunities, loading, error, reload } = useOpportunities();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState(null);

  const visible = useMemo(() => filterOpportunities(opportunities, filters), [opportunities, filters]);
  const selected = useMemo(() => opportunities.find((entry) => entry._id === selectedId) || null, [opportunities, selectedId]);
  const filtersOn = hasFilters(filters);

  const setFilter = useCallback((key, value) => setFilters((current) => ({ ...current, [key]: value })), []);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const closeDrawer = useCallback(() => setSelectedId(null), []);

  const showCount = !loading && !error;
  const count = showCount
    ? filtersOn
      ? `${formatNumber(visible.length)} of ${pluralize(opportunities.length, 'opportunity', 'opportunities')}`
      : pluralize(opportunities.length, 'opportunity', 'opportunities')
    : undefined;

  let results;
  if (loading) {
    results = (
      <Card flush>
        <ul className="ui-list opp-list" role="status" aria-label="Loading opportunities">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <OpportunityRowSkeleton key={index} />
          ))}
        </ul>
      </Card>
    );
  } else if (error) {
    results = null;
  } else if (opportunities.length === 0) {
    results = (
      <Card>
        <EmptyState
          icon={<BriefcaseIcon size={28} weight="regular" />}
          title="No opportunities yet"
          text="Internships, hackathons and competitions your teachers add will show up here. Check back soon."
        />
      </Card>
    );
  } else if (visible.length === 0) {
    results = (
      <Card>
        <EmptyState
          icon={<FunnelXIcon size={28} weight="regular" />}
          title="No opportunities match"
          text={`Nothing fits ${joinWords(describeFilters(filters))}. Try a different search or clear the filters.`}
          action={<Button variant="primary" onClick={clearFilters}>Clear filters</Button>}
        />
      </Card>
    );
  } else {
    results = (
      <Card flush>
        <ul className="ui-list opp-list" aria-label="Opportunities">
          {visible.map((opportunity) => (
            <OpportunityRow key={opportunity._id} opportunity={opportunity} onOpen={setSelectedId} />
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <Page className="opp">
      <PageHeader
        size="display"
        title="Opportunities"
        count={count}
        description="Internships, hackathons, competitions and workshops to apply for."
      />

      {error ? (
        <Notice
          tone="danger"
          title="Opportunities did not load"
          action={
            <Button variant="ghost" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}

      {!error ? (
        <section className="opp-filters" aria-label="Filter opportunities">
          <div className="ui-toolbar opp-toolbar">
            <SearchField
              className="ui-toolbar__grow"
              value={filters.search}
              onChange={(value) => setFilter('search', value)}
              placeholder="Search opportunities"
              label="Search opportunities by title, organiser or description"
            />
            {filtersOn ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="ui-chips" data-scroll="true" role="group" aria-label="Type">
            {TYPES.map((type) => (
              <Chip key={type.key} selected={filters.type === type.key} onClick={() => setFilter('type', type.key)}>
                {type.label}
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      {showCount ? (
        <p className="ui-sr" role="status">
          {`Showing ${pluralize(visible.length, 'opportunity', 'opportunities')}`}
        </p>
      ) : null}

      <section className="opp-results" aria-labelledby="opp-results-title">
        <h2 className="ui-sr" id="opp-results-title">
          Opportunity list
        </h2>
        {results}
      </section>

      <OpportunityDrawer opportunity={selected} onClose={closeDrawer} />
    </Page>
  );
}
