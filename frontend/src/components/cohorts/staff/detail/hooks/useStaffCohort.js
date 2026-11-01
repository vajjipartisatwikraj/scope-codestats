import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as api from '../api/staffCohortApi';

const LIST = '/admin/cohorts';

/**
 * The cohort of the staff page with its modules (GET /cohorts/admin/:id). A cohort that comes back
 * without modules gets them from the modules endpoint. Refusals are answered as the page always did:
 * a cohort that is gone, or that staff may not open, goes back to the list with a message.
 *
 * Returns { cohort, modules, loading, reload }. `loading` is true only for the first read; `reload`
 * reads again without clearing the page, so an edit does not blank the screen.
 */
export default function useStaffCohort(id) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [state, setState] = useState({ cohort: null, modules: [], loading: true });
  const latest = useRef(0);

  const load = useCallback(
    async (first) => {
      const request = ++latest.current;
      if (first) setState({ cohort: null, modules: [], loading: true });
      try {
        const cohort = await api.fetchStaffCohort(token, id);
        let modules = Array.isArray(cohort.modules) ? cohort.modules : [];
        if (modules.length === 0) {
          try {
            modules = (await api.fetchModules(token, id))?.modules || [];
          } catch (error) {
            if (error.response && error.response.status !== 404) toast.error('Failed to fetch modules');
          }
        }
        if (request === latest.current) setState({ cohort, modules, loading: false });
      } catch (error) {
        if (request !== latest.current) return;
        console.error('Error fetching cohort details:', error);
        const data = error.response?.data;
        if (error.response?.status === 404 && data?.reason === 'not_found') {
          toast.error('Cohort not found. It may have been deleted.');
        } else if (error.response?.status === 403 && data?.reason === 'not_eligible') {
          toast.error("You're not eligible to view this cohort.");
        } else if (error.response?.status === 403 && data?.reason === 'not_active') {
          toast.error('This cohort is currently inactive.');
        } else {
          toast.error('Failed to fetch cohort details');
        }
        navigateRef.current(LIST);
      }
    },
    [id, token]
  );

  useEffect(() => {
    load(true);
    return () => {
      latest.current += 1;
    };
  }, [load]);

  const reload = useCallback(() => load(false), [load]);
  return { ...state, reload };
}
