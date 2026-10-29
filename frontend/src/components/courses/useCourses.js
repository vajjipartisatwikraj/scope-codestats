import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/apiConfig';

/**
 * Loads the course catalogue: GET {apiUrl}/courses with the student's bearer token.
 *
 * Returns { courses, loading, error, reload }. The messages are the ones the page has always used:
 * no token, a 401, and any other failure. `reload` asks again (the Retry button).
 */
export default function useCourses() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    if (!token) {
      setError('Please log in to view courses');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUrl}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (request !== latest.current) return;
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (request !== latest.current) return;
      setError(err.response?.status === 401 ? 'Authentication error. Please log in again.' : 'Failed to load courses. Please try again later.');
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    // A newer request (or leaving the page) makes the older answer irrelevant
    return () => {
      latest.current += 1;
    };
  }, [load]);

  return { courses, loading, error, reload: load };
}
