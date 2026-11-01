import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { Button, EmptyState, Notice, Page, PageHeader, formatNumber, pluralize } from '../../../ui';
import { ScrollRow } from '../../../custom-components';
import CohortCard, { CohortCardSkeleton } from './card/CohortCard';
import CohortDetails from './details/CohortDetails';
import CohortFilters from './filters/CohortFilters';
import useCohortProgress from './hooks/useCohortProgress';
import useCohorts from './hooks/useCohorts';
import { EMPTY_FILTERS, countByStatus, describeFilters, filterCohorts, groupCohorts, hasFilters, sortCohorts } from './model/cohortStatus';
import openCohort from './model/openCohort';
import useAutoHideScrollbars from '../../../../hooks/useAutoHideScrollbars';
import useStuck from '../../../../hooks/useStuck';
import './cohorts.css';

const SKELETON_CARDS = 6;
// The fixed navbar covers the top 64px of the window (Navbar.css)
const NAVBAR_HEIGHT = 64;

/** "search "graph" and status completed" */
function joinWords(parts) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The student's cohorts (route /cohorts): the heading and the filter row, which stay in place while
 * the list scrolls, over the cohorts split into sections (Global cohorts, Scheduled tests, My enrolled
 * cohorts, Assigned to me), each a row of cards that scrolls sideways (ScrollRow, from
 * ../custom-components). Pressing a card opens the detail panel with
 * the description, the numbers, the student's progress and the reviews, and the button there starts
 * or resumes the cohort.
 *
 * Follows design/screens.md section 8 and the shared kit in ../ui. Filters, order and sections apply
 * on the client; the list is loaded once (useCohorts) and each cohort's progress once
 * (useCohortProgress). Within a section the cohorts to act on come first. Loading shows card-shaped
 * skeletons, a failed load shows a Retry notice, and a filter that removes everything is named with
 * a "Clear filters" action.
 *
 * The folder is organised by job: card/ (one cohort), details/ (the panel), filters/ (the row),
 * shared/ (pieces used by more than one of them), hooks/ (data) and model/ (rules, no React).
 */
export default function CohortsPage() {
  // Scrollbars (the page and the rows of cohorts) show only while something is being scrolled
  useAutoHideScrollbars();
  const navigate = useNavigate();
  const { cohorts, loading, error, reload } = useCohorts();
  const progressFor = useCohortProgress(cohorts);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [topMarker, stuck] = useStuck(NAVBAR_HEIGHT);

  const visible = useMemo(() => filterCohorts(sortCohorts(cohorts), filters), [cohorts, filters]);
  const sections = useMemo(() => groupCohorts(visible), [visible]);
  const counts = useMemo(() => ({ ...countByStatus(cohorts), all: cohorts.length }), [cohorts]);
  const selected = useMemo(() => cohorts.find((cohort) => cohort._id === selectedId) || null, [cohorts, selectedId]);
  const filtersOn = hasFilters(filters);

  const setFilter = useCallback((key, value) => setFilters((current) => ({ ...current, [key]: value })), []);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const closeDetails = useCallback(() => setSelectedId(null), []);
  const start = useCallback((cohort) => openCohort(cohort, navigate), [navigate]);

  const loaded = !loading && !error;

  let results;
  if (loading) {
    results = (
      <div role="status" aria-label="Loading cohorts">
        <ScrollRow label="Loading cohorts">
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <li key={index}>
              <CohortCardSkeleton />
            </li>
          ))}
        </ScrollRow>
      </div>
    );
  } else if (error) {
    results = null;
  } else if (cohorts.length === 0) {
    results = (
      <EmptyState
        icon={<StackIcon size={28} weight="regular" />}
        title="No cohorts yet"
        text="Cohorts your teachers open to you will show up here. Ask your teacher if you expected one."
      />
    );
  } else if (visible.length === 0) {
    results = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No cohorts match"
        text={`Nothing fits ${joinWords(describeFilters(filters))}. Try a different search or clear the filters.`}
        action={
          <Button variant="primary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    results = (
      <div className="chl-sections">
        {sections.map((section) => (
          <section key={section.key} aria-labelledby={`chl-${section.key}-title`}>
            <header className="chl-section__head">
              <h2 className="chl-section__title" id={`chl-${section.key}-title`}>
                {section.title}
              </h2>
              <span className="chl-section__count" aria-label={pluralize(section.cohorts.length, 'cohort')}>
                {formatNumber(section.cohorts.length)}
              </span>
              <p className="chl-section__caption">{section.caption}</p>
            </header>
            <ScrollRow label={section.title}>
              {section.cohorts.map((cohort) => (
                <li key={cohort._id}>
                  <CohortCard cohort={cohort} progress={progressFor(cohort._id)} onOpen={setSelectedId} />
                </li>
              ))}
            </ScrollRow>
          </section>
        ))}
      </div>
    );
  }

  return (
    <Page className="chl">
      <div ref={topMarker} className="chl-marker" aria-hidden="true" />
      <div className="chl-top" data-stuck={stuck ? 'true' : 'false'}>
        <PageHeader size="display" title="Cohorts" description="Learn at your own pace with guided cohorts, and take the tests your teachers schedule." />
        {!error && (loading || cohorts.length > 0) ? <CohortFilters filters={filters} counts={loading ? undefined : counts} onChange={setFilter} onClear={clearFilters} /> : null}
      </div>

      {error ? (
        <Notice
          tone="danger"
          title="Cohorts did not load"
          action={
            <Button variant="ghost" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}

      {loaded && cohorts.length > 0 ? (
        <p className="ui-sr" role="status">
          {filtersOn ? `Showing ${pluralize(visible.length, 'cohort')} of ${cohorts.length}` : `Showing ${pluralize(visible.length, 'cohort')}`}
        </p>
      ) : null}

      <div>
        {sections.length === 0 ? (
          <h2 className="ui-sr">Cohort list</h2>
        ) : null}
        {results}
      </div>

      <CohortDetails cohort={selected} progress={selected ? progressFor(selected._id) : undefined} onClose={closeDetails} onStart={start} />
    </Page>
  );
}
