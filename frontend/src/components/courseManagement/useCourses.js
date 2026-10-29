import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/apiConfig';

/**
 * The courses of the admin screen and the three things an admin does to them. The endpoints, the
 * Authorization header and the toasts are the ones the page has always used:
 *
 *   GET    ${apiUrl}/admin/courses
 *   POST   ${apiUrl}/admin/courses
 *   PUT    ${apiUrl}/admin/courses/:id
 *   DELETE ${apiUrl}/admin/courses/:id
 *
 * The first load shows skeletons; every load after a change refreshes quietly behind the table.
 *
 * @returns {{ courses: Array, loading: boolean, refreshing: boolean, failed: boolean,
 *   reload: () => Promise<void>, save: (form, id?) => Promise<boolean>, remove: (id) => Promise<boolean> }}
 */
export default function useCourses() {
  const { token } = useAuth();
  const [state, setState] = useState({ courses: [], loading: true, refreshing: false, failed: false });
  const alive = useRef(true);

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      setState((previous) => ({ ...previous, loading: !quiet && previous.courses.length === 0, refreshing: quiet || previous.courses.length > 0, failed: false }));
      try {
        const response = await axios.get(`${apiUrl}/admin/courses`, { headers: { Authorization: `Bearer ${token}` } });
        if (alive.current) setState({ courses: Array.isArray(response.data) ? response.data : [], loading: false, refreshing: false, failed: false });
      } catch (error) {
        toast.error('Failed to fetch courses');
        if (alive.current) setState((previous) => ({ ...previous, loading: false, refreshing: false, failed: true }));
      }
    },
    [token]
  );

  // The courses are fetched once, when the page opens
  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Creates the course, or updates it when an id is given. Returns true when the server accepted it. */
  const save = async (form, id) => {
    try {
      if (id) {
        await axios.put(`${apiUrl}/admin/courses/${id}`, form, { headers });
        toast.success('Course updated successfully');
      } else {
        await axios.post(`${apiUrl}/admin/courses`, form, { headers });
        toast.success('Course created successfully');
      }
      load({ quiet: true });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
      return false;
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${apiUrl}/admin/courses/${id}`, { headers });
      toast.success('Course deleted successfully');
      load({ quiet: true });
      return true;
    } catch (error) {
      toast.error('Failed to delete course');
      return false;
    }
  };

  return { ...state, reload: () => load(), save, remove };
}
