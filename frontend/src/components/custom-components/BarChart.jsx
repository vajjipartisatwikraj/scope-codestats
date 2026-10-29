import React, { useEffect, useState } from 'react';
import './shared.css';
import './BarChart.css';
import ChartTip, { TipTitle, TipValue } from './ChartTip';
import { useElementSize } from './useElementWidth';
import {
  clamp,
  colorVars,
  cx,
  describeValues,
  finiteOr,
  formatNumber,
  numberOrNull,
  resolveHighlight,
} from './chartUtils';

/**
 * BarChart: rounded vertical bars with an optional value pill, labels and a reference line.
 *
 * A generic component. It knows nothing about the page that uses it: the data and the way to
 * read it come in through props, and every colour can be replaced.
 *
 * Data
 *   data              array of anything
 *   getKey(item, i)       unique key          default item.key, else the index
 *   getLabel(item, i)     text under the bar  default item.label
 *   getValue(item, i)     number              default item.value
 *   getSublabel(item, i)  optional second line under the label (text or node)
 *   getValueLabel(item, i) what the value pill shows            default formatValue(value)
 *   getTooltip(item, i)   screen reader name of a bar         default "label: value"
 *   getColor(item, i)     a CSS colour for one bar's fill, or nothing to keep the default
 *   formatValue(value)    default: Indian digit grouping, at most 2 decimals
 *
 * Scale
 *   min (0)           value at the bottom of the plot
 *   max               value at the top; default the biggest value (or the reference line)
 *
 * Look
 *   height (240)      plot height in px, or 'fill' to take the height the parent leaves (the
 *                     chart then needs a parent that is a flex column with a height of its own)
 *   gap (12)          space between bars in px
 *   radius            bar corner radius: a CSS length, or 'full' for capsules   default 24px token
 *   barWidth          fixed bar width in px; otherwise bars fill their column up to barMaxWidth (84)
 *   minColumnWidth (52) below this width per bar the chart scrolls sideways instead of squeezing
 *   highlight ('max') which bar(s) use the highlight colours:
 *                     'max' | 'min' | 'first' | 'last' | 'none' | index | key | fn | array of those
 *   showValues (true), valuePlacement ('auto' | 'inside' | 'above'), valueShape ('pill' | 'text')
 *                     'auto' puts the value inside the bar and moves it above a bar too short for it
 *   showLabels (true), sublabelPlacement ('below' | 'inline': beside the label, wrapping below it
 *                     when the column is too narrow; saves a line of height)
 *   animate (true)    once on mount the bars rise from the baseline in a soft wave, then the
 *                     values, the names and the reference line follow (not when reduced motion
 *                     is requested)
 *   colors            { bar, barHighlight, barHighlightText, value, valueText, valueHighlight,
 *                       valueHighlightText, label, sublabel }, any CSS colour
 *
 * Reference line (a goal, an average, a target)
 *   referenceLine     { value, label, color, tagColor, tagTextColor, gutter }
 *                     `gutter` reserves that many px at the right for the tag so it never covers a bar
 *
 * Interaction and accessibility
 *   onItemClick(item, i)  makes every bar a button
 *   title, summary        the text equivalent. Without onItemClick, a hidden table lists every value.
 *   emptyMessage          shown when there is no data
 *   className, style      passed to the root element
 *
 * CSS variables (set them on the chart or a parent instead of using `colors`):
 *   --bc-bar --bc-bar-highlight --bc-bar-highlight-text --bc-value --bc-value-text
 *   --bc-value-highlight --bc-value-highlight-text --bc-label --bc-sublabel --bc-ref
 *   --bc-ref-tag --bc-ref-tag-text
 *
 * The hover capsule
 *   Pointing at a bar (or focusing it, when bars are buttons) opens a small white capsule
 *   above the bar with the label and the value (ChartTip.jsx). Escape, scrolling and resizing
 *   close it. Its colours: `colors.tip`, `colors.tipText` and `colors.tipMuted`.
 */

const COLOR_VARS = {
  bar: '--bc-bar',
  barHighlight: '--bc-bar-highlight',
  barHighlightText: '--bc-bar-highlight-text',
  value: '--bc-value',
  valueText: '--bc-value-text',
  valueHighlight: '--bc-value-highlight',
  valueHighlightText: '--bc-value-highlight-text',
  label: '--bc-label',
  sublabel: '--bc-sublabel',
};

const REFERENCE_VARS = {
  color: '--bc-ref',
  tagColor: '--bc-ref-tag',
  tagTextColor: '--bc-ref-tag-text',
};

// A bar needs this much height to hold its value pill inside (pill 30px + 8px above and below)
const INSIDE_MIN_PX = 52;

const defaultKey = (item, index) => (item && item.key !== undefined ? item.key : index);
const defaultLabel = (item) => (item ? item.label : undefined);
const defaultValue = (item) => (item ? item.value : undefined);

export default function BarChart({
  data = [],
  getKey = defaultKey,
  getLabel = defaultLabel,
  getValue = defaultValue,
  getSublabel,
  getValueLabel,
  getTooltip,
  getColor,
  formatValue = formatNumber,
  min = 0,
  max,
  height = 240,
  gap = 12,
  radius = 'var(--ds-radius-xl)',
  barWidth,
  barMaxWidth = 84,
  minColumnWidth = 52,
  highlight = 'max',
  showValues = true,
  valuePlacement = 'auto',
  valueShape = 'pill',
  showLabels = true,
  sublabelPlacement = 'below',
  referenceLine,
  colors,
  onItemClick,
  title,
  summary,
  emptyMessage = 'Nothing to show yet',
  animate = true,
  className,
  style,
}) {
  const items = Array.isArray(data) ? data : [];
  const interactive = typeof onItemClick === 'function';
  const fill = height === 'fill';
  // In fill mode the plot takes the height its parent leaves, so it has to be measured
  const [plotRef, plotSize] = useElementSize();

  // The bar the hover card is open for: { index, x, top, bottom } (screen coordinates), or null
  const [tip, setTip] = useState(null);
  const showTip = (event, index) => {
    const bar = event.currentTarget.querySelector('.bc__bar') || event.currentTarget;
    const box = bar.getBoundingClientRect();
    setTip({ index, x: box.left + box.width / 2, top: box.top, bottom: box.bottom });
  };
  const hideTip = () => setTip(null);

  // Anything that moves the page or the chart makes the card's position wrong, so it closes
  useEffect(() => {
    if (!tip) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setTip(null);
    };
    window.addEventListener('scroll', hideTip, true);
    window.addEventListener('resize', hideTip);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', hideTip, true);
      window.removeEventListener('resize', hideTip);
      window.removeEventListener('keydown', onKey);
    };
  }, [tip]);

  if (items.length === 0) {
    return (
      <figure className={cx('cc bc bc--empty', className)} style={style} aria-label={title}>
        <p className="bc__empty">{emptyMessage}</p>
      </figure>
    );
  }

  const values = items.map((item, index) => finiteOr(getValue(item, index), 0));
  const keys = items.map((item, index) => getKey(item, index));
  const labels = items.map((item, index) => getLabel(item, index));

  const referenceValue = referenceLine ? numberOrNull(referenceLine.value) : null;
  const dataTop = Math.max(...values, referenceValue === null ? -Infinity : referenceValue);
  const top = max !== undefined ? max : dataTop > min ? dataTop : min + 1;
  const span = top - min || 1;
  const share = (value) => clamp((value - min) / span, 0, 1);

  const plotHeight = fill ? plotSize.height || 160 : typeof height === 'number' ? height : 240;
  const isHighlighted = resolveHighlight(highlight, { items, values, keys });

  // Room above the plot for things that stick out of it: pills above the tallest bar, the tag
  const topRoom = Math.max(
    showValues && valuePlacement === 'above' ? 40 : 0,
    // The tag is centred on the line, so it only sticks out above the plot when the line is near the top
    referenceValue !== null && referenceLine.label && share(referenceValue) > 0.88 ? 14 : 0
  );

  const rootStyle = {
    '--bc-height': fill ? 'auto' : `${plotHeight}px`,
    '--bc-gap': `${gap}px`,
    '--bc-radius': radius === 'full' ? '999px' : radius,
    '--bc-max-bar': `${barMaxWidth}px`,
    '--bc-min-col': `${minColumnWidth}px`,
    '--bc-count': items.length,
    '--n': items.length,
    '--bc-gutter': `${referenceLine && referenceLine.gutter ? referenceLine.gutter : 0}px`,
    '--bc-top-room': `${topRoom}px`,
    ...(barWidth ? { '--bc-bar-width': `${barWidth}px` } : null),
    ...colorVars(colors, COLOR_VARS),
    ...(referenceLine ? colorVars(referenceLine, REFERENCE_VARS) : null),
    ...style,
  };

  const Column = interactive ? 'button' : 'div';
  const valueTexts = values.map((value) => formatValue(value));
  const tooltips = items.map((item, index) => {
    const custom = getTooltip ? getTooltip(item, index) : undefined;
    if (custom !== undefined && custom !== null) return custom;
    const label = labels[index];
    const isText = typeof label === 'string' || typeof label === 'number';
    return isText && label !== '' ? `${label}: ${valueTexts[index]}` : valueTexts[index];
  });

  const caption = [title, summary !== undefined ? summary : describeValues(labels, values, formatValue)]
    .filter(Boolean)
    .join('. ');

  return (
    <figure
      className={cx('cc bc', className)}
      style={rootStyle}
      data-animate={animate ? 'true' : 'false'}
      data-shape={valueShape}
      data-ref={referenceValue !== null ? 'true' : 'false'}
      data-fill={fill ? 'true' : 'false'}
      data-sublabel={sublabelPlacement}
    >
      {caption && <figcaption className="cc-sr-only">{caption}</figcaption>}

      <div className="bc__scroll">
        <div className="bc__inner" aria-hidden={interactive ? undefined : 'true'}>
          <div className="bc__plot" ref={plotRef}>
            {referenceValue !== null && (
              <div className="bc__ref" style={{ bottom: `${share(referenceValue) * 100}%` }}>
                <span className="bc__ref-line" />
                {referenceLine.label ? <span className="bc__ref-tag">{referenceLine.label}</span> : null}
              </div>
            )}

            <div className="bc__cols">
              {items.map((item, index) => {
                const barShare = share(values[index]);
                const inside =
                  valuePlacement === 'inside' ||
                  (valuePlacement === 'auto' && barShare * plotHeight >= INSIDE_MIN_PX);
                const fill = getColor ? getColor(item, index) : undefined;
                const columnStyle = { '--i': index, ...(fill ? { '--bc-item-fill': fill } : null) };

                return (
                  <Column
                    key={keys[index]}
                    className="bc__col"
                    style={columnStyle}
                    data-highlight={isHighlighted(index) ? 'true' : 'false'}
                    onPointerEnter={(event) => showTip(event, index)}
                    onPointerLeave={hideTip}
                    {...(interactive
                      ? {
                          type: 'button',
                          onClick: () => onItemClick(item, index),
                          onFocus: (event) => showTip(event, index),
                          onBlur: hideTip,
                          'aria-label': tooltips[index],
                        }
                      : null)}
                  >
                    <span className="bc__bar" style={{ height: `${barShare * 100}%` }} data-empty={barShare === 0}>
                      <span className="bc__fill" />
                      {showValues && (
                        <span className="bc__value" data-placement={inside ? 'inside' : 'above'}>
                          {getValueLabel ? getValueLabel(item, index) : valueTexts[index]}
                        </span>
                      )}
                    </span>
                  </Column>
                );
              })}
            </div>
          </div>

          {showLabels && (
            <div className="bc__labels" aria-hidden={interactive ? 'true' : undefined}>
              {items.map((item, index) => {
                const sublabel = getSublabel ? getSublabel(item, index) : null;
                return (
                  <div className="bc__caption" key={keys[index]} style={{ '--i': index }}>
                    <span className="bc__label" title={typeof labels[index] === 'string' ? labels[index] : undefined}>
                      {labels[index]}
                    </span>
                    {sublabel ? <span className="bc__sublabel">{sublabel}</span> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {tip && tip.index < items.length && (
        <ChartTip anchor={tip} colors={colors}>
          {typeof labels[tip.index] === 'string' || typeof labels[tip.index] === 'number' ? (
            <TipTitle>{labels[tip.index]}</TipTitle>
          ) : null}
          <TipValue>{getValueLabel ? getValueLabel(items[tip.index], tip.index) : valueTexts[tip.index]}</TipValue>
        </ChartTip>
      )}

      {!interactive && (
        <div className="cc-sr-only">
<table>
          {title ? <caption>{title}</caption> : null}
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={keys[index]}>
                <th scope="row">{labels[index]}</th>
                <td>{valueTexts[index]}</td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      )}
    </figure>
  );
}
