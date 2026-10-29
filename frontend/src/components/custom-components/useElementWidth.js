import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The width and height in px of the element the returned ref is attached to, kept up to date as
 * the element is resized. Both are 0 until the element has been measured.
 *
 * Charts that draw in real pixels (LineChart) use it so their lines and dots keep their true
 * proportions at any size instead of being stretched by a scaled viewBox, and so they can fill a
 * box whose height is decided by the layout around them.
 *
 * @returns {[React.RefObject<HTMLElement>, {width: number, height: number}]}
 */
export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const measure = () => {
      const box = node.getBoundingClientRect();
      const next = { width: Math.round(box.width), height: Math.round(box.height) };
      setSize((current) => (current.width === next.width && current.height === next.height ? current : next));
    };
    measure();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

/** Only the width of useElementSize: `[ref, width]`. */
export default function useElementWidth() {
  const [ref, size] = useElementSize();
  return [ref, size.width];
}
