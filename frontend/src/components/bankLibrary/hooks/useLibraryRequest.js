import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads something from the bank library and keeps it: `load` is called when the component mounts and
 * whenever `deps` change (and by `reload`). An older answer that arrives after a newer request was
 * made is thrown away, so quick typing never shows stale results.
 *
 *   load()    returns a promise of the data
 *   deps      what the load depends on (like useEffect)
 *   skip      true to not load yet
 *
 * Returns { data, loading, error, reload, setData }. `error` is the failure itself (null when fine).
 */
export default function useLibraryRequest(load, deps, { skip = false } = {}) {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });
  const latest = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    const ticket = latest.current + 1;
    latest.current = ticket;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await loadRef.current();
      if (latest.current === ticket) setState({ data, loading: false, error: null });
    } catch (error) {
      if (latest.current === ticket) setState((previous) => ({ ...previous, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    if (skip) return undefined;
    run();
    return () => {
      latest.current += 1; // leaving: ignore what is still on its way
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, run, ...deps]);

  const setData = useCallback((data) => setState((previous) => ({ ...previous, data })), []);

  return { ...state, reload: run, setData };
}
