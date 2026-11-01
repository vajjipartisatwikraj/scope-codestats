import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * A cohort's reviews and the signed-in student's own. Reviews belong to the whole group of related
 * cohorts (a cohort and its copies), which is what the server answers.
 *
 *   GET    /cohorts/:id/feedback         { feedbacks, averageRating, totalReviews }
 *   GET    /cohorts/:id/feedback/user    { hasFeedback, feedback: { _id, rating, comment } | null }
 *   POST   /cohorts/:id/feedback         { rating, comment }   adds or updates the student's review
 *   DELETE /cohorts/:id/feedback/:feedbackId
 *
 * Returns { reviews, average, total, mine, loading, error, saving, save, remove, reload }.
 * `save` and `remove` toast their own result and reload; they resolve true when they worked.
 */
export default function useCohortFeedback(cohortId) {
  const { token } = useAuth();
  const [state, setState] = useState({ reviews: [], average: 0, total: 0, mine: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const latest = useRef(0);
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    const request = ++latest.current;
    if (!token) return;
    setError(null);
    try {
      const [all, own] = await Promise.all([
        axios.get(`${apiUrl}/cohorts/${cohortId}/feedback`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/cohorts/${cohortId}/feedback/user`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (request !== latest.current) return;
      const reviews = Array.isArray(all.data?.feedbacks) ? all.data.feedbacks : [];
      setState({
        reviews,
        average: Number(all.data?.averageRating) || 0,
        total: Number(all.data?.totalReviews) || reviews.length,
        mine: own.data?.hasFeedback ? own.data.feedback : null,
      });
    } catch {
      if (request !== latest.current) return;
      setError('We could not load the reviews. Check your connection and try again.');
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [cohortId, token]);

  useEffect(() => {
    setLoading(true);
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  const save = useCallback(
    async ({ rating, comment }) => {
      setSaving(true);
      try {
        const response = await axios.post(`${apiUrl}/cohorts/${cohortId}/feedback`, { rating, comment }, { headers });
        toast.success(response.data?.message || 'Review saved.');
        await load();
        return true;
      } catch (failure) {
        toast.error(failure.response?.data?.message || 'We could not save your review. Try again.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cohortId, token, load]
  );

  const remove = useCallback(
    async (feedbackId) => {
      setSaving(true);
      try {
        await axios.delete(`${apiUrl}/cohorts/${cohortId}/feedback/${feedbackId}`, { headers });
        toast.success('Your review was deleted.');
        await load();
        return true;
      } catch (failure) {
        toast.error(failure.response?.data?.message || 'We could not delete your review. Try again.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cohortId, token, load]
  );

  return { ...state, loading, error, saving, save, remove, reload: load };
}
