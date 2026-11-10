import { useCallback, useEffect, useRef, useState } from 'react';
import { isCancelled, monitoringApi, monitoringErrorMessage } from '../../services/monitoringApi';

const PAGE_SIZE = 15;

/**
 * The errors and slow requests the server kept one by one, newest first, 15 at a time.
 *
 *   const { events, loading, loadingMore, hasMore, error, loadMore, reload } = useProblemEvents(minStatus);
 *
 * `minStatus` (0 for everything) keeps only events with that status or above. Changing it starts
 * the list again. `reload` starts it again from the newest.
 */
export default function useProblemEvents(minStatus) {
  const [state, setState] = useState({ events: [], next: null, loading: true, loadingMore: false, error: '' });
  const controllerRef = useRef(null);

  const fetchPage = useCallback(
    async (before) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const more = Boolean(before);
      setState((current) => ({ ...current, loading: !more, loadingMore: more, error: '' }));

      try {
        const page = await monitoringApi.events(
          { limit: PAGE_SIZE, before, minStatus: minStatus || undefined },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setState((current) => ({
          events: more ? [...current.events, ...page.events] : page.events,
          next: page.nextBefore,
          loading: false,
          loadingMore: false,
          error: '',
        }));
      } catch (error) {
        if (controller.signal.aborted || isCancelled(error)) return;
        setState((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          error: monitoringErrorMessage(error, 'Could not load the errors'),
        }));
      }
    },
    [minStatus]
  );

  useEffect(() => {
    fetchPage(null);
    return () => controllerRef.current?.abort();
  }, [fetchPage]);

  return {
    events: state.events,
    loading: state.loading,
    loadingMore: state.loadingMore,
    hasMore: Boolean(state.next),
    error: state.error,
    loadMore: () => state.next && fetchPage(state.next),
    reload: () => fetchPage(null),
  };
}
