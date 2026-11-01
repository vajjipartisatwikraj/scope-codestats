import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import './shared.css';
import './ScrollRow.css';
import { cx } from './chartUtils';

/**
 * ScrollRow: a row of items that scrolls sideways instead of wrapping into rows, with scroll
 * snapping and, on a computer, previous and next buttons that appear only while there is more to
 * see in that direction. Use it for a short list of cards where the next one should peek in from
 * the edge (cohorts, courses, recommendations). On a touch screen the row is swiped and the
 * buttons stay out of the way.
 *
 * Every direct child is one item and gets the same width and height (the tallest one). The row is
 * a list: pass each item as an <li>.
 *
 * Props
 *   children            the items, each an <li>
 *   label               the accessible name of the list (also names the buttons)
 *   itemWidth           CSS width of an item (default 'clamp(280px, 30%, 360px)'): wide enough to
 *                       read, narrow enough that the next item peeks in
 *   gap (16)            px between items
 *   previousLabel, nextLabel   the button names; default "Scroll <label> left" and "... right"
 *   className, style    passed to the root element
 *
 * Keyboard: items are reached with Tab and the row scrolls to keep the focused one in view; the
 * buttons are ordinary buttons. The row honours reduced motion (no smooth scrolling).
 *
 * CSS variables: --sr-item (item width) --sr-gap --sr-button-bg --sr-button-text
 */
export default function ScrollRow({ children, label, itemWidth, gap = 16, previousLabel, nextLabel, className, style }) {
  const trackRef = useRef(null);
  const [edge, setEdge] = useState({ start: false, end: false });
  const count = React.Children.count(children);

  // Whether there is more to see on either side
  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdge((current) => {
      const next = { start: track.scrollLeft > 1, end: track.scrollLeft < max - 1 };
      return current.start === next.start && current.end === next.end ? current : next;
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    update();
    track.addEventListener('scroll', update, { passive: true });
    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(track);
    }
    return () => {
      track.removeEventListener('scroll', update);
      if (observer) observer.disconnect();
    };
  }, [update, count]);

  const move = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Nearly a full page, so the item at the edge stays in view as the reference point
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: reduced ? 'auto' : 'smooth' });
  };

  const rootStyle = {
    '--sr-gap': `${gap}px`,
    ...(itemWidth ? { '--sr-item': itemWidth } : null),
    ...style,
  };

  return (
    <div className={cx('cc srow', className)} style={rootStyle}>
      <ul ref={trackRef} className="srow__track" aria-label={label}>
        {children}
      </ul>
      <button
        type="button"
        className="srow__button"
        data-side="start"
        data-visible={edge.start ? 'true' : 'false'}
        aria-label={previousLabel || `Scroll ${label || 'the list'} left`}
        tabIndex={edge.start ? 0 : -1}
        onClick={() => move(-1)}
      >
        <CaretLeftIcon size={20} weight="bold" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="srow__button"
        data-side="end"
        data-visible={edge.end ? 'true' : 'false'}
        aria-label={nextLabel || `Scroll ${label || 'the list'} right`}
        tabIndex={edge.end ? 0 : -1}
        onClick={() => move(1)}
      >
        <CaretRightIcon size={20} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
