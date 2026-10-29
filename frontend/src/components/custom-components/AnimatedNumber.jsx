import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './shared.css';
import './AnimatedNumber.css';
import { cx, finiteOr } from './chartUtils';
import { useReducedMotion } from './tone';

/**
 * AnimatedNumber: a figure that counts up to its value the first time it becomes visible, and
 * glides from the old value to the new one when `value` changes later. With reduced motion it
 * shows the final value at once. Numerals are tabular, and the box is as wide as the final text,
 * so nothing around it shifts while it counts.
 *
 * Props
 *   value (0)         the number to show
 *   duration (900)    ms of the first count-up; a later change takes 400ms at most
 *   delay (0)         ms to wait after it becomes visible
 *   decimals (0)      digits after the decimal point, used by the default format
 *   format(n)         turns a number into text; default Indian digit grouping ("1,23,456") with
 *                     `decimals` digits
 *   prefix, suffix    text around the figure ("%", " pts"). They are part of the spoken value.
 *   className, style  passed to the root <span>, which takes the font from its parent
 *
 * Accessibility: the moving digits are hidden from assistive technology; it reads the final value.
 *
 * Also exported from this file: useEntered(options)
 *   const [ref, entered] = useEntered({ threshold: 0.2, once: true });
 *   `entered` turns true when the element on `ref` is first on screen. Use it to start your own
 *   entrance. Without IntersectionObserver it is true at once.
 */

/** True once the element on the returned ref has come into view (and stays true if `once`). */
export function useEntered({ threshold = 0.2, once = true } = {}) {
  const ref = useRef(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setEntered(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          setEntered(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setEntered(false);
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once]);

  return [ref, entered];
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

export default function AnimatedNumber({
  value = 0,
  duration = 900,
  delay = 0,
  decimals = 0,
  format,
  prefix = '',
  suffix = '',
  className,
  style,
}) {
  const target = finiteOr(value, 0);
  const reduced = useReducedMotion();
  const [ref, entered] = useEntered();
  const textRef = useRef(null);
  const shownRef = useRef(0); // the number on screen now, so a change continues from it
  const startedRef = useRef(false);

  const formatter = useMemo(() => {
    if (typeof format === 'function') return format;
    const digits = Math.max(0, Math.min(10, Math.round(finiteOr(decimals, 0))));
    const intl = new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return (n) => intl.format(n);
  }, [format, decimals]);

  const compose = (n) => `${prefix}${formatter(n)}${suffix}`;
  const finalText = compose(target);

  // A layout effect, so the first figure is in place before the first paint
  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node) return undefined;

    if (reduced) {
      shownRef.current = target;
      node.textContent = compose(target);
      return undefined;
    }
    if (!entered) {
      // Before it is visible: the starting figure
      node.textContent = compose(shownRef.current);
      return undefined;
    }

    const first = !startedRef.current;
    startedRef.current = true;
    const from = shownRef.current;
    const span = first ? duration : Math.min(400, duration);
    let frame = 0;
    let begun = null;

    const step = (now) => {
      if (begun === null) begun = now;
      const progress = span <= 0 ? 1 : Math.min(1, (now - begun) / span);
      const current = from + (target - from) * easeOutCubic(progress);
      shownRef.current = current;
      node.textContent = compose(progress >= 1 ? target : current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, first ? Math.max(0, delay) : 0);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // compose depends on formatter, prefix and suffix, which are part of the dependencies below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, entered, reduced, duration, delay, formatter, prefix, suffix]);

  return (
    <span ref={ref} className={cx('an', className)} style={style}>
      {/* Reserves the width of the final text and is what assistive technology reads */}
      <span className="an__final">{finalText}</span>
      {/* Filled by the effect above, a frame at a time, without rendering */}
      <span ref={textRef} className="an__live" aria-hidden="true" />
    </span>
  );
}
