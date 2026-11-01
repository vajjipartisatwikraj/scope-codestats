import React from 'react';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Avatar, Badge, Checkbox, IconButton, formatDate, formatDateTime } from '../../../../ui';
import { StarRating } from '../../../../custom-components';

/** The cohort a review was left in, and how many more share it (cloned cohorts share their reviews) */
function CohortCell({ review }) {
  const others = review.relatedCohorts && review.relatedCohorts.length > 1 ? review.relatedCohorts.length - 1 : 0;
  return (
    <span className="cmr-cohort" title={others ? `Shared across: ${review.relatedCohorts.join(', ')}` : undefined}>
      <Badge tone="info">{review.cohortTitle}</Badge>
      {others ? <Badge tone="neutral">+{others} more</Badge> : null}
      {others ? <span className="ui-sr">{`Shared across ${review.relatedCohorts.join(', ')}`}</span> : null}
    </span>
  );
}

function Student({ review }) {
  return (
    <span className="ui-table__cell-main">
      <Avatar name={review.user?.name || 'Anonymous'} src={review.user?.profilePicture} size={32} />
      <span className="ui-table__cell-text">
        <span className="ui-table__title">{review.user?.name || 'Anonymous'}</span>
        <span className="ui-table__meta">{review.user?.rollNumber || 'No roll number'}</span>
      </span>
    </span>
  );
}

function Stars({ review }) {
  return (
    <span className="cmr-rating">
      <StarRating value={review.rating} readOnly size={16} label={`Rating: ${review.rating} of 5`} />
      <span className="cmr-rating__value">{review.rating.toFixed(1)}</span>
    </span>
  );
}

/** A checkbox whose label is for assistive technology only */
function Pick({ review, checked, onToggle }) {
  return <Checkbox checked={checked} onChange={() => onToggle(review._id)} label={<span className="ui-sr">{`Select the review by ${review.user?.name || 'Anonymous'}`}</span>} />;
}

/**
 * The reviews as a table (900px and wider) or as a list of rows (phones). A review can be ticked for
 * the bulk delete or deleted on its own.
 *
 *   reviews, selected   the reviews to show and the ids ticked
 *   mobile              below 900px: rows instead of the table
 *   onToggle(id), onToggleAll()   tick one review, or all that are shown
 *   onDelete(review)    the delete button of a row
 */
export default function ReviewRows({ reviews, selected, mobile, onToggle, onToggleAll, onDelete }) {
  if (mobile) {
    return (
      <ul className="ui-list">
        {reviews.map((review) => (
          <li key={review._id} className="ui-list__row cmr-item">
            <Pick review={review} checked={selected.includes(review._id)} onToggle={onToggle} />
            <div className="cmr-item__body">
              <div className="cmr-item__head">
                <Student review={review} />
                <IconButton label="Delete this review" size="sm" tone="danger" onClick={() => onDelete(review)}>
                  <TrashIcon size={20} weight="regular" aria-hidden="true" />
                </IconButton>
              </div>
              <Stars review={review} />
              <p className="cmr-comment">{review.comment || 'No comment'}</p>
              <div className="cmr-item__foot">
                <CohortCell review={review} />
                <span className="ui-table__meta">{formatDate(review.createdAt)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const allTicked = reviews.length > 0 && reviews.every((review) => selected.includes(review._id));
  return (
    <div className="ui-table-wrap">
      <table className="ui-table" data-density="compact">
        <caption className="ui-sr">Reviews of all cohorts</caption>
        <thead>
          <tr>
            <th scope="col" className="cmr-check">
              <Checkbox checked={allTicked} onChange={onToggleAll} label={<span className="ui-sr">Select all reviews shown</span>} />
            </th>
            <th scope="col">Student</th>
            <th scope="col">Cohort</th>
            <th scope="col">Rating</th>
            <th scope="col">Comment</th>
            <th scope="col">Date</th>
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review._id} data-selected={selected.includes(review._id) ? 'true' : 'false'}>
              <td className="cmr-check">
                <Pick review={review} checked={selected.includes(review._id)} onToggle={onToggle} />
              </td>
              <td>
                <Student review={review} />
              </td>
              <td>
                <CohortCell review={review} />
              </td>
              <td>
                <Stars review={review} />
              </td>
              <td className="cmr-comment-cell">
                <p className="cmr-comment">{review.comment || 'No comment'}</p>
              </td>
              <td className="ui-muted" title={formatDateTime(review.createdAt)}>
                {formatDate(review.createdAt)}
              </td>
              <td>
                <div className="ui-table__actions">
                  <IconButton label={`Delete the review by ${review.user?.name || 'Anonymous'}`} size="sm" tone="danger" onClick={() => onDelete(review)}>
                    <TrashIcon size={20} weight="regular" aria-hidden="true" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
