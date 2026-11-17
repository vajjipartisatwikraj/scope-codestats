import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as api from '../api/problemApi';

/**
 * The lists the page reads only when they are opened: the editorial of the question, the
 * submissions of every student and (staff only, see useSolutions) the reference solutions. Each has load(), which reads once and then does nothing, and
 * starts over when the question changes. Both are open only to a student who has solved the question;
 * the server refuses otherwise (403 NO_ACCEPTED_SUBMISSION) and the student is told why.
 */

/** The editorial: { editorial, loading, denied, load } */
export function useEditorial({ cohortId, questionId }) {
  const { token } = useAuth();
  const [state, setState] = useState({ editorial: '', loading: false, denied: false });
  const asked = useRef(false);

  useEffect(() => {
    asked.current = false;
    setState({ editorial: '', loading: false, denied: false });
  }, [cohortId, questionId]);

  const load = useCallback(async () => {
    if (asked.current) return;
    asked.current = true;
    setState({ editorial: '', loading: true, denied: false });
    try {
      const editorial = await api.fetchEditorial(token, { cohortId, questionId });
      setState({ editorial: editorial || '', loading: false, denied: false });
    } catch (error) {
      console.error('Error fetching editorial:', error);
      const denied = error.response?.status === 403 && error.response?.data?.error === 'NO_ACCEPTED_SUBMISSION';
      if (denied) toast.info('Solve the question correctly first to view the editorial');
      setState({ editorial: '', loading: false, denied });
    }
  }, [token, cohortId, questionId]);

  return { ...state, load };
}

/** The submissions of all students: { items, loaded, load } */
export function useAllSubmissions({ cohortId, moduleId, questionId }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems([]);
    setLoaded(false);
  }, [cohortId, moduleId, questionId]);

  const load = useCallback(async () => {
    if (loaded) return;
    setLoaded(true);
    try {
      setItems(await api.fetchAllSubmissions(token, { cohortId, moduleId, questionId }));
    } catch (error) {
      console.error('Error fetching all users submissions:', error);
      if (error.response?.status === 403 && error.response?.data?.error === 'NO_ACCEPTED_SUBMISSION') {
        toast.info("Solve the question correctly first to view others' submissions");
      }
      setItems([]);
    }
  }, [loaded, token, cohortId, moduleId, questionId]);

  return { items, loaded, load };
}

/** The reference solutions, for staff only: { solutions, loading, failed, load } */
export function useSolutions({ cohortId, moduleId, questionId }) {
  const { token } = useAuth();
  const [state, setState] = useState({ solutions: null, loading: false, failed: false });
  const asked = useRef(false);

  useEffect(() => {
    asked.current = false;
    setState({ solutions: null, loading: false, failed: false });
  }, [cohortId, moduleId, questionId]);

  const load = useCallback(async () => {
    if (asked.current) return;
    asked.current = true;
    setState({ solutions: null, loading: true, failed: false });
    try {
      setState({ solutions: await api.fetchSolutions(token, { cohortId, moduleId, questionId }), loading: false, failed: false });
    } catch (error) {
      console.error('Error fetching solutions:', error);
      asked.current = false;
      setState({ solutions: null, loading: false, failed: true });
    }
  }, [token, cohortId, moduleId, questionId]);

  return { ...state, load };
}