import React, { useEffect, useState } from 'react';
import './shared.css';
import './TimelineStrip.css';
import ChartTip, { TipTitle, TipValue } from './ChartTip';
import { cx, describeValues, finiteOr, formatNumber } from './chartUtils';
import { toneColors } from './tone';

/**
 * TimelineStrip: one horizontal strip cut into consecutive parts, each as wide as its length.
 * Use it to show how a stretch of time (or any total) was spent: a recording as silence, speech
 * and pauses, a day as work and breaks, a download as phases. It shows the shape and the order,
 * not exact figures, so the exact figure of every part is written inside the part when it is wide
 * enough, in the hover card, and in the table for assistive technology.
 *
 * Every part carries a word and a figure (never colour alone): the colour only groups parts of
 * the same kind. Put a ChartLegend beside the strip to name the kinds.
 *
 * Data
 *   data              array of anything, in the order the parts happen
 *   getKey(item, i)       unique key           default item.key, else the index
 *   getLabel(item, i)     name of the part     default item.label ("Speech", "Pause")
 *   getValue(item, i)     length, a number     default item.value. Parts with no length are left out.
 *   getTone(item, i)      'accent' | 'success' | 'warning' | 'danger' | 'neutral', or any CSS
 *                         colour                default item.tone, else 'accent'
 *   formatValue(value)    the figure of a part   default: Indian digit grouping and " s" ("3.2 s")
 *
 * Look
 *   height (32)       strip height in px
 *   gap (3)           space between parts in px
 *   showLabels ('auto')   'auto' writes "Label figure" in a part that is at least 14% of the strip and
 *                         only the figure in one that is at least 6%; true writes the label whenever
 *                         the part is wide enough for the figure; false writes nothing inside
 *   animate (true)    the parts grow out of their left edge one after another, once on mount (not
 *                     when reduced motion is requested)
 *
 * Accessibility
 *   title, summary    the text equivalent of the strip. Without `summary` the parts are listed.
 *                     A table of every part (name, length, share) is also provided.
 *   emptyMessage      shown when there is nothing to draw
 *   className, style  passed to the root element
 *
 * Hover: pointing at a part opens the small white card (ChartTip) with its name and figure.
 *
 * CSS variables: --tl-text (default --ds-text)
 */

const defaultKey = (item, index) => (item && item.key !== undefined ? item.key : index);
const defaultLabel = (item) => (item ? item.label : undefined);
const defaultValue = (item) => (item ? item.value : undefined);
const defaultTone = (item) => (item && item.tone ? item.tone : 'accent');
const defaultFormat = (value) => `${formatNumber(value)} s`;
const SHARE_FOR_LABEL = 0.14;
const SHARE_FOR_FIGURE = 0.06;
const PERCENT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export default function TimelineStrip({
  data = [],
  getKey = defaultKey,
  getLabel = defaultLabel,
  getValue = defaultValue,
  getTone = defaultTone,
  formatValue = defaultFormat,
  height = 32,
  gap = 3,
  showLabels = 'auto',
  animate = true,
  title,
  summary,
  emptyMessage = 'Nothing to show yet',
  className,
  style,
}) {
  // The part the hover card is open for: { index, x, top, bottom } in window coordinates
  const [tip, setTip] = useState(null);

  useEffect(() => {
    if (!tip) return undefined;
    const close = () => setTip(null);
    const onKey = (event) => {
      if (event.key === 'Escape') setTip(null);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [tip]);

  const parts = (Array.isArray(data) ? data : [])
    .map((item, index) => ({
      item,
      index,
      key: getKey(item, index),
      label: getLabel(item, index),
      value: Math.max(0, finiteOr(getValue(item, index), 0)),
      tone: toneColors(getTone(item, index)),
    }))
    .filter((part) => part.value > 0);
  const total = parts.reduce((sum, part) => sum + part.value, 0);

  if (parts.length === 0 || total <= 0) {
    return (
      <div className={cx('cc tl tl--empty', className)} style={style}>
        <p className="tl__empty">{emptyMessage}</p>
      </div>
    );
  }

  const description = [
    title,
    summary !== undefined
      ? summary
      : describeValues(
          parts.map((part) => part.label),
          parts.map((part) => part.value),
          formatValue
        ),
  ]
    .filter(Boolean)
    .join('. ');

  const textOf = (part) => {
    const share = part.value / total;
    const figure = formatValue(part.value);
    const hasLabel = typeof part.label === 'string' && part.label !== '';
    if (showLabels === false) return '';
    if (showLabels === true) return share >= SHARE_FOR_FIGURE ? (hasLabel ? `${part.label} ${figure}` : figure) : '';
    if (share >= SHARE_FOR_LABEL) return hasLabel ? `${part.label} ${figure}` : figure;
    return share >= SHARE_FOR_FIGURE ? figure : '';
  };

  const show = (event, index) => {
    const box = event.currentTarget.getBoundingClientRect();
    setTip({ index, x: box.left + box.width / 2, top: box.top, bottom: box.bottom });
  };

  const active = tip ? parts[tip.index] : null;

  return (
    <div
      className={cx('cc tl', className)}
      style={{ '--tl-height': `${height}px`, '--tl-gap': `${gap}px`, '--n': parts.length, ...style }}
      data-animate={animate ? 'true' : 'false'}
    >
      <div className="tl__strip" role="img" aria-label={description || undefined}>
        {parts.map((part, index) => (
          <span
            key={part.key}
            className="tl__part"
            style={{
              flexGrow: part.value,
              '--i': index,
              '--tl-fill': part.tone.soft,
              '--tl-ink': part.tone.ink,
            }}
            onPointerEnter={(event) => show(event, index)}
            onPointerLeave={() => setTip(null)}
          >
            <span className="tl__text">{textOf(part)}</span>
          </span>
        ))}
      </div>
      {active && (
        <ChartTip anchor={tip}>
          {typeof active.label === 'string' && active.label !== '' ? <TipTitle>{active.label}</TipTitle> : null}
          <TipValue>{formatValue(active.value)}</TipValue>
        </ChartTip>
      )}
      <div className="cc-sr-only">
        <table>
          {title ? <caption>{title}</caption> : null}
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col">Length</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.key}>
                <th scope="row">{part.label}</th>
                <td>{formatValue(part.value)}</td>
                <td>{`${PERCENT.format((part.value / total) * 100)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
