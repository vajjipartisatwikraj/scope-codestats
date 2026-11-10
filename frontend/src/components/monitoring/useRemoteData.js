import { useCallback, useEffect, useRef, useState } from 'react';
import { isCancelled, monitoringErrorMessage } from '../../services/monitoringApi';

/**
 * Loads data for a key and keeps it fresh.
 *
 *   const { data, loading, error, updatedAt, reload } = useRemoteData((signal) => api(range, { signal }), range, { pollMs: 60000 });
 *
 * Changing `key` (a new range) drops the old data and loads again; an older request still in
 * flight is cancelled. With `pollMs` the data is fetched again in the background (no loading
 * state, and not while the tab is hidden), so the numbers move without the page flickering.
 * A failed background fetch keeps the data on screen and reports the error.
 *
 * @param {(signal: AbortSignal) => Promise<any>} fetcher
 * @param {string} key  what the data is for; a new key means new data
 * @param {{pollMs?: number}} options
 */
export default function useRemoteData(fetcher, key, { pollMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: '', loading: true, updatedAt: null });
  const fetcherRef = useRef(fetcher);
  const controllerRef = useRef(null);
  fetcherRef.current = fetcher;

  const run = useCallback(async ({ quiet = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (!quiet) setState((current) => ({ ...current, loading: true, error: '' }));

    try {
      const data = await fetcherRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setState({ data, error: '', loading: false, updatedAt: new Date() });
    } catch (error) {
      if (controller.signal.aborted || isCancelled(error)) return;
      setState((current) => ({ ...current, loading: false, error: monitoringErrorMessage(error) }));
    }
  }, []);

  useEffect(() => {
    setState({ data: null, error: '', loading: true, updatedAt: null });
    run();
    return () => controllerRef.current?.abort();
  }, [key, run]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) run({ quiet: true });
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, run]);

  const reload = useCallback(() => run(), [run]);

  return { ...state, reload };
}
