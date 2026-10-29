import React, { useId } from 'react';
import './shared.css';
import './LineChart.css';
import { useElementSize } from './useElementWidth';
import { colorVars, cx, formatNumber, numberOrNull, spreadIndexes } from './chartUtils';
import { PATH_BUILDERS, runsOf, smoothPath } from './linePaths';

/**
 * LineChart: one series drawn as a line, a filled area, or as stems (a dot on a vertical stem
 * for every point, like a lollipop; with a second value per point the stem joins two dots).
 *
 * It measures its own width and draws in real pixels, so lines and dots keep their proportions
 * at any size. Put it in a box of any width; the height is a prop.
 *
 * Data (keep it in x order)
 *   data              array of anything
 *   getY(item, i)         the value; null or undefined leaves a gap     default item.value
 *   getY0(item, i)        an optional second value. With variant 'stems' the stem joins it to the
 *                         first value (a range); without it stems start at the bottom edge.
 *   getX(item, i)         numbers or Dates place points proportionally in time or distance;
 *                         anything else (or nothing) spaces the points evenly.
 *   getLabel(item, i)     text for the x axis, hover text and the text equivalent   default item.label
 *   getTooltip(item, i)   the full hover text of a point                            default "label: value"
 *   formatY(value)        default: Indian digit grouping, at most 2 decimals
 *
 * Shape
 *   variant ('line')  'line' | 'area' | 'stems'
 *   curve ('smooth')  'smooth' (no overshoot) | 'linear' | 'step'      (line and area)
 *   connectGaps (false) join the points either side of a gap instead of breaking the line
 *   yDomain           [min, max]; leave either out (or null) to fit the data
 *   yPadding (0.12)   extra room above and below fitted data, as a share of its range
 *   invertY (false)   put small values at the top. Use it for ranks, where 1 is the best.
 *
 * Look
 *   height (160)      px, or 'fill' to take the height the parent leaves (the parent must be a
 *                     flex column with a height of its own)
 *   padding           a number, or { top, right, bottom, left } in px
 *   strokeWidth (2), stemWidth (2), dotRadius (4)
 *   dots              'last' | 'all' | 'none'. Default 'last' for line and area, 'all' for stems.
 *   baseDots (false)  with getY0, also draw a dot where each stem starts: true for a smaller
 *                     outlined one, 'filled' for one just like the dot at the other end (a dumbbell)
 *   showGrid (true), gridLines (3)   dashed hairlines
 *   xAxis (false), xTicks (4)        labels from getLabel under the chart
 *   yAxis (false)                    value labels at the grid lines
 *   animate (true)    fades in once on mount (not when reduced motion is requested)
 *   colors            { line, area, dot, dotRing, stem, grid, label }, any CSS colour
 *
 * Accessibility
 *   title, summary    the text equivalent. A hidden table lists every point.
 *   emptyMessage      shown when no point has a value
 *   className, style  passed to the root element
 *
 * CSS variables: --lc-line --lc-area --lc-dot --lc-dot-ring --lc-stem --lc-grid --lc-label
 */

const COLOR_VARS = {
  line: '--lc-line',
  area: '--lc-area',
  dot: '--lc-dot',
  dotRing: '--lc-dot-ring',
  stem: '--lc-stem',
  grid: '--lc-grid',
  label: '--lc-label',
};

const round2 = (n) => Math.round(n * 100) / 100;

const defaultY = (item) => (item ? item.value : undefined);
const defaultLabel = (item) => (item ? item.label : undefined);

export default function LineChart({
  data = [],
  getY = defaultY,
  getY0,
  getX,
  getLabel = defaultLabel,
  getTooltip,
  formatY = formatNumber,
  variant = 'line',
  curve = 'smooth',
  connectGaps = false,
  yDomain,
  yPadding = 0.12,
  invertY = false,
  height = 160,
  padding,
  strokeWidth = 2,
  stemWidth = 2,
  dotRadius = 4,
  dots,
  baseDots = false,
  showGrid = true,
  gridLines = 3,
  xAxis = false,
  xTicks = 4,
  yAxis = false,
  animate = true,
  colors,
  title,
  summary,
  emptyMessage = 'No data yet',
  className,
  style,
}) {
  const [canvasRef, size] = useElementSize();
  const { width } = size;
  const fill = height === 'fill';
  // In fill mode the height is whatever the parent leaves, so it is the measured one
  const drawHeight = fill ? size.height : height;
  const gradientId = `lc-area-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const items = Array.isArray(data) ? data : [];
  const ys = items.map((item, index) => numberOrNull(getY(item, index)));
  const y0s = items.map((item, index) => (getY0 ? numberOrNull(getY0(item, index)) : null));
  const labels = items.map((item, index) => getLabel(item, index));

  // Horizontal positions: real numbers or dates when every item has one, otherwise even spacing
  const rawX = items.map((item, index) => (getX ? getX(item, index) : index));
  const isPosition = (x) => x instanceof Date || (typeof x === 'number' && Number.isFinite(x));
  const evenly = !getX || !rawX.every(isPosition);
  const xs = evenly ? items.map((_, index) => index) : rawX.map((x) => (x instanceof Date ? x.getTime() : x));

  const known = [...ys, ...y0s].filter((value) => value !== null);
  const hasValues = ys.some((value) => value !== null);

  const rootStyle = {
    '--n': items.length || 1,
    ...colorVars(colors, COLOR_VARS),
    ...style,
  };

  // The caption and the table are the same for the empty and the drawn chart
  const latest = hasValues ? [...ys].reverse().find((value) => value !== null) : null;
  const description = [
    title,
    summary !== undefined
      ? summary
      : hasValues
        ? `Latest ${formatY(latest)}, lowest ${formatY(Math.min(...known))}, highest ${formatY(Math.max(...known))}`
        : emptyMessage,
  ]
    .filter(Boolean)
    .join('. ');

  const table = hasValues ? (
    <div className="cc-sr-only">
<table>
      {title ? <caption>{title}</caption> : null}
      <thead>
        <tr>
          <th scope="col">Point</th>
          <th scope="col">Value</th>
          {getY0 ? <th scope="col">From</th> : null}
        </tr>
      </thead>
      <tbody>
        {items.slice(0, 120).map((item, index) =>
          ys[index] === null ? null : (
            <tr key={index}>
              <th scope="row">{labels[index] !== undefined && labels[index] !== null ? labels[index] : index + 1}</th>
              <td>{formatY(ys[index])}</td>
              {getY0 ? <td>{y0s[index] === null ? '' : formatY(y0s[index])}</td> : null}
            </tr>
          )
        )}
      </tbody>
    </table>
</div>
  ) : null;

  if (!hasValues) {
    return (
      <figure className={cx('cc lc lc--empty', className)} style={rootStyle} data-fill={fill ? 'true' : 'false'}>
        <figcaption className="cc-sr-only">{description}</figcaption>
        <div className="lc__canvas" ref={canvasRef} style={fill ? undefined : { height }}>
          <p className="lc__empty">{emptyMessage}</p>
        </div>
      </figure>
    );
  }

  // ---- Scales -----------------------------------------------------------------------------
  const lowestKnown = Math.min(...known);
  const highestKnown = Math.max(...known);
  const room = (highestKnown - lowestKnown || 1) * yPadding;
  const userLow = yDomain ? numberOrNull(yDomain[0]) : null;
  const userHigh = yDomain ? numberOrNull(yDomain[1]) : null;
  let low = userLow !== null ? userLow : lowestKnown - room;
  let high = userHigh !== null ? userHigh : highestKnown + room;
  if (high <= low) {
    low -= 1;
    high += 1;
  }

  const edge = dotRadius + 6;
  const inset = {
    top: edge,
    right: edge,
    bottom: edge + (xAxis ? 18 : 0),
    left: edge + (yAxis ? 34 : 0),
    ...(typeof padding === 'number' ? { top: padding, right: padding, bottom: padding, left: padding } : padding),
  };
  const innerWidth = Math.max(0, width - inset.left - inset.right);
  const innerHeight = Math.max(0, drawHeight - inset.top - inset.bottom);
  const floor = inset.top + innerHeight;

  const lowestX = Math.min(...xs);
  const highestX = Math.max(...xs);
  const px = (x) => inset.left + (highestX === lowestX ? innerWidth / 2 : ((x - lowestX) / (highestX - lowestX)) * innerWidth);
  const py = (value) => {
    const along = (value - low) / (high - low);
    return invertY ? inset.top + along * innerHeight : floor - along * innerHeight;
  };

  const points = items.map((_, index) =>
    ys[index] === null ? null : { x: px(xs[index]), y: py(ys[index]), index }
  );
  const runs = runsOf(points, connectGaps);
  const buildPath = PATH_BUILDERS[curve] || smoothPath;

  const dotMode = dots || (variant === 'stems' ? 'all' : 'last');
  const lastPoint = [...points].reverse().find(Boolean);
  const dotPoints = dotMode === 'all' ? points.filter(Boolean) : dotMode === 'last' && lastPoint ? [lastPoint] : [];

  const hover = (index) => {
    if (getTooltip) return getTooltip(items[index], index);
    const label = labels[index];
    const text = typeof label === 'string' || typeof label === 'number' ? `${label}: ` : '';
    return `${text}${formatY(ys[index])}`;
  };

  // ---- Grid and axis labels ---------------------------------------------------------------
  const lineCount = Math.max(2, Math.round(gridLines));
  const gridRows = Array.from({ length: lineCount }, (_, k) => {
    const share = k / (lineCount - 1);
    return {
      y: inset.top + share * innerHeight,
      value: invertY ? low + share * (high - low) : high - share * (high - low),
    };
  });
  const labelIndexes = xAxis ? spreadIndexes(items.length, Math.max(2, Math.round(xTicks))) : [];

  return (
    <figure
      className={cx('cc lc', className)}
      style={rootStyle}
      data-variant={variant}
      data-animate={animate ? 'true' : 'false'}
      data-fill={fill ? 'true' : 'false'}
    >
      <figcaption className="cc-sr-only">{description}</figcaption>

      <div className="lc__canvas" ref={canvasRef} style={fill ? undefined : { height }}>
        {width > 0 && drawHeight > 0 && (
          <svg
            className="lc__svg"
            width={width}
            height={drawHeight}
            viewBox={`0 0 ${width} ${drawHeight}`}
            aria-hidden="true"
            focusable="false"
          >
            {variant === 'area' && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: 'var(--lc-area)', stopOpacity: 0.18 }} />
                  <stop offset="1" style={{ stopColor: 'var(--lc-area)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
            )}

            {showGrid &&
              gridRows.map((row, k) => (
                <g key={k}>
                  <line className="lc__grid" x1={inset.left} x2={width - inset.right} y1={round2(row.y)} y2={round2(row.y)} />
                  {yAxis && (
                    <text className="lc__tick-label" x={inset.left - 8} y={round2(row.y)} dy="0.35em" textAnchor="end">
                      {formatY(row.value)}
                    </text>
                  )}
                </g>
              ))}

            {xAxis &&
              labelIndexes.map((index, k) => {
                const label = labels[index];
                if (label === undefined || label === null || label === '') return null;
                const anchor = k === 0 ? 'start' : k === labelIndexes.length - 1 ? 'end' : 'middle';
                const x = points[index] ? points[index].x : px(xs[index]);
                return (
                  <text key={index} className="lc__tick-label" x={round2(x)} y={drawHeight - 4} textAnchor={anchor}>
                    {label}
                  </text>
                );
              })}

            {variant === 'area' &&
              runs.map((run, k) => (
                <path
                  key={`area-${k}`}
                  className="lc__area"
                  fill={`url(#${gradientId})`}
                  d={`${buildPath(run)}L${round2(run[run.length - 1].x)},${round2(floor)}L${round2(run[0].x)},${round2(floor)}Z`}
                />
              ))}

            {variant !== 'stems' &&
              runs.map((run, k) => (
                <path key={`line-${k}`} className="lc__line" strokeWidth={strokeWidth} pathLength={1} d={buildPath(run)} />
              ))}

            {variant === 'stems' &&
              points.filter(Boolean).map((point) => {
                const start = y0s[point.index] === null ? floor : py(y0s[point.index]);
                return (
                  <g key={point.index} className="lc__stem-group" style={{ '--i': point.index }}>
                    <title>{hover(point.index)}</title>
                    <line
                      className="lc__stem"
                      strokeWidth={stemWidth}
                      x1={round2(point.x)}
                      x2={round2(point.x)}
                      y1={round2(start)}
                      y2={round2(point.y)}
                    />
                    {baseDots && y0s[point.index] !== null && (
                      <circle
                        className={baseDots === 'filled' ? 'lc__dot' : 'lc__dot lc__dot--base'}
                        cx={round2(point.x)}
                        cy={round2(start)}
                        r={baseDots === 'filled' ? dotRadius : Math.max(1.5, dotRadius * 0.7)}
                      />
                    )}
                  </g>
                );
              })}

            {dotPoints.map((point) => (
              <circle
                key={`dot-${point.index}`}
                className="lc__dot"
                cx={round2(point.x)}
                cy={round2(point.y)}
                r={dotRadius}
                strokeWidth={2}
                style={{ '--i': point.index }}
              >
                <title>{hover(point.index)}</title>
              </circle>
            ))}
          </svg>
        )}
      </div>

      {table}
    </figure>
  );
}
