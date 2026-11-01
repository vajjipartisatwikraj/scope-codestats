import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../contexts/AuthContext';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * The students of a cohort ranked by score: GET {apiUrl}/cohorts/:id/leaderboard. The answer is
 * already ranked (best first, ties in order) and leaves staff out:
 *   [{ rank, user: { _id, name, rollNumber, department, section, profilePicture }, totalScore,
 *      completedModules, status }]
 *
 * Returns { entries, loading, error, reload }.
 */
export default function useCohortLeaderboard(cohortId) {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUrl}/cohorts/${cohortId}/leaderboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (request !== latest.current) return;
      setEntries(Array.isArray(response.data) ? response.data : []);
    } catch {
      if (request !== latest.current) return;
      setError('We could not load the leaderboard. Check your connection and try again.');
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

  return { entries, loading, error, reload: load };
}
