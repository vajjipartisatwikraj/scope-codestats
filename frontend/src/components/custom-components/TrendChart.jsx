import React, { useId, useRef, useState } from 'react';
import './shared.css';
import './TrendChart.css';
import ChartLegend from './ChartLegend';
import ChartTip, { TipRow, TipTitle } from './ChartTip';
import { useElementSize } from './useElementWidth';
import { PATH_BUILDERS, runsOf, smoothPath } from './linePaths';
import { clamp, colorVars, cx, formatNumber, niceTicks, numberOrNull, seriesColor, spreadIndexes } from './chartUtils';

/**
 * TrendChart: one or several series over the same x axis, drawn as lines, filled areas or bars,
 * with a y axis, dashed gridlines, a legend that switches series on and off, and a hover line
 * that lists every series at that point. The workhorse for "how did this change over time".
 *
 * It measures its own box and draws in real pixels, so strokes, dots and text keep their true
 * proportions at any size.
 *
 * Data
 *   data              the x axis: an array of anything (days, weeks, months ...), oldest first
 *   getLabel(item, i)     text of the point: the x axis labels and the title of the hover card
 *   getX(item, i)         numbers or Dates place points proportionally in time; anything else (or
 *                         nothing) spaces them evenly. Ignored when a series is drawn as bars.
 *   formatX(item, i)      text of the x axis labels only      default getLabel
 *   series            [{ key, label, type, getValue, color, format, dots, width, dashed,
 *                        negativeColor }]
 *                       type ('line')   'line' | 'area' | 'bars'
 *                       getValue(item, i)  a number; null or undefined leaves a gap
 *                       color           a CSS colour       default the next colour of the data series
 *                       format(value)   text of the value in the hover card   default formatY
 *                       dots ('last')   'last' | 'all' | 'none'   (line and area)
 *                       curve ('smooth') 'smooth' | 'linear' | 'step'   (line and area)
 *                       width (2)       line width in px
 *                       dashed (false)  a dashed line, for a series that must not be mistaken for
 *                                       its neighbour (colour is never the only difference)
 *                       negativeColor   colour of a bar below zero   default the danger colour
 *
 * Scale
 *   yDomain           [min, max]; leave either out (or null) to fit the data. Ticks stay inside it.
 *   yPadding (0.08)   extra room above and below fitted data, as a share of its range
 *   yTicks (4), xTicks (5)   about how many labels each axis gets
 *   invertY (false)   put small values at the top. Use it for ranks, where 1 is the best.
 *   formatY(value)    default: Indian digit grouping, at most 2 decimals
 *   connectGaps (false)  join the points either side of a gap instead of breaking the line
 *
 * Look
 *   height (220)      px, or 'fill' to take the height the parent leaves (the parent must be a
 *                     flex column with a height of its own)
 *   padding           a number, or { top, right, bottom, left } in px, around the plot
 *   showGrid (true)   dashed hairlines at the y ticks
 *   barRadius (6)     corner radius of the free end of a bar, px
 *   legend ('auto')   'auto' (shown when there is more than one series) | 'bottom' | 'none'
 *   legendToggle (true)  legend entries switch their series on and off
 *   crosshair (true)  a hover line and card with the values at the nearest point
 *   animate (true)    lines draw themselves, areas fade in and bars rise, once on mount
 *   colors            { grid, label, cross, ring }, any CSS colour
 *
 * Accessibility
 *   title, summary    the text equivalent. A hidden table lists the points (at most 60).
 *   emptyMessage      shown when no series has a value
 *   className, style  passed to the root element
 *
 * CSS variables: --tc-grid --tc-label --tc-cross --tc-ring
 */

const COLOR_VARS = {
  grid: '--tc-grid',
  label: '--tc-label',
  cross: '--tc-cross',
  ring: '--tc-ring',
};

const round2 = (n) => Math.round(n * 100) / 100;
const MAX_BAR = 44;

const defaultLabel = (item) => (item ? item.label : undefined);

/** A bar from the baseline to the value, rounded at the free end only */
function barPath(x, width, baseline, end, radius) {
  const top = Math.min(baseline, end);
  const height = Math.max(1.5, Math.abs(end - baseline));
  const r = Math.min(radius, width / 2, height);
  const left = round2(x);
  const right = round2(x + width);
  if (end <= baseline) {
    // grows up: rounded top
    const y = round2(baseline - height);
    return `M${left},${round2(baseline)}V${round2(y + r)}Q${left},${y} ${round2(x + r)},${y}H${round2(x + width - r)}Q${right},${y} ${right},${round2(y + r)}V${round2(baseline)}Z`;
  }
  // grows down: rounded bottom
  const y = round2(top + height);
  return `M${left},${round2(top)}V${round2(y - r)}Q${left},${y} ${round2(x + r)},${y}H${round2(x + width - r)}Q${right},${y} ${right},${round2(y - r)}V${round2(top)}Z`;
}

export default function TrendChart({
  data = [],
  series = [],
  getX,
  getLabel = defaultLabel,
  formatX,
  formatY = formatNumber,
  yDomain,
  yPadding = 0.08,
  yTicks = 4,
  xTicks = 5,
  invertY = false,
  connectGaps = false,
  height = 220,
  padding,
  showGrid = true,
  barRadius = 6,
  legend = 'auto',
  legendToggle = true,
  crosshair = true,
  animate = true,
  colors,
  title,
  summary,
  emptyMessage = 'Nothing to show yet',
  className,
  style,
}) {
  const [canvasRef, size] = useElementSize();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hidden, setHidden] = useState(() => new Set());
  const [focusKey, setFocusKey] = useState(null); // the legend entry under the pointer
  const [hover, setHover] = useState(null); // { index, x (client), top, bottom }
  const frame = useRef(0);

  const fill = height === 'fill';
  const { width } = size;
  const drawHeight = fill ? size.height : height;

  const items = Array.isArray(data) ? data : [];
  const defs = series.map((entry, index) => ({
    type: 'line',
    dots: 'last',
    width: 2,
    dashed: false,
    color: seriesColor(index),
    format: formatY,
    ...entry,
  }));
  const shown = defs.filter((def) => !hidden.has(def.key));
  const labels = items.map((item, index) => getLabel(item, index));
  const values = Object.fromEntries(
    defs.map((def) => [def.key, items.map((item, index) => numberOrNull(def.getValue(item, index)))])
  );

  const hasValues = defs.some((def) => values[def.key].some((value) => value !== null));
  const rootStyle = {
    '--n': items.length || 1,
    ...colorVars(colors, COLOR_VARS),
    ...style,
  };

  const description = [
    title,
    summary !== undefined ? summary : hasValues ? `${defs.map((def) => def.label).join(', ')} over ${items.length} points` : emptyMessage,
  ]
    .filter(Boolean)
    .join('. ');

  if (!hasValues) {
    return (
      <figure className={cx('cc tc tc--empty', className)} style={rootStyle} data-fill={fill ? 'true' : 'false'}>
        <figcaption className="cc-sr-only">{description}</figcaption>
        <div className="tc__canvas" ref={canvasRef} style={fill ? undefined : { height }}>
          <p className="tc__empty">{emptyMessage}</p>
        </div>
      </figure>
    );
  }

  // ---- Scale ------------------------------------------------------------------------------
  const hasBars = shown.some((def) => def.type === 'bars');
  const pool = shown.length ? shown : defs;
  const known = pool.flatMap((def) => values[def.key].filter((value) => value !== null));
  if (hasBars || pool.some((def) => def.type === 'bars')) known.push(0);

  const userLow = yDomain ? numberOrNull(yDomain[0]) : null;
  const userHigh = yDomain ? numberOrNull(yDomain[1]) : null;
  let dataLow = Math.min(...known);
  let dataHigh = Math.max(...known);
  // A series that hardly moves (a rating that did not change) would get a scale of fractions;
  // give it at least a sensible span around its value
  const minSpan = Math.max(1, Math.abs(dataHigh) * 0.01);
  if (dataHigh - dataLow < minSpan) {
    const middle = (dataHigh + dataLow) / 2;
    dataLow = middle - minSpan / 2;
    dataHigh = middle + minSpan / 2;
  }
  const room = (dataHigh - dataLow || 1) * yPadding;
  const wantLow = userLow !== null ? userLow : dataLow - (pool.some((def) => def.type === 'bars') && dataLow >= 0 ? 0 : room);
  const wantHigh = userHigh !== null ? userHigh : dataHigh + room;
  let ticks = niceTicks(wantLow, wantHigh, yTicks);
  let low = userLow !== null ? userLow : ticks[0];
  let high = userHigh !== null ? userHigh : ticks[ticks.length - 1];
  if (high <= low) {
    low -= 1;
    high += 1;
  }
  ticks = ticks.filter((tick) => tick >= low - 1e-9 && tick <= high + 1e-9);
  // A fixed lower end (rank 1) gets its own label when the round ticks start well above it
  if (userLow !== null && ticks.length > 1 && ticks[0] - low >= (ticks[1] - ticks[0]) * 0.4) ticks.unshift(low);
  const tickTexts = ticks.map((tick) => formatY(tick));

  const leftPad = Math.max(24, Math.max(0, ...tickTexts.map((text) => String(text).length)) * 6.6 + 14);
  const inset = {
    top: 12,
    right: 12,
    bottom: 28,
    left: leftPad,
    ...(typeof padding === 'number' ? { top: padding, right: padding, bottom: padding, left: padding } : padding),
  };
  const innerWidth = Math.max(0, width - inset.left - inset.right);
  const innerHeight = Math.max(0, drawHeight - inset.top - inset.bottom);
  const bottom = inset.top + innerHeight;

  const py = (value) => {
    const along = (value - low) / (high - low);
    return invertY ? inset.top + along * innerHeight : bottom - along * innerHeight;
  };
  const baselineY = py(clamp(0, low, high));

  // ---- x positions --------------------------------------------------------------------------
  const count = items.length;
  const rawX = items.map((item, index) => (getX ? getX(item, index) : index));
  const isPosition = (x) => x instanceof Date || (typeof x === 'number' && Number.isFinite(x));
  const evenly = !getX || !rawX.every(isPosition);
  const xs = evenly ? items.map((_, index) => index) : rawX.map((x) => (x instanceof Date ? x.getTime() : x));
  const lowestX = Math.min(...xs);
  const highestX = Math.max(...xs);
  const band = hasBars; // bars need equal slots, so everything shares them
  const slot = count > 0 ? innerWidth / count : 0;
  const px = (index) => {
    if (band) return inset.left + (index + 0.5) * slot;
    if (count === 1 || highestX === lowestX) return inset.left + innerWidth / 2;
    return inset.left + ((xs[index] - lowestX) / (highestX - lowestX)) * innerWidth;
  };
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot * 0.68));
  const pxs = items.map((_, index) => px(index));

  const xLabelIndexes = spreadIndexes(count, Math.max(2, Math.round(xTicks)));
  const labelOf = (index) => (formatX ? formatX(items[index], index) : labels[index]);

  // ---- Hover --------------------------------------------------------------------------------
  const nearest = (clientX) => {
    const box = canvasRef.current ? canvasRef.current.getBoundingClientRect() : null;
    if (!box || count === 0) return null;
    const x = clientX - box.left;
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < count; index += 1) {
      if (!shown.some((def) => values[def.key][index] !== null)) continue;
      const distance = Math.abs(pxs[index] - x);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    }
    return bestDistance === Infinity ? null : { index: best, box };
  };
  const onMove = (event) => {
    if (!crosshair) return;
    const clientX = event.clientX;
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      const found = nearest(clientX);
      if (!found) return setHover(null);
      const { index, box } = found;
      const ys = shown.map((def) => values[def.key][index]).filter((value) => value !== null).map(py);
      return setHover((current) =>
        current && current.index === index
          ? current
          : { index, x: box.left + pxs[index], top: box.top + Math.min(...ys), bottom: box.top + bottom }
      );
    });
  };
  const onLeave = () => {
    window.cancelAnimationFrame(frame.current);
    setHover(null);
  };

  const toggle = (key) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else if (defs.length - next.size > 1) next.add(key); // one series always stays on
      return next;
    });

  // ---- Marks --------------------------------------------------------------------------------
  const marks = shown.map((def) => {
    const ys = values[def.key];
    const points = ys.map((value, index) => (value === null ? null : { x: pxs[index], y: py(value), index, value }));
    const runs = runsOf(points, connectGaps);
    const build = def.type === 'bars' ? null : PATH_BUILDERS[def.curve] || smoothPath;
    const dim = focusKey !== null && focusKey !== def.key;
    const lastPoint = [...points].reverse().find(Boolean);
    const dotPoints =
      def.type === 'bars' || def.dots === 'none'
        ? []
        : def.dots === 'all'
          ? points.filter(Boolean)
          : lastPoint
            ? [lastPoint]
            : [];

    return (
      <g key={def.key} className="tc__series" data-type={def.type} data-dim={dim ? 'true' : 'false'}>
        {def.type === 'area' && (
          <defs>
            <linearGradient id={`${uid}-${def.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: def.color, stopOpacity: 0.18 }} />
              <stop offset="1" style={{ stopColor: def.color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
        )}

        {def.type === 'area' &&
          runs.map((run, k) => (
            <path
              key={`area-${k}`}
              className="tc__area"
              fill={`url(#${uid}-${def.key})`}
              d={`${build(run)}L${round2(run[run.length - 1].x)},${round2(bottom)}L${round2(run[0].x)},${round2(bottom)}Z`}
            />
          ))}

        {def.type === 'bars' &&
          points.filter(Boolean).map((point) => (
            <path
              key={point.index}
              className="tc__bar"
              d={barPath(point.x - barWidth / 2, barWidth, baselineY, point.y, barRadius)}
              data-negative={point.value < 0 ? 'true' : 'false'}
              style={{ fill: point.value < 0 ? def.negativeColor || 'var(--ds-danger)' : def.color, '--i': point.index }}
            />
          ))}

        {def.type !== 'bars' &&
          runs.map((run, k) => (
            <path
              key={`line-${k}`}
              className="tc__line"
              d={build(run)}
              pathLength={1}
              style={{ stroke: def.color }}
              strokeWidth={def.width}
              strokeDasharray={def.dashed ? '5 5' : undefined}
              data-dashed={def.dashed ? 'true' : 'false'}
            />
          ))}

        {dotPoints.map((point) => (
          <circle key={`dot-${point.index}`} className="tc__dot" cx={round2(point.x)} cy={round2(point.y)} r={4} style={{ fill: def.color }} />
        ))}
      </g>
    );
  });

  const hoverIndex = hover ? hover.index : null;
  const showLegend = legend === 'bottom' || (legend === 'auto' && defs.length > 1);
  const samples = items.length > 60 ? spreadIndexes(items.length, 60) : items.map((_, index) => index);

  return (
    <figure
      className={cx('cc tc', className)}
      style={rootStyle}
      data-fill={fill ? 'true' : 'false'}
      data-animate={animate ? 'true' : 'false'}
      data-bars={hasBars ? 'true' : 'false'}
    >
      <figcaption className="cc-sr-only">{description}</figcaption>

      <div className="tc__canvas" ref={canvasRef} style={fill ? undefined : { height }}>
        {width > 0 && drawHeight > 0 && (
          <svg
            className="tc__svg"
            width={width}
            height={drawHeight}
            viewBox={`0 0 ${width} ${drawHeight}`}
            aria-hidden="true"
            focusable="false"
          >
            {ticks.map((tick, k) => (
              <g key={`tick-${k}`}>
                {showGrid && (
                  <line
                    className="tc__grid"
                    x1={inset.left}
                    x2={width - inset.right}
                    y1={round2(py(tick))}
                    y2={round2(py(tick))}
                  />
                )}
                <text className="tc__tick" x={inset.left - 8} y={round2(py(tick))} dy="0.35em" textAnchor="end">
                  {tickTexts[k]}
                </text>
              </g>
            ))}

            {hasBars && low < 0 && high > 0 && (
              <line className="tc__zero" x1={inset.left} x2={width - inset.right} y1={round2(baselineY)} y2={round2(baselineY)} />
            )}

            {xLabelIndexes.map((index, k) => {
              const text = labelOf(index);
              if (text === undefined || text === null || text === '') return null;
              const anchor = band ? 'middle' : k === 0 ? 'start' : k === xLabelIndexes.length - 1 ? 'end' : 'middle';
              return (
                <text key={`x-${index}`} className="tc__tick" x={round2(pxs[index])} y={drawHeight - 6} textAnchor={anchor}>
                  {text}
                </text>
              );
            })}

            {marks}

            {crosshair && hoverIndex !== null && (
              <g className="tc__hover">
                <line className="tc__cross" x1={round2(pxs[hoverIndex])} x2={round2(pxs[hoverIndex])} y1={inset.top} y2={round2(bottom)} />
                {shown
                  .filter((def) => def.type !== 'bars' && values[def.key][hoverIndex] !== null)
                  .map((def) => (
                    <circle
                      key={def.key}
                      className="tc__point"
                      cx={round2(pxs[hoverIndex])}
                      cy={round2(py(values[def.key][hoverIndex]))}
                      r={5}
                      style={{ fill: def.color }}
                    />
                  ))}
              </g>
            )}

            {crosshair && (
              <rect
                className="tc__hit"
                x={inset.left}
                y={inset.top}
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onPointerMove={onMove}
                onPointerDown={onMove}
                onPointerLeave={onLeave}
              />
            )}
          </svg>
        )}
      </div>

      {showLegend && (
        <ChartLegend
          className="tc__legend"
          items={defs.map((def) => ({ key: def.key, label: def.label, color: def.color }))}
          hiddenKeys={hidden}
          onToggle={legendToggle ? toggle : undefined}
          activeKey={focusKey}
          onActiveChange={setFocusKey}
          label={title ? `${title}, legend` : 'Legend'}
        />
      )}

      {hover && hoverIndex !== null && hoverIndex < count && (
        <ChartTip anchor={hover} variant="list">
          {labels[hoverIndex] !== undefined && labels[hoverIndex] !== null ? <TipTitle>{labels[hoverIndex]}</TipTitle> : null}
          {shown
            .filter((def) => values[def.key][hoverIndex] !== null)
            .map((def) => (
              <TipRow key={def.key} color={def.color} label={def.label} value={def.format(values[def.key][hoverIndex])} />
            ))}
        </ChartTip>
      )}

      <div className="cc-sr-only">
<table>
        {title ? <caption>{title}</caption> : null}
        <thead>
          <tr>
            <th scope="col">Point</th>
            {defs.map((def) => (
              <th key={def.key} scope="col">
                {def.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((index) => (
            <tr key={index}>
              <th scope="row">{labels[index] !== undefined && labels[index] !== null ? labels[index] : index + 1}</th>
              {defs.map((def) => (
                <td key={def.key}>{values[def.key][index] === null ? '' : def.format(values[def.key][index])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
</div>
    </figure>
  );
}
