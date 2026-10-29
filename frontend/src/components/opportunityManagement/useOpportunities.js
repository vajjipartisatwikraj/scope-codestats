import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/apiConfig';
import { buildPayload } from './opportunityModel';

/**
 * The opportunities of the admin screen and the three things an admin does to them. The endpoints,
 * the Authorization header and the toasts are the ones the page has always used:
 *
 *   GET    ${apiUrl}/admin/opportunities
 *   POST   ${apiUrl}/admin/opportunities
 *   PUT    ${apiUrl}/admin/opportunities/:id
 *   DELETE ${apiUrl}/admin/opportunities/:id
 *
 * Every opportunity comes back with its tags as an array. The first load shows skeletons; every
 * load after a change refreshes quietly behind the table.
 *
 * @returns {{ opportunities: Array, loading: boolean, failed: boolean, reload: () => Promise<void>,
 *   save: (form, id?) => Promise<boolean>, remove: (id) => Promise<boolean> }}
 */
export default function useOpportunities() {
  const { token } = useAuth();
  const [state, setState] = useState({ opportunities: [], loading: true, failed: false });
  const alive = useRef(true);

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: previous.opportunities.length === 0, failed: false }));
    try {
      const response = await axios.get(`${apiUrl}/admin/opportunities`, { headers: { Authorization: `Bearer ${token}` } });
      // Ensure tags are properly formatted in each opportunity
      const opportunities = (Array.isArray(response.data) ? response.data : []).map((opportunity) => ({
        ...opportunity,
        tags: Array.isArray(opportunity.tags) ? opportunity.tags : [],
      }));
      if (alive.current) setState({ opportunities, loading: false, failed: false });
    } catch (error) {
      toast.error('Failed to fetch opportunities');
      if (alive.current) setState((previous) => ({ ...previous, loading: false, failed: true }));
    }
  }, [token]);

  // The opportunities are fetched once, when the page opens
  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Creates the opportunity, or updates it when an id is given. Returns true when the server accepted it. */
  const save = async (form, id) => {
    const submissionData = buildPayload(form);
    try {
      if (id) {
        await axios.put(`${apiUrl}/admin/opportunities/${id}`, submissionData, { headers });
        toast.success('Opportunity updated successfully');
      } else {
        await axios.post(`${apiUrl}/admin/opportunities`, submissionData, { headers });
        toast.success('Opportunity created successfully');
      }
      load();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
      return false;
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${apiUrl}/admin/opportunities/${id}`, { headers });
      toast.success('Opportunity deleted successfully');
      load();
      return true;
    } catch (error) {
      toast.error('Failed to delete opportunity');
      return false;
    }
  };

  return { ...state, reload: load, save, remove };
}
