import { useEffect, useState } from "react";

/**
 * `flag`, but only once it has been true for `delayMs` without a break. It turns off at once.
 * Used for notices about slow work (a save that takes long), so that quick saves never flash a
 * message and push the page around.
 */
const useDelayedFlag = (flag, delayMs = 1500) => {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!flag) {
      setOn(false);
      return undefined;
    }
    const timer = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(timer);
  }, [flag, delayMs]);

  return on;
};

export default useDelayedFlag;
