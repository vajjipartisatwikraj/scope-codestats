import { useCallback, useRef, useState } from 'react';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/**
 * The state of one draggable gutter between two panes (design/screens.md section 9).
 *
 *   axis      'x' for panes side by side (the gutter is vertical), 'y' for panes stacked
 *   initial   the share of the first pane, 0 to 1
 *   min, max  how far the gutter can go
 *
 * Returns
 *   ratio          the share of the first pane
 *   dragging       true while the gutter is held
 *   containerRef   put it on the element that holds both panes and the gutter (its size is the scale)
 *   gutterProps    spread onto the gutter: a separator that works with a pointer (drag), a keyboard
 *                  (arrow keys, Home, End) and assistive technology
 */
export default function useSplit({ axis = 'x', initial = 0.58, min = 0.3, max = 0.75, label = 'Resize panes' }) {
  const [ratio, setRatio] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  const move = useCallback(
    (event) => {
      const box = containerRef.current ? containerRef.current.getBoundingClientRect() : null;
      if (!box || box.width === 0 || box.height === 0) return;
      const position = axis === 'x' ? (event.clientX - box.left) / box.width : (event.clientY - box.top) / box.height;
      setRatio(clamp(position, min, max));
    },
    [axis, min, max]
  );

  const onPointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event) => {
    if (dragging) move(event);
  };

  const onPointerUp = (event) => {
    if (event.currentTarget.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const onKeyDown = (event) => {
    const less = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
    const more = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
    if (event.key === less) setRatio((current) => clamp(current - 0.03, min, max));
    else if (event.key === more) setRatio((current) => clamp(current + 0.03, min, max));
    else if (event.key === 'Home') setRatio(min);
    else if (event.key === 'End') setRatio(max);
    else return;
    event.preventDefault();
  };

  return {
    ratio,
    dragging,
    containerRef,
    gutterProps: {
      role: 'separator',
      tabIndex: 0,
      'aria-label': label,
      'aria-orientation': axis === 'x' ? 'vertical' : 'horizontal',
      'aria-valuemin': Math.round(min * 100),
      'aria-valuemax': Math.round(max * 100),
      'aria-valuenow': Math.round(ratio * 100),
      'data-dragging': dragging ? 'true' : 'false',
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
    },
  };
}
