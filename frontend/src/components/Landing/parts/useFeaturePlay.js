import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * Helpers for the small animated pictures of the feature tiles (AnimatedPictures.jsx).
 *
 * A picture plays when it is mostly on screen and starts again each time it comes back. Its markup always
 * carries the finished picture; while it is not playing, CSS holds it in its starting state
 * (data-play="false"), and data-play="true" runs it to the finished picture. People who asked for less
 * motion get data-play="true" at once, with the animations switched off, so they see the finished picture.
 */

/** [ref, play, reduced]: put `ref` on the picture's root and `play` on its data-play */
export function usePlay(margin = '0px 0px -22% 0px') {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { margin });
  return [ref, inView || Boolean(reduced), Boolean(reduced)];
}

/**
 * A whole number that runs from `from` to `to` (slowing down as it arrives) once `play` is true, and goes
 * back to `from` when it is not. With reduced motion it is `to` all the time.
 */
export function useCount({ from, to, play, reduced, duration = 1800, delay = 0 }) {
  const [value, setValue] = useState(reduced ? to : from);

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return undefined;
    }
    if (!play) {
      setValue(from);
      return undefined;
    }
    let raf = 0;
    let started = 0;
    const timer = window.setTimeout(() => {
      const tick = (now) => {
        if (!started) started = now;
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(from + (to - from) * eased));
        if (progress < 1) raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
    };
  }, [play, reduced, from, to, duration, delay]);

  return value;
}

/**
 * `text` typed out one character at a time once `play` is true (after `delay` ms), empty when it is not.
 * With reduced motion it is the whole text. Returns { shown, done }.
 */
export function useTyped({ text, play, reduced, delay = 0, perChar = 40 }) {
  const [count, setCount] = useState(reduced ? text.length : 0);

  useEffect(() => {
    if (reduced) {
      setCount(text.length);
      return undefined;
    }
    if (!play) {
      setCount(0);
      return undefined;
    }
    let interval = 0;
    const timer = window.setTimeout(() => {
      let n = 0;
      interval = window.setInterval(() => {
        n += 1;
        setCount(n);
        if (n >= text.length) window.clearInterval(interval);
      }, perChar);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [play, reduced, text, delay, perChar]);

  return { shown: text.slice(0, count), done: count >= text.length };
}
