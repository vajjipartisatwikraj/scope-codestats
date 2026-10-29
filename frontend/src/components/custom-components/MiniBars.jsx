import React from 'react';
import './shared.css';
import './MiniBars.css';
import { clamp, colorVars, cx, describeValues, finiteOr, formatNumber, resolveHighlight } from './chartUtils';

/**
 * MiniBars: a compact strip of vertical bars that fits beside a number. It shows the shape of a
 * short series (a week of daily gains, a month of activity), not exact values, so it has no
 * axis, no labels and no pills. Hover text carries the exact figure for each bar.
 *
 * Data
 *   data              numbers, or objects read through the accessors below
 *   getValue(item, i)     number     default: the item itself when it is a number, else item.value
 *   getKey(item, i)       unique key default item.key, else the index
 *   getLabel(item, i)     text used in the hover text and the text equivalent   default item.label
 *   getTooltip(item, i)   full hover text                                        default "label: value"
 *   formatValue(value)    default: Indian digit grouping, at most 2 decimals
 *
 * Scale
 *   min, max          values at the bottom and top. Default: the smallest value (or 0) and the
 *                     biggest value (or 0), so negative values hang below a zero line.
 *
 * Look
 *   height (56)       strip height in px, or 'fill' to take the height the parent leaves (the
 *                     parent must be a flex column with a height of its own)
 *   gap (4)           space between bars in px
 *   barWidth          fixed bar width in px; otherwise the bars share the width equally
 *   align ('bottom')  'bottom': bars stand on a baseline, as in a bar chart. 'center': every bar is
 *                     centred on the middle of the strip and grows both ways, like a sound wave.
 *                     In 'center' the sign of a value is ignored (the length shows its size), and
 *                     the biggest value (or `max`) fills `maxShare` of the height.
 *   maxShare (1)      only for align 'center': the share of the height the biggest bar takes
 *   radius ('full')   bar corner radius: a CSS length, or 'full' for capsules
 *   minBarHeight (4)  a bar with no height still shows as a stub this tall (px)
 *   highlight ('last') which bar(s) use the highlight colour:
 *                     'max' | 'min' | 'first' | 'last' | 'none' | index | key | fn | array of those
 *   animate (true)    bars grow in once on mount (not when reduced motion is requested)
 *   colors            { bar, barHighlight, negative, empty }, any CSS colour
 *
 * Accessibility
 *   title, summary    the text equivalent. Without `summary` the values are listed.
 *   className, style  passed to the root element
 *
 * CSS variables: --mb-bar --mb-bar-highlight --mb-negative --mb-empty
 */

const COLOR_VARS = {
  bar: '--mb-bar',
  barHighlight: '--mb-bar-highlight',
  negative: '--mb-negative',
  empty: '--mb-empty',
};

const isObject = (item) => item !== null && typeof item === 'object';
const defaultValue = (item) => (isObject(item) ? item.value : item);
const defaultKey = (item, index) => (isObject(item) && item.key !== undefined ? item.key : index);
const defaultLabel = (item) => (isObject(item) ? item.label : undefined);

export default function MiniBars({
  data = [],
  getValue = defaultValue,
  getKey = defaultKey,
  getLabel = defaultLabel,
  getTooltip,
  formatValue = formatNumber,
  min,
  max,
  height = 56,
  gap = 4,
  barWidth,
  align = 'bottom',
  maxShare = 1,
  radius = 'full',
  minBarHeight = 4,
  highlight = 'last',
  animate = true,
  colors,
  title,
  summary,
  className,
  style,
}) {
  const items = Array.isArray(data) ? data : [];
  const values = items.map((item, index) => finiteOr(getValue(item, index), 0));
  const keys = items.map((item, index) => getKey(item, index));
  const labels = items.map((item, index) => getLabel(item, index));

  const lowest = min !== undefined ? min : Math.min(0, ...values);
  const highest = max !== undefined ? max : Math.max(0, ...values);
  const span = highest - lowest || 1;
  const shareOf = (value) => clamp((value - lowest) / span, 0, 1);
  // Where the zero line sits, as a share of the height from the bottom
  const baseShare = shareOf(clamp(0, lowest, highest));
  const isHighlighted = resolveHighlight(highlight, { items, values, keys });
  const centered = align === 'center';
  const peak = (max !== undefined ? Math.abs(max) : Math.max(...values.map(Math.abs), 0)) || 1;
  const centerShare = (value) => clamp(Math.abs(value) / peak, 0, 1) * clamp(maxShare, 0, 1);

  const rootStyle = {
    '--mb-height': height === 'fill' ? 'auto' : `${height}px`,
    '--mb-gap': `${gap}px`,
    '--mb-min': `${minBarHeight}px`,
    '--mb-radius': radius === 'full' ? '999px' : radius,
    '--n': items.length || 1,
    ...(barWidth ? { '--mb-bar-width': `${barWidth}px` } : null),
    ...colorVars(colors, COLOR_VARS),
    ...style,
  };

  const description = [title, summary !== undefined ? summary : describeValues(labels, values, formatValue)]
    .filter(Boolean)
    .join('. ');

  return (
    <div
      className={cx('cc mb', className)}
      style={rootStyle}
      role="img"
      aria-label={description || undefined}
      data-animate={animate ? 'true' : 'false'}
      data-fixed={barWidth ? 'true' : 'false'}
      data-align={centered ? 'center' : 'bottom'}
      data-fill={height === 'fill' ? 'true' : 'false'}
    >
      {items.map((item, index) => {
        const value = values[index];
        const valueShare = shareOf(value);
        const length = centered ? centerShare(value) : Math.abs(valueShare - baseShare);
        const bottom = centered ? (1 - length) / 2 : Math.min(baseShare, valueShare);
        const label = labels[index];
        const isText = typeof label === 'string' || typeof label === 'number';
        const tooltip = getTooltip
          ? getTooltip(item, index)
          : isText && label !== ''
            ? `${label}: ${formatValue(value)}`
            : formatValue(value);

        return (
          <span className="mb__item" key={keys[index]} style={{ '--i': index }} title={tooltip}>
            <span
              className="mb__bar"
              style={{ bottom: `${bottom * 100}%`, height: `${length * 100}%` }}
              data-highlight={isHighlighted(index) ? 'true' : 'false'}
              data-negative={value < 0 ? 'true' : 'false'}
              data-empty={length === 0 ? 'true' : 'false'}
            />
          </span>
        );
      })}
    </div>
  );
}
