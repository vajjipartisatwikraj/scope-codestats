import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * A number that counts up to `end` the first time it scrolls into view (at once for people who
 * asked for less motion).
 *
 *   end, duration, prefix, suffix, className
 *   locale   how the number is grouped, e.g. "en-IN" shows 1,00,000 (default: the visitor's own)
 */
const CountUp = ({ end, duration = 2200, suffix = '', prefix = '', className = '', locale }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(end);
      return;
    }
    const ease = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(end * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString(locale)}
      {suffix}
    </span>
  );
};

export default CountUp;
