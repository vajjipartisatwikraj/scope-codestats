import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * A number that counts up from zero to `value` when it appears. Shows the final
 * value immediately for people who prefer reduced motion.
 */
const AnimatedNumber = ({ value, decimals = 0, delayMs = 0, durationMs = 900, suffix = "" }) => {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return undefined;
    }

    let frame = 0;
    let startedAt = null;
    const step = (now) => {
      if (startedAt === null) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setShown(value * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, delayMs, durationMs, reduceMotion]);

  return (
    <>
      {shown.toFixed(decimals)}
      {suffix}
    </>
  );
};

export default AnimatedNumber;
