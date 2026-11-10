import { useCallback, useEffect, useState } from 'react';

/**
 * Loads one answer and keeps the previous one on screen while a newer one loads. A slow answer
 * that was replaced by a newer request is ignored (the request is aborted).
 *
 *   const { data, loading, error, reload } = useRemote((signal) => api({ signal }), [key], enabled);
 *
 * `deps` are what the answer depends on: a change loads again. `enabled` false loads nothing (a
 * view that is not open). `messageOf(error)` turns a failure into a sentence.
 */
export default function useRemote(load, deps, enabled = true, messageOf = (error) => error?.message || 'Could not load') {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.code === 'ERR_CANCELED') return;
        setState((previous) => ({ ...previous, loading: false, error: messageOf(error) }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, reload };
}
