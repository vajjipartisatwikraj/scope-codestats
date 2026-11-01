import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, ConfirmDialog, Notice, ReviewItem, Skeleton, TextField, pluralize } from '../../../../ui';
import { StarRating } from '../../../../custom-components';
import useCohortFeedback from '../hooks/useCohortFeedback';
import './feedbackPanel.css';

// The server's limits (feedbackController): 300 characters and 50 words
const MAX_CHARS = 300;
const MAX_WORDS = 50;
const WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Rate and review: the student's own review of the cohort (one per cohort and its copies) over
 * everyone's reviews. The form is a star rating with the words Poor to Excellent and a comment of up
 * to 50 words, counted as they type; an existing review can be changed or deleted (after a
 * confirmation). Only students who have joined the cohort can review, which the server enforces.
 *
 *   cohortId
 *   currentUserId   to mark the student's own review in the list
 */
export default function FeedbackPanel({ cohortId, currentUserId }) {
  const { reviews, average, total, mine, loading, error, saving, save, remove, reload } = useCohortFeedback(cohortId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [confirming, setConfirming] = useState(false);
  const filled = useRef(false);

  // The form starts from the student's existing review, once it has loaded
  useEffect(() => {
    if (!loading && !filled.current) {
      filled.current = true;
      if (mine) {
        setRating(Math.round(mine.rating) || 0);
        setComment(mine.comment || '');
      }
    }
  }, [loading, mine]);

  const words = wordCount(comment);
  const tooLong = words > MAX_WORDS;
  const unchanged = Boolean(mine) && rating === Math.round(mine.rating) && comment.trim() === (mine.comment || '').trim();
  const canSave = rating > 0 && !tooLong && !unchanged && !saving;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    await save({ rating, comment: comment.trim() });
  };

  const confirmDelete = async () => {
    const done = await remove(mine._id);
    if (done) {
      setConfirming(false);
      setRating(0);
      setComment('');
    }
  };

  return (
    <div className="cdf">
      <Card as="section" title={mine ? 'Your review' : 'Rate and review'} description="Your review applies to this cohort and its copies." className="cdf-form">
        {loading ? (
          <div className="cdf-loading" role="status" aria-label="Loading your review">
            <Skeleton height={32} width={220} />
            <Skeleton height={96} radius="var(--ds-radius-md)" />
          </div>
        ) : (
          <form className="cdf-fields" onSubmit={submit} noValidate>
            <StarRating value={rating} onChange={setRating} labels={WORDS} label="Your rating" size={28} />
            <TextField
              label="Comment (optional)"
              multiline
              rows={4}
              value={comment}
              maxLength={MAX_CHARS}
              onChange={(event) => setComment(event.target.value)}
              placeholder="What helped, and what would make it better?"
              hint={`${words} of ${MAX_WORDS} words`}
              error={tooLong ? `Keep it to ${MAX_WORDS} words. You are ${words - MAX_WORDS} over.` : undefined}
            />
            <div className="cdf-actions">
              <Button type="submit" variant="primary" loading={saving} disabled={!canSave}>
                {mine ? 'Update review' : 'Submit review'}
              </Button>
              {mine ? (
                <Button variant="ghost" onClick={() => setConfirming(true)} disabled={saving}>
                  Delete my review
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </Card>

      <Card as="section" title="Reviews" description={total > 0 ? `${average.toFixed(1)} average from ${pluralize(total, 'review')}` : undefined} className="cdf-list">
        {loading ? (
          <Skeleton height={64} radius="var(--ds-radius-md)" />
        ) : error ? (
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
        ) : reviews.length === 0 ? (
          <p className="cdf-empty">No reviews yet. Yours can be the first.</p>
        ) : (
          <ul className="ui-reviews" aria-label="Reviews">
            {reviews.map((review, index) => (
              <li key={review._id || index}>
                <ReviewItem
                  name={String(review.user?._id || review.user) === String(currentUserId) ? `${review.user?.name || 'You'} (you)` : review.user?.name}
                  picture={review.user?.profilePicture}
                  rating={Number(review.rating) || 0}
                  comment={review.comment}
                  date={review.createdAt}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete your review?"
        description="Your rating and comment will be removed from this cohort and its copies. You can write a new one later."
        confirmLabel="Delete review"
        onConfirm={confirmDelete}
        danger
        busy={saving}
      />
    </div>
  );
}
