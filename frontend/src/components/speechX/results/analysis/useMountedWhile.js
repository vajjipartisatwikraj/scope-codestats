import { useEffect, useState } from "react";

/**
 * True while `active`, and for `delayMs` after it turns false. Use it to mount the content of a
 * panel only when it opens (so its charts play their entrance when the student sees them, not
 * while the panel is still closed) and to keep it mounted while the panel closes (so it does not
 * vanish before the closing motion has finished).
 */
const useMountedWhile = (active, delayMs = 260) => {
  const [mounted, setMounted] = useState(active);

  useEffect(() => {
    if (active) {
      setMounted(true);
      return undefined;
    }
    const timer = setTimeout(() => setMounted(false), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return active || mounted;
};

export default useMountedWhile;
