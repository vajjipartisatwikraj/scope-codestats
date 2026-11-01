import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../contexts/AuthContext';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * Loads the cohorts the signed-in student may open: GET {apiUrl}/cohorts with their bearer token.
 * The answer carries each cohort's exam state and the student's own progress status.
 *
 * Returns { cohorts, loading, error, reload }. `reload` asks again (the Retry button) and a newer
 * request, or leaving the page, makes an older answer irrelevant.
 */
export default function useCohorts() {
  const { token } = useAuth();
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    if (!token) {
      setError('Sign in to see your cohorts.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUrl}/cohorts`, { headers: { Authorization: `Bearer ${token}` } });
      if (request !== latest.current) return;
      setCohorts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (request !== latest.current) return;
      setError(
        err.response?.status === 401
          ? 'Your session has ended. Sign in again to see your cohorts.'
          : 'We could not load your cohorts. Check your connection and try again.'
      );
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  return { cohorts, loading, error, reload: load };
}
