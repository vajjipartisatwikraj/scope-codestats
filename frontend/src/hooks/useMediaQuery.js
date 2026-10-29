import { useCallback, useSyncExternalStore } from "react";

/**
 * True while a CSS media query matches, e.g. useMediaQuery("(max-width: 899.95px)").
 *
 * Stands in for the Material UI hook of the same name in components that no longer use
 * Material UI. The first render already has the right answer, so there is no flash of the
 * wrong layout.
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = () => window.matchMedia(query).matches;

  // The server snapshot is only used if the app is ever rendered on a server.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
