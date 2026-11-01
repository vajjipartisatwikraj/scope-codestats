import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../contexts/AuthContext';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * The student's progress in each cohort of a list: GET {apiUrl}/cohorts/:id/progress (the quick
 * counts endpoint built for lists), asked once per cohort, all at the same time.
 *
 * Returns progressFor(id), which answers
 *   undefined                                     still loading
 *   { status: 'ready', totalQuestions, solvedQuestions, progressPercentage, isEnrolled }
 *   { status: 'failed' }                          the counts could not be read
 * so a card can show a placeholder while it waits and still be useful when a request fails.
 *
 * @param {Array<{_id: string}>} cohorts
 */
export default function useCohortProgress(cohorts) {
  const { token } = useAuth();
  const [byId, setById] = useState({});
  const asked = useRef(new Set());

  useEffect(() => {
    if (!token) return undefined;
    const fresh = cohorts.map((cohort) => cohort._id).filter((id) => id && !asked.current.has(id));
    if (fresh.length === 0) return undefined;
    fresh.forEach((id) => asked.current.add(id));

    let cancelled = false;
    let finished = false;
    Promise.all(
      fresh.map((id) =>
        axios
          .get(`${apiUrl}/cohorts/${id}/progress`, { headers: { Authorization: `Bearer ${token}` } })
          .then((response) => [id, { status: 'ready', ...response.data }])
          .catch(() => [id, { status: 'failed' }])
      )
    ).then((entries) => {
      finished = true;
      if (!cancelled) setById((current) => ({ ...current, ...Object.fromEntries(entries) }));
    });

    return () => {
      cancelled = true;
      // An answer that was dropped before it arrived has to be asked for again
      if (!finished) fresh.forEach((id) => asked.current.delete(id));
    };
  }, [cohorts, token]);

  return (id) => byId[id];
}
