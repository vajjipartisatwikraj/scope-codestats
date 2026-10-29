import React, { useRef, useState } from 'react';
import { ChartTip, TipValue } from '../custom-components';

/**
 * A short hint on hover and on keyboard focus, in the same small white card the charts use. It
 * wraps whatever should explain itself; the control inside keeps its own accessible name, because
 * the card is for sighted pointer and keyboard users (it is hidden from assistive technology).
 *
 *   text      the hint
 *   children  what the hint belongs to
 */
export default function Hint({ text, children, className }) {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const show = () => {
    const box = ref.current ? ref.current.getBoundingClientRect() : null;
    if (box) setAnchor({ x: box.left + box.width / 2, top: box.top, bottom: box.bottom });
  };
  const hide = () => setAnchor(null);

  return (
    <span
      ref={ref}
      className={className ? `lb-hint ${className}` : 'lb-hint'}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {anchor && text ? (
        <ChartTip anchor={anchor}>
          <TipValue>{text}</TipValue>
        </ChartTip>
      ) : null}
    </span>
  );
}
