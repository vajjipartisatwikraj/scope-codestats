import React, { useState } from 'react';
import { Button, Notice, ReviewItem, Skeleton, formatNumber, pluralize } from '../../../../ui';
import { StarRating } from '../../../../custom-components';
import useCohortReviews from '../hooks/useCohortReviews';
import './cohortDetails.css';

const PAGE = 10;

/**
 * The reviews of a cohort for the detail panel: the average and how many reviews it rests on, then
 * the reviews, ten at a time. It loads its own data (useCohortReviews) and is mounted only while
 * the panel is open, so nothing is fetched for a cohort nobody looked at.
 *
 *   cohortId
 */
export default function CohortReviews({ cohortId }) {
  const { reviews, average, total, loading, error, reload } = useCohortReviews(cohortId);
  const [shown, setShown] = useState(PAGE);

  if (loading) {
    return (
      <div className="chd-reviews__loading" role="status" aria-label="Loading reviews">
        <Skeleton height={20} width="40%" />
        <Skeleton height={64} radius="var(--ds-radius-md)" />
        <Skeleton height={64} radius="var(--ds-radius-md)" />
      </div>
    );
  }

  if (error) {
    return (
      <Notice
        tone="danger"
        title="Reviews did not load"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  }

  if (reviews.length === 0) return <p className="chd-reviews__empty">No reviews yet.</p>;

  const visible = reviews.slice(0, shown);

  return (
    <div className="chd-reviews">
      <div className="chd-reviews__summary">
        <StarRating value={average} readOnly size={20} showValue label="Average rating" />
        <span className="chd-reviews__count">from {pluralize(total, 'review')}</span>
      </div>

      <ul className="ui-reviews" aria-label="Reviews">
        {visible.map((review, index) => (
          <li key={review._id || index}>
            <ReviewItem name={review.user?.name} picture={review.user?.profilePicture} rating={Number(review.rating) || 0} comment={review.comment} date={review.createdAt} />
          </li>
        ))}
      </ul>

      {reviews.length > shown ? (
        <Button size="sm" onClick={() => setShown((count) => count + PAGE)}>
          {`Show ${formatNumber(Math.min(PAGE, reviews.length - shown))} more`}
        </Button>
      ) : null}
    </div>
  );
}
