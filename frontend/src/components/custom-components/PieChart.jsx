import React, { useRef, useState } from 'react';
import './shared.css';
import './PieChart.css';
import ChartLegend from './ChartLegend';
import ChartTip, { TipTitle, TipValue } from './ChartTip';
import { clamp, colorVars, cx, describeValues, finiteOr, formatNumber, seriesColor } from './chartUtils';

/**
 * PieChart: shares of a whole as a donut (or a full pie), with a legend and a figure in the
 * middle. Rounded slice ends, a small gap between slices, and a hover that dims the other slices
 * and swaps the middle to the slice you point at. Use it for "how is this total made up".
 *
 * A pie is only honest for parts of ONE whole (problems by platform, easy / medium / hard). It
 * is not for comparing separate quantities: use a BarChart for that.
 *
 * Data
 *   data              array of anything
 *   getKey(item, i)       unique key               default item.key, else the index
 *   getLabel(item, i)     name of the slice        default item.label
 *   getValue(item, i)     a number >= 0            default item.value (negative counts as 0)
 *   getColor(item, i)     a CSS colour             default the next colour of the data series
 *   getDetail(item, i)    a muted second line in the legend (text or node)
 *   formatValue(value)    default: Indian digit grouping, at most 2 decimals
 *   sort ('none')         'desc' puts the biggest slice first
 *
 * Shape
 *   donut (0.66)      inner radius as a share of the outer one. 0 is a full pie.
 *   gap (2.4)         space between slices, in degrees
 *   rounded (true)    round slice ends (donut only)
 *   startAngle (0)    where the first slice starts: 0 is 12 o'clock, 90 is 3 o'clock
 *   size (220)        the diameter never grows beyond this many px, and shrinks with its container
 *
 * Around it
 *   legend ('right')  'right' | 'bottom' | 'none'. The legend lists name, value and share.
 *   showShare (true)  the percentage of each slice in the legend and the hover card
 *   children          the middle of a donut: a node, or ({ total, active }) => node where `active`
 *                     is { item, index, label, value, share } for the slice under the pointer, or
 *                     null. Default: the total and "Total", or the slice's value and name.
 *   totalLabel ('Total')  the name shown under the total in the default middle
 *   onItemClick(item, i)  makes slices and legend entries clickable
 *
 * Look
 *   animate (true)    the slices sweep in once on mount (not when reduced motion is requested)
 *   colors            { track, text, muted }, any CSS colour
 *
 * Accessibility
 *   title, summary    the text equivalent. Without `summary`: "name: value, name: value ...".
 *   emptyMessage      shown when every value is zero
 *   className, style  passed to the root element
 *
 * CSS variables: --pc-track --pc-text --pc-muted
 */

const COLOR_VARS = {
  track: '--pc-track',
  text: '--pc-text',
  muted: '--pc-muted',
};

const VIEW = 100;
const CENTER = VIEW / 2;
const OUTER = 47; // leaves room for a slice to grow a little on hover

const defaultKey = (item, index) => (item && item.key !== undefined ? item.key : index);
const defaultLabel = (item) => (item ? item.label : undefined);
const defaultValue = (item) => (item ? item.value : undefined);

const PERCENT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const percentText = (share) => (share > 0 && share < 0.005 ? '<1%' : `${PERCENT.format(share * 100)}%`);

export default function PieChart({
  data = [],
  getKey = defaultKey,
  getLabel = defaultLabel,
  getValue = defaultValue,
  getColor,
  getDetail,
  formatValue = formatNumber,
  sort = 'none',
  donut = 0.66,
  gap = 2.4,
  rounded = true,
  startAngle = 0,
  size = 220,
  legend = 'right',
  showShare = true,
  children,
  totalLabel = 'Total',
  onItemClick,
  animate = true,
  colors,
  title,
  summary,
  emptyMessage = 'Nothing to show yet',
  className,
  style,
}) {
  const svgRef = useRef(null);
  const [active, setActive] = useState(null); // index of the slice under the pointer or focus
  const [tip, setTip] = useState(null); // where the hover card points: { x, top, bottom }
  const interactive = typeof onItemClick === 'function';

  const base = (Array.isArray(data) ? data : []).map((item, index) => ({
    item,
    index,
    key: getKey(item, index),
    label: getLabel(item, index),
    value: Math.max(0, finiteOr(getValue(item, index), 0)),
    color: (getColor && getColor(item, index)) || seriesColor(index),
  }));
  const slices = sort === 'desc' ? [...base].sort((a, b) => b.value - a.value) : base;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (slices.length === 0 || total <= 0) {
    return (
      <figure className={cx('cc pc pc--empty', className)} style={style} aria-label={title}>
        <p className="pc__empty">{emptyMessage}</p>
      </figure>
    );
  }

  const isPie = donut <= 0;
  const ratio = clamp(donut, 0, 0.92);
  const thickness = isPie ? OUTER : OUTER * (1 - ratio);
  const radius = isPie ? OUTER / 2 : OUTER - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  const gapPercent = (clamp(gap, 0, 20) / 360) * 100;
  const capPercent = rounded && !isPie ? (thickness / circumference) * 100 : 0;

  let cursor = 0;
  const arcs = slices.map((slice) => {
    const share = slice.value / total;
    const from = cursor;
    cursor += share;
    // Round caps extend half a thickness beyond each end, so they are taken off the dash
    const visible = Math.max(0.0001, share * 100 - (slices.length > 1 ? gapPercent : 0));
    const length = Math.max(0.0001, visible - capPercent);
    const offset = (from * 100 + (slices.length > 1 ? gapPercent / 2 : 0) + capPercent / 2) / 100;
    const mid = startAngle + (from + share / 2) * 360;
    return { ...slice, share, length, rotation: startAngle - 90 + offset * 360, mid };
  });

  const activeArc = active !== null ? arcs[active] : null;
  const words = (arc) => (arc ? arc.label : undefined);
  const middle =
    typeof children === 'function'
      ? children({
          total,
          active: activeArc
            ? { item: activeArc.item, index: activeArc.index, label: activeArc.label, value: activeArc.value, share: activeArc.share }
            : null,
        })
      : children !== undefined && children !== null
        ? children
        : (
          <>
            <span className="pc__figure-value">{formatValue(activeArc ? activeArc.value : total)}</span>
            <span className="pc__figure-label">{activeArc ? words(activeArc) : totalLabel}</span>
          </>
        );

  const rootStyle = {
    '--pc-size': `${size}px`,
    '--n': arcs.length,
    ...colorVars(colors, COLOR_VARS),
    ...style,
  };

  const description = [
    title,
    summary !== undefined
      ? summary
      : describeValues(
          arcs.map((arc) => arc.label),
          arcs.map((arc) => arc.value),
          formatValue
        ),
  ]
    .filter(Boolean)
    .join('. ');

  // The hover card points at the middle of the slice's ring
  const pointAt = (arc) => {
    const box = svgRef.current ? svgRef.current.getBoundingClientRect() : null;
    if (!box) return null;
    const radians = ((arc.mid - 90) * Math.PI) / 180;
    const x = box.left + ((CENTER + radius * Math.cos(radians)) / VIEW) * box.width;
    const y = box.top + ((CENTER + radius * Math.sin(radians)) / VIEW) * box.height;
    return { x, top: y - thickness * 0.2, bottom: y + thickness * 0.2 };
  };
  const enter = (arc) => {
    setActive(arc.index);
    setTip(pointAt(arc));
  };
  const leave = () => {
    setActive(null);
    setTip(null);
  };

  const legendItems = arcs.map((arc) => ({
    key: arc.key,
    label: arc.label,
    color: arc.color,
    value: (
      <>
        {formatValue(arc.value)}
        {showShare ? <span className="pc__share">{percentText(arc.share)}</span> : null}
      </>
    ),
    detail: getDetail ? getDetail(arc.item, arc.index) : undefined,
  }));

  return (
    <figure
      className={cx('cc pc', className)}
      style={rootStyle}
      data-legend={legend}
      data-animate={animate ? 'true' : 'false'}
      data-active={active !== null ? 'true' : 'false'}
    >
      <figcaption className="cc-sr-only">{description}</figcaption>

      <div className="pc__plot" role="img" aria-label={description || undefined}>
        <svg ref={svgRef} className="pc__svg" viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true" focusable="false">
          {arcs.map((arc) => (
            <g key={arc.key} transform={`rotate(${arc.rotation} ${CENTER} ${CENTER})`}>
              <circle
                className="pc__slice"
                cx={CENTER}
                cy={CENTER}
                r={radius}
                pathLength={100}
                strokeWidth={thickness}
                strokeLinecap={rounded && !isPie ? 'round' : 'butt'}
                stroke={arc.color}
                data-dim={active !== null && active !== arc.index ? 'true' : 'false'}
                data-active={active === arc.index ? 'true' : 'false'}
                data-clickable={interactive ? 'true' : 'false'}
                style={{ '--pc-length': arc.length, '--i': arc.index }}
                onPointerEnter={() => enter(arc)}
                onPointerLeave={leave}
                onClick={interactive ? () => onItemClick(arc.item, arc.index) : undefined}
              />
            </g>
          ))}
        </svg>

        {!isPie && (
          <div className="pc__middle" data-swap={active !== null ? 'true' : 'false'}>
            {middle}
          </div>
        )}
      </div>

      {legend !== 'none' && (
        <ChartLegend
          className="pc__legend"
          layout="column"
          items={legendItems}
          activeKey={activeArc ? activeArc.key : undefined}
          onActiveChange={(key) => {
            if (key === null) return leave();
            const arc = arcs.find((candidate) => candidate.key === key);
            if (arc) setActive(arc.index);
            return undefined;
          }}
          label={title ? `${title}, legend` : 'Legend'}
        />
      )}

      {tip && activeArc && (
        <ChartTip anchor={tip}>
          <TipTitle>{activeArc.label}</TipTitle>
          <TipValue>
            {formatValue(activeArc.value)}
            {showShare ? ` · ${percentText(activeArc.share)}` : ''}
          </TipValue>
        </ChartTip>
      )}

      <div className="cc-sr-only">
<table>
        {title ? <caption>{title}</caption> : null}
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Value</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {arcs.map((arc) => (
            <tr key={arc.key}>
              <th scope="row">{arc.label}</th>
              <td>{formatValue(arc.value)}</td>
              <td>{percentText(arc.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
</div>
    </figure>
  );
}
