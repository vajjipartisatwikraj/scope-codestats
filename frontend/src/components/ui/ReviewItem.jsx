import React from 'react';
import StarRating from '../custom-components/StarRating';
import { Avatar } from './Display';
import { formatDate } from './format';
import './reviewItem.css';

/**
 * ReviewItem: one person's rating and comment, for any list of reviews (a cohort, a test, a
 * course). A flat row with no card of its own: put the items in a list and the list's hairlines
 * separate them. It never fetches; everything comes in through props.
 *
 *   name       who wrote it ('Anonymous' when unknown)
 *   picture    the profile picture; initials on a tone of the data series take its place
 *   rating     0..5, shown as read-only stars with the number beside them
 *   comment    the text; line breaks are kept. Without one the row says so, so a bare rating is
 *              never mistaken for a missing piece
 *   date       optional, shown as "26 Oct 2026" beside the name
 *   className  added to the row
 */
export default function ReviewItem({ name, picture, rating = 0, comment, date, className }) {
  const who = name || 'Anonymous';
  const text = typeof comment === 'string' ? comment.trim() : '';
  const when = date ? new Date(date) : null;
  const validDate = when && !Number.isNaN(when.getTime()) ? when : null;

  return (
    <article className={className ? `ui-review ${className}` : 'ui-review'}>
      <Avatar name={who} src={picture} size={40} />
      <div className="ui-review__body">
        <div className="ui-review__head">
          <h4 className="ui-review__name">{who}</h4>
          {validDate ? <time className="ui-review__date" dateTime={validDate.toISOString()}>{formatDate(validDate)}</time> : null}
        </div>
        <StarRating value={rating} readOnly size={16} showValue label={`${who}'s rating`} />
        {text ? <p className="ui-review__comment">{text}</p> : <p className="ui-review__comment ui-review__comment--empty">No comment left.</p>}
      </div>
    </article>
  );
}
