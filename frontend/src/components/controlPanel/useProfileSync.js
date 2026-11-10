import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { syncJobApi } from '../../services/syncJobApi';

// How often things refresh. Nothing polls unless a run is actually running.
const LIST_POLL_RUNNING_MS = 4000; // the list of runs while one is going
const LIST_POLL_IDLE_MS = 30000; // the list of runs when nothing is running
const DETAIL_POLL_MS = 2000; // an open run, only while it runs

const messageOf = (error, fallback) => error?.response?.data?.message || fallback;

/**
 * The data of the profile sync part of the control panel: the runs (a page at a time), the totals of
 * the last 30 days, the run whose detail is open, and the three actions (start, cancel, refresh).
 * Same calls, messages and polling as the Material UI tab it replaces:
 *   - the list refreshes every 4 seconds while a run is going and every 30 seconds otherwise
 *   - an open run refreshes every 2 seconds while it runs; when it ends the list and the totals reload
 *   - starting while a run is going (409) opens that run instead
 *
 *   token   the signed-in admin's token
 */
export default function useProfileSync(token) {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats] = useState(null);

  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');

  const latestList = useRef(0);
  const hasRunning = jobs.some((job) => job.status === 'running');

  const loadJobs = useCallback(async () => {
    const id = ++latestList.current;
    try {
      const data = await syncJobApi.list(token, { page, limit: pageSize });
      if (id !== latestList.current) return;
      setJobs(data.syncs || []);
      setTotal(data.pagination?.total || 0);
      setError('');
    } catch (failure) {
      if (id !== latestList.current) return;
      setError(messageOf(failure, 'Could not load the sync history'));
    } finally {
      if (id === latestList.current) setLoading(false);
    }
  }, [token, page, pageSize]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await syncJobApi.stats(token, 30));
    } catch {
      // The totals are a nicety: the page works without them
    }
  }, [token]);

  const loadDetail = useCallback(
    async (id) => {
      try {
        const data = await syncJobApi.get(token, id);
        setDetail(data);
        setDetailError('');
        return data;
      } catch (failure) {
        setDetailError(messageOf(failure, 'Could not load this sync'));
        return null;
      }
    },
    [token]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadJobs();
    const timer = setInterval(loadJobs, hasRunning ? LIST_POLL_RUNNING_MS : LIST_POLL_IDLE_MS);
    return () => clearInterval(timer);
  }, [loadJobs, hasRunning]);

  // An open run: fetch it when it is chosen, and keep fetching only while it runs
  const detailRunning = detail?.inProgress === true && detail?.id === selectedId;

  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    setDetailError('');
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedId || !detailRunning) return undefined;
    const timer = setInterval(async () => {
      const latest = await loadDetail(selectedId);
      if (latest && !latest.inProgress) {
        // Finished: reload the list and the totals once; the polling stops by itself
        loadJobs();
        loadStats();
      }
    }, DETAIL_POLL_MS);
    return () => clearInterval(timer);
  }, [selectedId, detailRunning, loadDetail, loadJobs, loadStats]);

  const refresh = useCallback(() => {
    loadJobs();
    loadStats();
  }, [loadJobs, loadStats]);

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const data = await syncJobApi.start(token);
      toast.success('Profile sync started');
      setPage(1);
      setSelectedId(data.syncId);
      loadJobs();
    } catch (failure) {
      if (failure?.response?.status === 409 && failure.response.data?.syncId) {
        toast.info('A sync is already running. Showing it.');
        setSelectedId(failure.response.data.syncId);
      } else {
        toast.error(messageOf(failure, 'Failed to start the profile sync'));
      }
    } finally {
      setStarting(false);
    }
  }, [token, loadJobs]);

  /** Resolves true when the run was cancelled */
  const cancel = useCallback(
    async (id) => {
      setCancelling(true);
      let ok = false;
      try {
        await syncJobApi.cancel(token, id);
        toast.info('Profile sync cancelled');
        ok = true;
      } catch (failure) {
        toast.error(messageOf(failure, 'Could not cancel the sync'));
      } finally {
        setCancelling(false);
        loadJobs();
        loadStats();
        if (id === selectedId) loadDetail(id);
      }
      return ok;
    },
    [token, selectedId, loadJobs, loadStats, loadDetail]
  );

  return {
    jobs,
    total,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    stats,
    hasRunning,
    starting,
    cancelling,
    selectedId,
    setSelectedId,
    detail: detail && detail.id === selectedId ? detail : null,
    detailError,
    refresh,
    start,
    cancel,
  };
}
