import React from 'react';
import './shared.css';
import './AnimatedCheck.css';
import { cx } from './chartUtils';
import { toneColors } from './tone';

/**
 * AnimatedCheck: a disc with a check that draws itself once. The disc settles in, then the tick
 * is drawn stroke by stroke. Use it for the moment something is finished (a test submitted, a
 * clip saved). With reduced motion it is simply drawn.
 *
 * Props
 *   size (44)         px, the diameter of the disc
 *   tone ('success')  'success' | 'accent' | 'warning' | 'danger' | 'neutral' | 'inverse', or any
 *                     CSS colour. 'inverse' is a light disc with an accent tick, for use on an
 *                     accent card.
 *   delay (0)         ms to wait before it starts
 *   label ('Done')    the text equivalent (role="img"). Pass '' for a purely decorative check
 *                     that sits beside a sentence which already says it.
 *   className, style  passed to the root element
 *
 * CSS variables: --ac-bg --ac-tick
 */

export default function AnimatedCheck({ size = 44, tone = 'success', delay = 0, label = 'Done', className, style }) {
  const inverse = tone === 'inverse';
  const colors = toneColors(inverse ? 'accent' : tone, 'success');

  const rootStyle = {
    '--ac-size': `${size}px`,
    '--ac-bg': inverse ? 'var(--ds-on-accent)' : colors.soft,
    '--ac-tick': inverse ? 'var(--ds-accent)' : colors.fill,
    '--ac-delay': `${Math.max(0, delay)}ms`,
    ...style,
  };

  return (
    <span
      className={cx('cc ac', className)}
      style={rootStyle}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })}
    >
      <svg className="ac__svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className="ac__tick" d="M5.5 12.5l4.2 4.2L18.5 7.8" pathLength="1" />
      </svg>
    </span>
  );
}
