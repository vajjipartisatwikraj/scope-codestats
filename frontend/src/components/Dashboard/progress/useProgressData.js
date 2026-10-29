import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "../../../services/platformProgressApi";

const CACHE_TTL_MS = 60 * 1000;

const LOADING = { data: null, loading: true, error: null };

/**
 * Loads one answer for the Progress tab and remembers it for a minute, so switching between
 * platforms or ranges back and forth does not ask the server again.
 *
 * The answer is stored together with the key it belongs to, and only handed out while that
 * key is still the one asked for. Without this, the render right after the key changes
 * (before the effect below has started loading) would pass the PREVIOUS answer, for example
 * the overview's data, to the page of the newly selected platform.
 *
 * @param {Map} cache shared by the whole tab (create it once with useRef)
 * @param {string|null} key identifies the answer, for example "leetcode:90". null means this
 *   page needs nothing: no request is made and `loading` is false.
 * @param {(signal: AbortSignal) => Promise<any>} load fetches the answer
 * @returns {{data: any, loading: boolean, error: string|null, reload: () => void}}
 */
export default function useProgressData(cache, key, load) {
  const [state, setState] = useState({ key: null, ...LOADING });
  const [tick, setTick] = useState(0);

  // The newest `load` is used without restarting the effect when only its identity changes.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) return undefined; // nothing to load on this page
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setState({ key, data: hit.data, loading: false, error: null });
      return undefined;
    }

    const controller = new AbortController();
    setState({ key, ...LOADING });

    loadRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        cache.set(key, { at: Date.now(), data });
        setState({ key, data, loading: false, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ key, data: null, loading: false, error: apiErrorMessage(error, "Could not load this data") });
      });

    return () => controller.abort();
  }, [cache, key, tick]);

  const reload = useCallback(() => {
    cache.delete(key);
    setTick((value) => value + 1);
  }, [cache, key]);

  // Anything that belongs to another key is not this key's answer yet.
  if (key === null) return { data: null, loading: false, error: null, reload };
  const current = state.key === key ? state : LOADING;
  return { data: current.data, loading: current.loading, error: current.error, reload };
}
