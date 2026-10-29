import React, { useId } from 'react';
import './shared.css';
import './ProgressBar.css';
import { clamp, colorVars, cx, finiteOr, formatNumber } from './chartUtils';
import { toneColors } from './tone';

/**
 * ProgressBar: a pill-shaped bar that shows a value out of a maximum, with an optional name above
 * it and a figure beside the name. It slides in once when it first appears; after that a change
 * of value glides. Use it for one measure (a score of a criterion, a share of a goal, a step
 * count). For a bar of several parts use SegmentedProgress.
 *
 * Props
 *   value (0), max (100)    the bar shows value / max, clamped to 0..100%
 *   label                   the name, printed above the bar and used as its accessible name
 *   hideLabel (false)       keep the label for assistive technology only (a bare bar in a row
 *                           that already has its own heading)
 *   valueLabel              the figure printed on the right of the label, text or a node.
 *                           Default: the value ("72"); pass null to print nothing.
 *   tone ('accent')         'accent' | 'success' | 'warning' | 'danger' | 'neutral', or any CSS colour
 *   size ('md')             'sm' (6px) | 'md' (10px)
 *   animate (true)          the slide-in on first appearance (never with reduced motion)
 *   colors                  { fill, track, text, label }, any CSS colour; `fill` wins over `tone`
 *   className, style        passed to the root element
 *
 * Accessibility: role="progressbar" with aria-valuenow, aria-valuemin and aria-valuemax. The
 * spoken value is the valueLabel when it is text, otherwise "<value> of <max>".
 *
 * CSS variables: --pb-fill --pb-track --pb-text --pb-label
 */

const COLOR_VARS = {
  fill: '--pb-fill',
  track: '--pb-track',
  text: '--pb-text',
  label: '--pb-label',
};

export default function ProgressBar({
  value = 0,
  max = 100,
  label,
  hideLabel = false,
  valueLabel,
  tone = 'accent',
  size = 'md',
  animate = true,
  colors,
  className,
  style,
}) {
  const labelId = useId();
  const top = Math.max(0, finiteOr(max, 100)) || 100;
  const current = clamp(finiteOr(value, 0), 0, top);
  const share = current / top;

  // The figure is printed only beside a label, unless the caller gives one
  const shownValue = valueLabel === undefined ? (label ? formatNumber(current) : null) : valueLabel;
  const hasValue = shownValue !== null && shownValue !== undefined;
  const spoken =
    hasValue && (typeof shownValue === 'string' || typeof shownValue === 'number')
      ? String(shownValue)
      : `${formatNumber(current)} of ${formatNumber(top)}`;
  const hasHead = Boolean(label) || hasValue;

  const rootStyle = {
    '--pb-fill': toneColors(tone).fill,
    '--pb-offset': `${Math.round((share - 1) * 10000) / 100}%`,
    ...colorVars(colors, COLOR_VARS),
    ...style,
  };

  return (
    <div
      className={cx('cc pb', className)}
      style={rootStyle}
      data-size={size}
      data-animate={animate ? 'true' : 'false'}
    >
      {hasHead ? (
        <div className={cx('pb__head', hideLabel && 'cc-sr-only')}>
          {label ? (
            <span className="pb__label" id={labelId}>
              {label}
            </span>
          ) : (
            <span />
          )}
          {hasValue ? <span className="pb__value">{shownValue}</span> : null}
        </div>
      ) : null}
      <div
        className="pb__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={top}
        aria-valuenow={current}
        aria-valuetext={spoken}
        {...(label ? { 'aria-labelledby': labelId } : null)}
      >
        <div className="pb__fill" />
      </div>
    </div>
  );
}
