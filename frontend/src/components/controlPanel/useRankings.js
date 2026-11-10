import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { rankingAdminApi } from '../../services/rankingAdminApi';

const POLL_WHILE_RUNNING_MS = 3000;

/**
 * The data of the scores and ranks part of the control panel: the latest calculations and the
 * "Recalculate ranks now" action. Ranks are calculated by themselves after every profile sync; an
 * admin can calculate now from the scores already stored (it contacts no platform). Same calls and
 * messages as the Material UI panel it replaces. Nothing polls unless a calculation is running.
 *
 *   token   the signed-in admin's token
 */
export default function useRankings(token) {
  const [state, setState] = useState({ running: false, syncRunning: false, runs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await rankingAdminApi.status(token));
      setError('');
    } catch (failure) {
      setError(failure?.response?.data?.message || 'Could not load the ranking history');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!state.running) return undefined;
    const timer = setInterval(load, POLL_WHILE_RUNNING_MS);
    return () => clearInterval(timer);
  }, [state.running, load]);

  const recompute = useCallback(async () => {
    setStarting(true);
    try {
      const { run } = await rankingAdminApi.recompute(token);
      toast.success(`Ranks calculated for ${run.students} students (${run.written} changed)`);
    } catch (failure) {
      if (failure?.response?.status === 409) toast.info(failure.response.data?.message || 'Ranks cannot be calculated right now');
      else toast.error(failure?.response?.data?.message || 'Could not calculate ranks');
    } finally {
      setStarting(false);
      load();
    }
  }, [token, load]);

  return { runs: state.runs || [], running: state.running, syncRunning: state.syncRunning, loading, error, starting, load, recompute };
}
