import { useCallback, useEffect, useRef, useState } from 'react';
import axios from '../../utils/axiosConfig';
import { apiUrl } from '../../config/apiConfig';
import { apiErrorMessage } from '../../services/platformProgressApi';
import { useAuth } from '../../contexts/AuthContext';
import { enrich } from './leaderboardModel';

/**
 * The students of the leaderboard, from GET /api/leaderboard (every ranked student in one answer).
 *
 * The answer is kept for a few minutes, so coming back to the page shows the list at once and
 * quietly brings it up to date behind it. A different student signing in never sees the previous
 * one's copy (it is kept with the token it was loaded with).
 *
 * @returns {{ rows: Array, loading: boolean, refreshing: boolean, error: string|null,
 *            loadedAt: Date|null, reload: () => void }}
 *   loading     true until the first list has arrived
 *   refreshing  true while a list that is already on screen is being renewed
 */
const KEEP_MS = 5 * 60 * 1000;
let kept = null; // { token, at, rows }

export default function useLeaderboard() {
  const { token } = useAuth();
  const fresh = kept && kept.token === token && Date.now() - kept.at < KEEP_MS ? kept : null;

  const [state, setState] = useState({
    rows: fresh ? fresh.rows : [],
    loading: !fresh,
    refreshing: false,
    error: null,
    loadedAt: fresh ? new Date(fresh.at) : null,
  });
  const running = useRef(null);

  const load = useCallback(
    async () => {
      if (!token) return;
      if (running.current) running.current.abort();
      const controller = new AbortController();
      running.current = controller;

      // Nothing on screen yet: the page shows its placeholders. Something on screen: it stays, and
      // the refresh control shows that it is being renewed.
      setState((current) => ({
        ...current,
        error: null,
        loading: current.rows.length === 0,
        refreshing: current.rows.length > 0,
      }));

      try {
        const response = await axios.get(`${apiUrl}/leaderboard`, {
          params: { sortBy: 'totalScore', order: 'desc' },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const rows = enrich(response.data);
        kept = { token, at: Date.now(), rows };
        setState({ rows, loading: false, refreshing: false, error: null, loadedAt: new Date(kept.at) });
      } catch (error) {
        if (controller.signal.aborted || axios.isCancel?.(error)) return;
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: apiErrorMessage(error, 'We could not load the leaderboard.'),
        }));
      } finally {
        if (running.current === controller) running.current = null;
      }
    },
    [token]
  );

  useEffect(() => {
    // A copy that is still fresh is shown at once and renewed behind it
    load();
    return () => {
      if (running.current) running.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reload = useCallback(() => load(), [load]);

  return { ...state, reload };
}
