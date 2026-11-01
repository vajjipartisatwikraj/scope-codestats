/** Filtering and summing the reviews of the staff dashboard. No React and no network. */

export const EMPTY_REVIEW_FILTERS = { cohortId: 'all', rating: 'all', search: '' };

export const hasReviewFilters = (filters) => filters.cohortId !== 'all' || filters.rating !== 'all' || Boolean(filters.search.trim());

/** The reviews of the chosen cohort, the chosen rating and whose name or roll number contains the search */
export function filterReviews(reviews, filters) {
  const term = filters.search.trim().toLowerCase();
  return reviews.filter((review) => {
    if (filters.cohortId !== 'all' && review.cohortId !== filters.cohortId) return false;
    if (filters.rating !== 'all' && review.rating !== parseInt(filters.rating, 10)) return false;
    if (term) {
      const name = (review.user?.name || '').toLowerCase();
      const roll = (review.user?.rollNumber || '').toLowerCase();
      if (!name.includes(term) && !roll.includes(term)) return false;
    }
    return true;
  });
}

/** The mean rating of a list, or null when it is empty */
export const averageRating = (reviews) => (reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null);

export const RATING_OPTIONS = [
  { value: 'all', label: 'Any rating' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
];
