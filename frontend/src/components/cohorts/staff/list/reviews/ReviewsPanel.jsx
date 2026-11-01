import React, { useEffect, useMemo, useState } from 'react';
import { ChatCircleTextIcon } from '@phosphor-icons/react/dist/csr/ChatCircleText';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { BulkBar, Button, Card, ConfirmDialog, EmptyState, SearchField, SelectField, SkeletonRows, StatGrid, StatTile, Toolbar, formatNumber } from '../../../../ui';
import { EMPTY_REVIEW_FILTERS, RATING_OPTIONS, averageRating, filterReviews, hasReviewFilters } from '../model/reviews';
import ReviewRows from './ReviewRows';
import './reviews.css';

/**
 * The Reviews tab: every review across the cohorts. Three figures first (all, shown and the average),
 * then the filter row (cohort, rating, the student's name or roll number), then the reviews with a
 * tick on each for deleting several at once. Deleting always asks first. Reviews are read the first
 * time the tab opens (useCohortReviews).
 *
 *   cohorts   the cohorts, for the cohort filter and for reading their reviews
 *   data      the result of useCohortReviews
 *   mobile    below 900px: rows instead of the table
 */
export default function ReviewsPanel({ cohorts, data, mobile }) {
  const { reviews, loading, loaded, load, removeMany, removeOne } = data;
  const [filters, setFilters] = useState(EMPTY_REVIEW_FILTERS);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null); // { reviews } to delete
  const [deleting, setDeleting] = useState(false);

  // The first time the tab opens, with the cohorts known
  useEffect(() => {
    if (cohorts.length > 0 && !loaded) load(cohorts);
  }, [cohorts, loaded, load]);

  const shown = useMemo(() => filterReviews(reviews, filters), [reviews, filters]);
  const average = averageRating(reviews);
  const filtering = hasReviewFilters(filters);

  const setFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  const toggleAll = () => setSelected((current) => (shown.length > 0 && shown.every((review) => current.includes(review._id)) ? [] : shown.map((review) => review._id)));

  const confirmDelete = async () => {
    setDeleting(true);
    const ok = confirm.reviews.length === 1 && !confirm.bulk ? await removeOne(confirm.reviews[0], cohorts) : await removeMany(confirm.reviews, cohorts);
    setDeleting(false);
    if (ok) {
      setSelected([]);
      setConfirm(null);
    }
  };

  let body;
  if (loading && reviews.length === 0) {
    body = (
      <Card flush aria-busy="true" aria-label="Reviews">
        <SkeletonRows count={6} height={mobile ? 96 : 56} />
      </Card>
    );
  } else if (reviews.length === 0) {
    body = <EmptyState icon={<ChatCircleTextIcon size={28} weight="regular" />} title="No reviews yet" text="Reviews students leave on their cohorts will show up here." />;
  } else if (shown.length === 0) {
    body = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No reviews match"
        text="Try a different cohort, rating or name."
        action={
          <Button variant="secondary" onClick={() => setFilters(EMPTY_REVIEW_FILTERS)}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    body = (
      <Card flush aria-label="Reviews">
        <ReviewRows reviews={shown} selected={selected} mobile={mobile} onToggle={toggle} onToggleAll={toggleAll} onDelete={(review) => setConfirm({ reviews: [review] })} />
      </Card>
    );
  }

  return (
    <div className="cmr">
      <p className="cmr-intro">Every review across your cohorts. Cohorts cloned from one another share their reviews, so a review is listed once.</p>

      {reviews.length > 0 ? (
        <StatGrid columns={3} label="Review summary">
          <StatTile size="m" label="Reviews" value={reviews.length} context="Across all cohorts" />
          <StatTile size="m" label="Shown" value={shown.length} context={filtering ? `Filtered from ${formatNumber(reviews.length)}` : 'No filter on'} />
          <StatTile size="m" label="Average rating" value={average === null ? '\u2013' : `${average.toFixed(2)} of 5`} context="Over all reviews" />
        </StatGrid>
      ) : null}

      {reviews.length > 0 ? (
        <Toolbar
          label="Filter reviews"
          search={<SearchField value={filters.search} onChange={(search) => setFilters((current) => ({ ...current, search }))} placeholder="Search by name or roll number" label="Search reviews by student" />}
        >
          <SelectField variant="pill" aria-label="Filter by cohort" value={filters.cohortId} onChange={setFilter('cohortId')} options={[{ value: 'all', label: 'All cohorts' }, ...cohorts.map((cohort) => ({ value: cohort._id, label: cohort.title }))]} />
          <SelectField variant="pill" aria-label="Filter by rating" value={filters.rating} onChange={setFilter('rating')} options={RATING_OPTIONS} />
          {filtering ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_REVIEW_FILTERS)}>
              Clear filters
            </Button>
          ) : null}
        </Toolbar>
      ) : null}

      {body}

      <BulkBar count={selected.length} onClear={() => setSelected([])}>
        <Button
          variant="danger"
          size="sm"
          startIcon={<TrashIcon size={16} weight="regular" aria-hidden="true" />}
          onClick={() => setConfirm({ reviews: reviews.filter((review) => selected.includes(review._id)), bulk: true })}
        >
          Delete selected
        </Button>
      </BulkBar>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm && confirm.reviews.length > 1 ? `Delete ${confirm.reviews.length} reviews?` : 'Delete this review?'}
        description="They are removed from every related cohort that shares them. This cannot be undone."
        confirmLabel={confirm && confirm.reviews.length > 1 ? 'Delete reviews' : 'Delete review'}
        danger
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
