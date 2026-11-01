import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as api from '../api/cohortAdminApi';

/**
 * What deleting a cohort would remove, asked of the server: the modules, questions and progress
 * records that go with it, the related cohorts that keep the modules, and the user groups that must
 * be detached first. Returns { impact, loading, check(cohort), clear() }.
 */
export default function useDeletionImpact() {
  const { token } = useAuth();
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(
    async (cohort) => {
      setLoading(true);
      try {
        setImpact(await api.deletionImpact(token, cohort._id));
      } catch (error) {
        console.error('Error fetching deletion impact:', error);
        toast.error('Failed to check deletion impact');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const clear = useCallback(() => setImpact(null), []);
  return { impact, loading, check, clear };
}
