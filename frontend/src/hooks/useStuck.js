import { useEffect, useRef, useState } from 'react';

/**
 * Tells whether a `position: sticky` element is currently stuck, so it can look different then (a
 * hairline under it, say). Put the returned ref on an empty marker element placed just before the
 * sticky one; the sticky element is stuck once the marker has scrolled out of view above it.
 *
 *   offset   px of the viewport that something else covers at the top (a fixed navbar), so the
 *            marker counts as gone as soon as it passes under it. Default 0.
 *
 * Returns [markerRef, stuck]. Without IntersectionObserver `stuck` stays false, which only means no
 * hairline.
 *
 *   const [marker, stuck] = useStuck(64);
 *   <div ref={marker} aria-hidden="true" style={{ height: 1, marginBottom: -1 }} />
 *   <header style={{ position: 'sticky', top: 0 }} data-stuck={stuck}>...</header>
 */
export default function useStuck(offset = 0) {
  const markerRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < offset),
      { rootMargin: `-${offset}px 0px 0px 0px` }
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [offset]);

  return [markerRef, stuck];
}
