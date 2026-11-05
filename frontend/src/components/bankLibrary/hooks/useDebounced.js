import { useEffect, useState } from 'react';

/** The value after it has stopped changing for `delay` ms, so a search waits for the typing to pause */
export default function useDebounced(value, delay = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
