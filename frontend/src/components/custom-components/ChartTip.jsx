import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './shared.css';
import './ChartTip.css';
import { clamp, colorVars, cx } from './chartUtils';

/**
 * ChartTip: the small white hover card every chart uses. It is drawn in a portal on <body>, so
 * no scrolling box or card edge can cut it off, and it never takes the pointer, so it cannot
 * flicker under it.
 *
 * It measures itself after it is drawn, then sits centred above the anchor, pushed back inside
 * the window when needed, and just below the top of the anchor when there is no room above.
 *
 * Props
 *   anchor        { x, top, bottom } in window (client) coordinates: the middle of the thing the
 *                 card points at, and the top and bottom of it
 *   children      the content. Use the building blocks below for the usual look.
 *   variant       'capsule' (one line, pill shaped; default) or 'list' (a title and rows)
 *   gap (8)       space between the card and the anchor, px
 *   colors        { tip, tipText, tipMuted }, any CSS colour
 *   className     added to the card
 *
 * Building blocks (all exported from this file)
 *   TipTitle      the muted caption (a name, a date)
 *   TipValue      the bold figure
 *   TipRow        { color, label, value }: a swatch, a name and a figure, for the 'list' variant
 *
 * CSS variables: --cc-tip --cc-tip-text --cc-tip-muted
 */

const TIP_VARS = {
  tip: '--cc-tip',
  tipText: '--cc-tip-text',
  tipMuted: '--cc-tip-muted',
};

const MARGIN = 8;

export function TipTitle({ children }) {
  return <span className="cc-tip__title">{children}</span>;
}

export function TipValue({ children }) {
  return <span className="cc-tip__value">{children}</span>;
}

export function TipRow({ color, label, value }) {
  return (
    <span className="cc-tip__row">
      <span className="cc-tip__swatch" style={color ? { backgroundColor: color } : undefined} />
      <span className="cc-tip__label">{label}</span>
      <span className="cc-tip__value">{value}</span>
    </span>
  );
}

export default function ChartTip({ anchor, children, variant = 'capsule', gap = 8, colors, className }) {
  const ref = useRef(null);
  const [place, setPlace] = useState({ left: 0, top: 0, ready: false });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !anchor) return;
    const { width, height } = node.getBoundingClientRect();
    const left = clamp(anchor.x - width / 2, MARGIN, Math.max(MARGIN, window.innerWidth - width - MARGIN));
    const above = anchor.top - height - gap;
    const top = above < MARGIN ? anchor.top + gap : above;
    setPlace((current) => (current.ready && current.left === left && current.top === top ? current : { left, top, ready: true }));
  }, [anchor, gap, children]);

  return createPortal(
    <div
      ref={ref}
      className={cx('cc-tip', className)}
      data-theme="daylight"
      data-variant={variant}
      data-ready={place.ready ? 'true' : 'false'}
      aria-hidden="true"
      style={{ left: place.left, top: place.top, ...colorVars(colors, TIP_VARS) }}
    >
      {children}
    </div>,
    document.body
  );
}
