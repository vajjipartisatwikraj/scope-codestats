import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../contexts/AuthContext';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * The reviews of one cohort: GET {apiUrl}/cohorts/:id/feedback. Reviews belong to the whole group
 * of related cohorts (a cohort and its copies), which is what the server answers.
 *
 * Returns { reviews, average, total, loading, error, reload }. With no id nothing is asked.
 *
 * @param {string|null|undefined} cohortId
 */
export default function useCohortReviews(cohortId) {
  const { token } = useAuth();
  const [state, setState] = useState({ reviews: [], average: 0, total: 0 });
  const [loading, setLoading] = useState(Boolean(cohortId));
  const [error, setError] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    if (!cohortId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setState({ reviews: [], average: 0, total: 0 });
    try {
      const response = await axios.get(`${apiUrl}/cohorts/${cohortId}/feedback`, { headers: { Authorization: `Bearer ${token}` } });
      if (request !== latest.current) return;
      const reviews = Array.isArray(response.data?.feedbacks) ? response.data.feedbacks : [];
      setState({
        reviews,
        average: Number(response.data?.averageRating) || 0,
        total: Number(response.data?.totalReviews) || reviews.length,
      });
    } catch {
      if (request !== latest.current) return;
      setError('We could not load the reviews. Try again in a moment.');
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [cohortId, token]);

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  return { ...state, loading, error, reload: load };
}
