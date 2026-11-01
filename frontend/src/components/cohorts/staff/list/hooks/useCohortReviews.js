import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as api from '../api/cohortAdminApi';

/**
 * The reviews of every cohort, read only when the Reviews tab is opened. Cohorts cloned from one
 * another share their reviews, so a review that comes back from several cohorts is listed once, with
 * the titles of all the cohorts that share it in `relatedCohorts` (null when it belongs to one).
 *
 * Returns { reviews, loading, loaded, load(cohorts, force), removeMany(reviews), removeOne(review) }.
 * The two remove functions resolve true when they worked and read the reviews again.
 */
export default function useCohortReviews() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(
    async (cohorts, force = false) => {
      if (loaded && !force) return;
      setLoading(true);
      try {
        const unique = new Map();
        for (const cohort of cohorts) {
          try {
            const data = await api.cohortFeedback(token, cohort._id);
            (data?.feedbacks || []).forEach((feedback) => {
              const known = unique.get(feedback._id);
              if (known) {
                if (!known.relatedCohorts) known.relatedCohorts = [known.cohortTitle];
                if (!known.relatedCohorts.includes(cohort.title)) known.relatedCohorts.push(cohort.title);
              } else {
                unique.set(feedback._id, { ...feedback, cohortId: cohort._id, cohortTitle: cohort.title, relatedCohorts: null });
              }
            });
          } catch (error) {
            console.error(`Error fetching reviews for cohort ${cohort.title}:`, error);
          }
        }
        setReviews(Array.from(unique.values()));
        setLoaded(true);
      } catch (error) {
        console.error('Error fetching all reviews:', error);
        toast.error('Failed to fetch reviews');
      } finally {
        setLoading(false);
      }
    },
    [token, loaded]
  );

  const removeMany = useCallback(
    async (chosen, cohorts) => {
      try {
        for (const review of chosen) await api.deleteFeedback(token, review.cohortId, review._id);
        toast.success(`${chosen.length} review(s) deleted successfully`);
        await load(cohorts, true);
        return true;
      } catch (error) {
        console.error('Error deleting reviews:', error);
        toast.error('Failed to delete reviews');
        return false;
      }
    },
    [token, load]
  );

  const removeOne = useCallback(
    async (review, cohorts) => {
      try {
        await api.deleteFeedback(token, review.cohortId, review._id);
        toast.success('Review deleted successfully');
        await load(cohorts, true);
        return true;
      } catch (error) {
        console.error('Error deleting review:', error);
        toast.error('Failed to delete review');
        return false;
      }
    },
    [token, load]
  );

  return { reviews, loading, loaded, load, removeMany, removeOne };
}
