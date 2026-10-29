import React from 'react';
import './shared.css';
import './ChartLegend.css';
import { cx } from './chartUtils';

/**
 * ChartLegend: a dot and a name for every series or slice of a chart, optionally with a figure.
 * It can also switch series on and off, and report which entry the pointer is on so the chart
 * can emphasise it. Used by TrendChart and PieChart, and fine on its own.
 *
 * Props
 *   items            [{ key, label, color, value, detail }]
 *                    `value` is a short figure shown after the name (text or node); `detail` is
 *                    a second, muted line under the name (text or node)
 *   layout ('row')   'row' (items side by side, wrapping) or 'column' (a list, figures aligned)
 *   hiddenKeys       Set or array of keys that are switched off (drawn crossed-out in tone)
 *   onToggle(key)    makes every entry a button that switches the series. Without it entries
 *                    are plain text.
 *   activeKey        the entry to emphasise (the others stay as they are)
 *   onActiveChange(key|null)  called when the pointer or the keyboard focus enters or leaves an entry
 *   label            the accessible name of the legend (for the toggle group)
 *   className, style passed to the root element
 *
 * CSS variables: --cl-text --cl-muted --cl-gap
 */
export default function ChartLegend({
  items = [],
  layout = 'row',
  hiddenKeys,
  onToggle,
  activeKey,
  onActiveChange,
  label = 'Chart legend',
  className,
  style,
}) {
  const hidden = hiddenKeys instanceof Set ? hiddenKeys : new Set(hiddenKeys || []);
  const interactive = typeof onToggle === 'function';
  const Entry = interactive ? 'button' : 'span';

  if (items.length === 0) return null;

  return (
    <ul
      className={cx('cc cl', className)}
      style={style}
      data-layout={layout}
      aria-label={label}
      onPointerLeave={onActiveChange ? () => onActiveChange(null) : undefined}
    >
      {items.map((item) => {
        const off = hidden.has(item.key);
        const hasFigure = item.value !== undefined && item.value !== null && item.value !== '';
        const hasDetail = item.detail !== undefined && item.detail !== null && item.detail !== '';
        return (
          <li key={item.key} className="cl__item">
            <Entry
              className="cl__entry"
              data-off={off ? 'true' : 'false'}
              data-active={activeKey === item.key ? 'true' : 'false'}
              onPointerEnter={onActiveChange ? () => onActiveChange(item.key) : undefined}
              onFocus={onActiveChange && interactive ? () => onActiveChange(item.key) : undefined}
              onBlur={onActiveChange && interactive ? () => onActiveChange(null) : undefined}
              {...(interactive
                ? { type: 'button', onClick: () => onToggle(item.key), 'aria-pressed': !off }
                : null)}
            >
              <span className="cl__swatch" style={item.color ? { backgroundColor: item.color } : undefined} />
              <span className="cl__text">
                <span className="cl__label">{item.label}</span>
                {hasDetail ? <span className="cl__detail">{item.detail}</span> : null}
              </span>
              {hasFigure ? <span className="cl__value">{item.value}</span> : null}
            </Entry>
          </li>
        );
      })}
    </ul>
  );
}
