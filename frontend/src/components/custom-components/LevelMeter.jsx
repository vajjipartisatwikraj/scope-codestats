import React from 'react';
import './shared.css';
import './LevelMeter.css';
import { clamp, cx, finiteOr } from './chartUtils';

/**
 * LevelMeter: a row of rounded bars that fill from the bottom as a level rises, like the input
 * meter of a recording screen. Each bar fills on its own, so the bar at the edge of the level is
 * part full and the meter moves smoothly rather than in steps. Only transform changes.
 *
 * Props
 *   level (0)     0..1, the current level. Update it as often as you like (every animation
 *                 frame is fine); the bars follow in about 100ms.
 *   bars (12)     how many bars
 *   height (32)   px, the height of the tallest bar. The bars rise in steps towards it.
 *   color         colour of the filled part; default 'var(--ds-accent)'
 *   label ('Input level')   the name of the meter
 *   valueText     the spoken value; default "<n> percent". Pass for example "Good level" to make
 *                 it say something more useful than a number.
 *   className, style   passed to the root element
 *
 * Accessibility: role="meter" with aria-valuenow (0 to 100), so the level is a number and not
 * only a colour.
 *
 * CSS variables: --lm-fill --lm-track
 */

export default function LevelMeter({
  level = 0,
  bars = 12,
  height = 32,
  color,
  label = 'Input level',
  valueText,
  className,
  style,
}) {
  const count = Math.max(2, Math.round(finiteOr(bars, 12)));
  const share = clamp(finiteOr(level, 0), 0, 1);
  const lit = share * count;
  const percent = Math.round(share * 100);

  const rootStyle = {
    '--lm-height': `${height}px`,
    ...(color ? { '--lm-fill': color } : null),
    ...style,
  };

  return (
    <div
      className={cx('cc lm', className)}
      style={rootStyle}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText || `${percent} percent`}
    >
      {Array.from({ length: count }, (_, index) => {
        const fill = clamp(lit - index, 0, 1);
        // The bars rise from 40% of the height on the left to the full height on the right
        const rise = 0.4 + (0.6 * index) / (count - 1);
        return (
          <span key={index} className="lm__bar" style={{ height: `${Math.round(rise * 1000) / 10}%` }} aria-hidden="true">
            <span className="lm__fill" style={{ transform: `translateY(${Math.round((1 - fill) * 1000) / 10}%)` }} />
          </span>
        );
      })}
    </div>
  );
}
