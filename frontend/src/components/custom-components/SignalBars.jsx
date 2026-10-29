import React from 'react';
import './shared.css';
import './SignalBars.css';
import { clamp, cx, finiteOr } from './chartUtils';
import { toneColors } from './tone';

/**
 * SignalBars: connection quality as four bars that grow in height, like the signal icon of a
 * phone. Lit bars are solid; the others are drawn as outlines, so the count can be read without
 * colour. It never carries meaning by colour alone: the name and the number of lit bars are
 * always in the accessible text, and `showLabel` prints the name next to the bars.
 *
 * Props
 *   level (0)     0..4, how many bars are lit (rounded; anything else is clamped)
 *   size (18)     px, the height of the tallest bar
 *   tone          'good' | 'warning' | 'danger' | 'muted', or any CSS colour.
 *                 Default: from the level (4 and 3 'good', 2 'warning', 1 and 0 'danger')
 *   label ('Connection')   the name; spoken as "<label>: <n> of 4 bars"
 *   statusText    an extra word, for example "Good" or "Offline". Spoken, and printed with showLabel.
 *   showLabel (false)   print "<label>: <statusText>" (or the label and the bars) beside the bars
 *   className, style    passed to the root element
 *
 * CSS variables: --sb-fill --sb-off
 */

const BARS = 4;

const defaultTone = (level) => (level >= 3 ? 'good' : level === 2 ? 'warning' : 'danger');

export default function SignalBars({
  level = 0,
  size = 18,
  tone,
  label = 'Connection',
  statusText,
  showLabel = false,
  className,
  style,
}) {
  const lit = clamp(Math.round(finiteOr(level, 0)), 0, BARS);
  const colors = toneColors(tone || defaultTone(lit), 'muted');
  const spoken = `${label}: ${lit} of ${BARS} bars${statusText ? `, ${statusText}` : ''}`;

  const rootStyle = {
    '--sb-size': `${size}px`,
    '--sb-fill': colors.fill,
    ...style,
  };

  return (
    <span className={cx('cc sb', className)} style={rootStyle} data-level={lit}>
      <span className="sb__bars" role="img" aria-label={spoken} title={spoken}>
        {Array.from({ length: BARS }, (_, index) => (
          <span key={index} className="sb__bar" data-lit={index < lit ? 'true' : 'false'} style={{ '--k': index }} />
        ))}
      </span>
      {showLabel ? (
        <span className="sb__text" aria-hidden="true">
          {statusText ? `${label}: ${statusText}` : `${label}: ${lit} of ${BARS}`}
        </span>
      ) : null}
    </span>
  );
}
