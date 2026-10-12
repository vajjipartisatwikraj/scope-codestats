import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * False on the first paint and true shortly after, so a CSS transition has a
 * "before" state to start from. Use it to grow a bar or draw a ring when a
 * component appears. With reduced motion it is true straight away, so things
 * simply appear.
 *
 * @param {number} delayMs wait before flipping to true
 */
const useEntered = (delayMs = 0) => {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(Boolean(reduceMotion));

  useEffect(() => {
    if (reduceMotion) {
      setEntered(true);
      return undefined;
    }
    // At least one frame, so the starting state is painted first.
    const timer = setTimeout(() => setEntered(true), Math.max(delayMs, 30));
    return () => clearTimeout(timer);
  }, [delayMs, reduceMotion]);

  return entered;
};

export default useEntered;
