import React, { useCallback, useMemo, useState } from 'react';
import { BookOpenIcon } from '@phosphor-icons/react/dist/csr/BookOpen';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { Button, Chip, EmptyState, Notice, Page, PageHeader, SearchField, SelectField, formatNumber, pluralize } from '../ui';
import './courses.css';
import CourseCard, { CourseCardSkeleton } from './CourseCard';
import CourseDetails from './CourseDetails';
import { CATEGORIES, EMPTY_FILTERS, describeFilters, filterCourses, hasFilters, levelOptions } from './coursesModel';
import useCourses from './useCourses';

const SKELETON_CARDS = 6;

/** "search "graph", category Algorithms and level Beginner" */
function joinWords(parts) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The course catalogue (route /courses): a filter row (search, category chips, level) over a grid of
 * simple course cards. Pressing a card opens the detail panel with the description, topics and the link out.
 *
 * Follows design/screens.md section 12 and the shared kit in ../ui. Filters apply on the client;
 * the list is loaded once (useCourses). Loading shows card-shaped skeletons, a failed load shows a
 * Retry notice, and a filter that removes everything is named with a "Clear filters" action.
 */
export default function Courses() {
  const { courses, loading, error, reload } = useCourses();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState(null);

  const visible = useMemo(() => filterCourses(courses, filters), [courses, filters]);
  const levels = useMemo(() => levelOptions(courses), [courses]);
  const selected = useMemo(() => courses.find((course) => course._id === selectedId) || null, [courses, selectedId]);
  const filtersOn = hasFilters(filters);

  const setFilter = useCallback((key, value) => setFilters((current) => ({ ...current, [key]: value })), []);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const closeDetails = useCallback(() => setSelectedId(null), []);

  const showCount = !loading && !error;
  const count = showCount ? (filtersOn ? `${formatNumber(visible.length)} of ${pluralize(courses.length, 'course')}` : pluralize(courses.length, 'course')) : undefined;

  let results;
  if (loading) {
    results = (
      <ul className="ui-grid crs-grid" role="status" aria-label="Loading courses">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <li key={index}>
            <CourseCardSkeleton />
          </li>
        ))}
      </ul>
    );
  } else if (error) {
    results = null;
  } else if (courses.length === 0) {
    results = (
      <EmptyState
        icon={<BookOpenIcon size={28} weight="regular" />}
        title="No courses yet"
        text="Courses your teachers add will show up here. Check back soon."
      />
    );
  } else if (visible.length === 0) {
    results = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No courses match"
        text={`Nothing fits ${joinWords(describeFilters(filters))}. Try a different search or clear the filters.`}
        action={<Button variant="primary" onClick={clearFilters}>Clear filters</Button>}
      />
    );
  } else {
    results = (
      <ul className="ui-grid crs-grid" aria-label="Courses">
        {visible.map((course) => (
          <li key={course._id}>
            <CourseCard course={course} onOpen={setSelectedId} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Page className="crs">
      <PageHeader
        size="display"
        title="Courses"
        count={count}
        description="Curated courses to learn, practice and master competitive programming."
      />

      {error ? (
        <Notice
          tone="danger"
          title="Courses did not load"
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
        <section className="crs-filters" aria-label="Filter courses">
          <div className="ui-toolbar crs-toolbar">
            <SearchField
              className="ui-toolbar__grow"
              value={filters.search}
              onChange={(value) => setFilter('search', value)}
              placeholder="Search courses"
              label="Search courses by title, provider or topic"
            />
            <SelectField
              variant="pill"
              aria-label="Level"
              value={filters.level}
              onChange={(event) => setFilter('level', event.target.value)}
              disabled={loading}
            >
              <option value="">All levels</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </SelectField>
            {filtersOn ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="ui-chips" data-scroll="true" role="group" aria-label="Category">
            {CATEGORIES.map((category) => (
              <Chip key={category.key} selected={filters.category === category.key} onClick={() => setFilter('category', category.key)}>
                {category.label}
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      {showCount ? (
        <p className="ui-sr" role="status">
          {`Showing ${pluralize(visible.length, 'course')}`}
        </p>
      ) : null}

      <section className="crs-results" aria-labelledby="crs-results-title">
        <h2 className="ui-sr" id="crs-results-title">
          Course list
        </h2>
        {results}
      </section>

      <CourseDetails course={selected} onClose={closeDetails} />
    </Page>
  );
}
