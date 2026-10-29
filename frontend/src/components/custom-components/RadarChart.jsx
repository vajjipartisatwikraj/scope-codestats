import React, { useState } from 'react';
import './shared.css';
import './RadarChart.css';
import ChartTip, { TipRow, TipTitle } from './ChartTip';
import ProgressBar from './ProgressBar';
import { useElementSize } from './useElementWidth';
import { clamp, colorVars, cx, finiteOr, formatNumber } from './chartUtils';

/**
 * RadarChart: several skills (axes) on one web. The further a corner is from the middle, the
 * higher the value. Use it to show a profile of 3 to 8 measures that share a scale (the skills of
 * a speech test, the parts of a score), optionally against a second series such as the batch
 * average. With fewer than 3 axes a web has no shape, so it draws one ProgressBar per axis instead.
 *
 * Data
 *   axes        [{ key, label, value, max (100), compare }]
 *               `value` is the first series; `compare` (optional) the second series on the same
 *               axis. Each axis has its own `max`, so a score out of 5 and one out of 100 can share
 *               a web (every corner is drawn as a share of its own max).
 *   seriesLabel ('You'), compareLabel ('Average')    names of the two series (legend, tooltip, table)
 *   formatValue(n)   default: Indian digit grouping, at most 2 decimals
 *
 * Look
 *   labelSize (12)  px: the font size of the axis names; the room kept for them follows it
 *   aspect (1)    width divided by height of the box the web is drawn in: 1 is a square, 1.8 is a
 *                 wide, low box (the web is as large as fits its height, so long names to the sides
 *                 no longer shrink it)
 *   size (320)    px: the web never grows beyond this wide and shrinks with its container. Or
 *                 'fill' to take the room the parent leaves (the parent must be a flex column with a
 *                 height of its own); the web is as large as fits, with its labels.
 *   color         the first series; default 'var(--ds-accent)'. A soft 18% fill with a solid 2px line.
 *   compareColor  the second series; default 'var(--ds-muted)'. Drawn as a dashed line with no
 *                 fill, so the two never rely on colour alone.
 *   levels (4)    how many rings of the grid (dashed hairlines)
 *   showLegend ('auto')   'auto' (only with a second series) | true | false
 *   animate (true)        the grid fades in, then the shapes grow out of the middle once, with
 *                         the same timing as the other charts (never with reduced motion)
 *   colors        { fill, compare, grid, label, text }, any CSS colour; they win over color and
 *                 compareColor
 *
 * Around it
 *   title, summary    the text equivalent. Without `summary`: "label: value of max, ..." for each axis.
 *   emptyMessage      shown when there are no axes
 *   className, style  passed to the root element
 *
 * Accessibility: the drawing has a text equivalent and a table view for assistive technology; each
 * corner is also a focusable control that opens the same tooltip as the pointer does.
 *
 * CSS variables: --rc-fill --rc-compare --rc-grid --rc-label --rc-text
 */

const COLOR_VARS = {
  fill: '--rc-fill',
  compare: '--rc-compare',
  grid: '--rc-grid',
  label: '--rc-label',
  text: '--rc-text',
};

const LINE_HEIGHT = 14;
const CHAR_WIDTH = 6.6; // average width of the 12px label font
const LABEL_GAP = 12;
const round1 = (n) => Math.round(n * 10) / 10;

/** Splits a long label into at most two lines, at a space near the middle. */
function wrapLabel(text, limit = 14) {
  const label = String(text ?? '');
  if (label.length <= limit || !label.includes(' ')) return [label];
  const words = label.split(' ');
  let best = 1;
  let bestGap = Infinity;
  for (let k = 1; k < words.length; k += 1) {
    const gap = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length);
    if (gap < bestGap) {
      best = k;
      bestGap = gap;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

export default function RadarChart({
  axes = [],
  seriesLabel = 'You',
  compareLabel = 'Average',
  formatValue = formatNumber,
  size = 320,
  labelSize = 12,
  aspect = 1,
  color,
  compareColor,
  levels = 4,
  showLegend = 'auto',
  animate = true,
  colors,
  title,
  summary,
  emptyMessage = 'No skill data yet',
  className,
  style,
}) {
  const rows = (Array.isArray(axes) ? axes : []).map((axis, index) => {
    const max = finiteOr(axis && axis.max, 100) > 0 ? finiteOr(axis.max, 100) : 100;
    const value = clamp(finiteOr(axis && axis.value, 0), 0, max);
    const hasCompare = axis && axis.compare !== undefined && axis.compare !== null && Number.isFinite(Number(axis.compare));
    return {
      key: axis && axis.key !== undefined ? axis.key : index,
      label: axis && axis.label !== undefined ? axis.label : '',
      max,
      value,
      compare: hasCompare ? clamp(Number(axis.compare), 0, max) : null,
    };
  });
  // A second shape is drawn only when every axis has a value for it: a missing one would
  // have to be drawn as zero, which says something the data does not
  const hasCompare = rows.length > 0 && rows.every((row) => row.compare !== null);

  const describeRow = (row) =>
    `${row.label}: ${formatValue(row.value)} of ${formatValue(row.max)}${
      row.compare !== null ? `, ${compareLabel.toLowerCase()} ${formatValue(row.compare)}` : ''
    }`;
  const description = [title, summary !== undefined ? summary : rows.map(describeRow).join('; ')].filter(Boolean).join('. ');

  if (rows.length === 0) {
    return (
      <figure className={cx('cc rc rc--empty', className)} style={style} aria-label={title}>
        <p className="rc__empty">{emptyMessage}</p>
      </figure>
    );
  }

  const rootStyle = {
    '--n': 3,
    ...(color ? { '--rc-fill': color } : null),
    ...(compareColor ? { '--rc-compare': compareColor } : null),
    ...colorVars(colors, COLOR_VARS),
    ...style,
  };

  // Too few axes for a web: one bar each
  if (rows.length < 3) {
    return (
      <figure className={cx('cc rc rc--bars', className)} style={rootStyle}>
        <figcaption className="cc-sr-only">{description}</figcaption>
        <div className="rc__bars">
          {rows.map((row, index) => (
            <ProgressBar
              key={row.key}
              label={row.label}
              value={row.value}
              max={row.max}
              valueLabel={`${formatValue(row.value)} / ${formatValue(row.max)}`}
              colors={{ fill: 'var(--rc-fill)' }}
              animate={animate}
              style={{ '--i': index }}
            />
          ))}
        </div>
      </figure>
    );
  }

  return (
    <RadarWeb
      rows={rows}
      hasCompare={hasCompare}
      describeRow={describeRow}
      description={description}
      rootStyle={rootStyle}
      seriesLabel={seriesLabel}
      compareLabel={compareLabel}
      formatValue={formatValue}
      size={size}
      labelSize={labelSize}
      aspect={aspect}
      color={color}
      compareColor={compareColor}
      levels={levels}
      showLegend={showLegend}
      animate={animate}
      colors={colors}
      title={title}
      className={className}
    />
  );
}

/** The web itself. A component of its own so that it measures its box from the first render. */
function RadarWeb({
  rows,
  hasCompare,
  describeRow,
  description,
  rootStyle,
  seriesLabel,
  compareLabel,
  formatValue,
  size,
  labelSize,
  aspect,
  color,
  compareColor,
  levels,
  showLegend,
  animate,
  colors,
  title,
  className,
}) {
  // The label metrics follow the label size (the module defaults are for the 12px label)
  const CHAR_WIDTH = labelSize * 0.55;
  const LINE_HEIGHT = Math.round(labelSize * 1.2);
  const fill = size === 'fill';
  const [canvasRef, box] = useElementSize();
  const [active, setActive] = useState(null); // { index, anchor }

  // ---- Geometry, in real pixels ------------------------------------------------------------
  const { width, height } = box;
  const count = rows.length;
  const labelLines = rows.map((row) => wrapLabel(row.label));
  const cx0 = width / 2;
  const cy0 = height / 2;
  const ready = width > 0 && height > 0;

  const angleOf = (index) => -Math.PI / 2 + (index * 2 * Math.PI) / count;

  // The largest radius at which every label still fits inside the box. Each label sits just
  // outside its corner, so each axis gives a limit; the web takes the smallest one.
  const MARGIN = 2;
  let radius = Infinity;
  rows.forEach((_, index) => {
    const cos = Math.cos(angleOf(index));
    const sin = Math.sin(angleOf(index));
    const lines = labelLines[index];
    const textWidth = Math.max(...lines.map((line) => line.length)) * CHAR_WIDTH;
    const block = lines.length * LINE_HEIGHT;
    const t = (sin + 1) / 2;
    // Across: a label on the right or left reaches textWidth + gap past the corner, a centred one
    // reaches half its width to each side
    if (cos > 0.25 || cos < -0.25) radius = Math.min(radius, (width / 2 - MARGIN - LABEL_GAP - textWidth) / Math.abs(cos));
    else if (Math.abs(cos) > 0.01) radius = Math.min(radius, (width / 2 - MARGIN - textWidth / 2) / Math.abs(cos));
    // Down: below the centre the label hangs below the corner, above it stands above
    if (sin > 0.01) radius = Math.min(radius, (height / 2 - MARGIN - LABEL_GAP * sin - block * t) / sin);
    else if (sin < -0.01) radius = Math.min(radius, (height / 2 - MARGIN - LABEL_GAP * -sin - block * (1 - t)) / -sin);
  });
  radius = Math.max(24, Number.isFinite(radius) ? radius : Math.min(width, height) / 3);
  const pointAt = (index, share) => ({
    x: cx0 + Math.cos(angleOf(index)) * radius * share,
    y: cy0 + Math.sin(angleOf(index)) * radius * share,
  });
  const pathOf = (points) => `${points.map((p, i) => `${i ? 'L' : 'M'}${round1(p.x)} ${round1(p.y)}`).join(' ')} Z`;

  const ringCount = Math.max(1, Math.round(levels));
  const rings = Array.from({ length: ringCount }, (_, k) =>
    pathOf(rows.map((_, index) => pointAt(index, (k + 1) / ringCount)))
  );
  const mainPoints = rows.map((row, index) => pointAt(index, row.value / row.max));
  const comparePoints = hasCompare
    ? rows.map((row, index) => (row.compare !== null ? pointAt(index, row.compare / row.max) : pointAt(index, 0)))
    : null;

  const show = (index, node) => {
    const rect = node.getBoundingClientRect();
    setActive({ index, anchor: { x: rect.left + rect.width / 2, top: rect.top + rect.height / 2 - 4, bottom: rect.bottom } });
  };
  const hide = () => setActive(null);
  const activeRow = active ? rows[active.index] : null;

  const legendVisible = showLegend === true || (showLegend === 'auto' && hasCompare);

  return (
    <figure
      className={cx('cc rc', className)}
      style={rootStyle}
      data-fill={fill ? 'true' : 'false'}
      data-animate={animate ? 'true' : 'false'}
    >
      <figcaption className="cc-sr-only">{description}</figcaption>

      <div
        ref={canvasRef}
        className="rc__canvas"
        style={fill ? undefined : { maxWidth: size, aspectRatio: aspect !== 1 ? String(aspect) : undefined }}
      >
        {ready && (
          <>
            <svg
              className="rc__svg"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={description || undefined}
              focusable="false"
            >
              <g className="rc__web">
                {rings.map((d, k) => (
                  <path key={k} className="rc__ring" d={d} />
                ))}
                {rows.map((row, index) => {
                  const end = pointAt(index, 1);
                  return <line key={row.key} className="rc__spoke" x1={cx0} y1={cy0} x2={round1(end.x)} y2={round1(end.y)} />;
                })}
                {rows.map((row, index) => {
                  const cos = Math.cos(angleOf(index));
                  const sin = Math.sin(angleOf(index));
                  const spot = pointAt(index, 1);
                  const lx = spot.x + cos * LABEL_GAP;
                  const ly = spot.y + sin * LABEL_GAP;
                  const lines = labelLines[index];
                  const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
                  const block = lines.length * LINE_HEIGHT;
                  const top = ly - block * (1 - (sin + 1) / 2);
                  return (
                    <text key={row.key} className="rc__label" x={round1(lx)} y={round1(top)} textAnchor={anchor} style={{ fontSize: labelSize }}>
                      {lines.map((line, k) => (
                        <tspan key={k} x={round1(lx)} dy={k === 0 ? 11 : LINE_HEIGHT}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  );
                })}
              </g>

              {comparePoints && (
                <path
                  className="rc__shape rc__shape--compare"
                  d={pathOf(comparePoints)}
                  style={{ transformOrigin: `${cx0}px ${cy0}px`, '--i': 1 }}
                />
              )}
              <path
                className="rc__shape rc__shape--main"
                d={pathOf(mainPoints)}
                style={{ transformOrigin: `${cx0}px ${cy0}px`, '--i': 0 }}
              />
              {mainPoints.map((point, index) => (
                <circle
                  key={rows[index].key}
                  className="rc__dot"
                  cx={round1(point.x)}
                  cy={round1(point.y)}
                  r={active && active.index === index ? 6 : 4}
                  style={{ '--i': 2 }}
                />
              ))}
            </svg>

            {/* One control per corner, so the tooltip is reachable by keyboard too */}
            <div className="rc__hits">
              {rows.map((row, index) => (
                <button
                  key={row.key}
                  type="button"
                  className="rc__hit"
                  style={{ left: round1(mainPoints[index].x), top: round1(mainPoints[index].y) }}
                  aria-label={describeRow(row)}
                  onPointerEnter={(event) => show(index, event.currentTarget)}
                  onPointerLeave={hide}
                  onFocus={(event) => show(index, event.currentTarget)}
                  onBlur={hide}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {legendVisible && (
        <ul className="rc__legend" aria-label={title ? `${title}, legend` : 'Legend'}>
          <li className="rc__legend-item">
            <svg className="rc__swatch" width="20" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="19" y2="4" className="rc__swatch-line rc__swatch-line--main" />
            </svg>
            {seriesLabel}
          </li>
          {hasCompare && (
            <li className="rc__legend-item">
              <svg className="rc__swatch" width="20" height="8" aria-hidden="true">
                <line x1="1" y1="4" x2="19" y2="4" className="rc__swatch-line rc__swatch-line--compare" />
              </svg>
              {compareLabel}
            </li>
          )}
        </ul>
      )}

      {active && activeRow && (
        <ChartTip anchor={active.anchor} variant="list">
          <TipTitle>{activeRow.label}</TipTitle>
          <TipRow
            color={colors && colors.fill ? colors.fill : color || 'var(--ds-accent)'}
            label={seriesLabel}
            value={`${formatValue(activeRow.value)} / ${formatValue(activeRow.max)}`}
          />
          {activeRow.compare !== null && (
            <TipRow
              color={colors && colors.compare ? colors.compare : compareColor || 'var(--ds-muted)'}
              label={compareLabel}
              value={formatValue(activeRow.compare)}
            />
          )}
        </ChartTip>
      )}

      <div className="cc-sr-only">
        <table>
          {title ? <caption>{title}</caption> : null}
          <thead>
            <tr>
              <th scope="col">Skill</th>
              <th scope="col">{seriesLabel}</th>
              <th scope="col">Out of</th>
              {hasCompare ? <th scope="col">{compareLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>{formatValue(row.value)}</td>
                <td>{formatValue(row.max)}</td>
                {hasCompare ? <td>{row.compare !== null ? formatValue(row.compare) : ''}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
