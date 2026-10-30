import React from 'react';
import './shared.css';
import './Gauge.css';
import { clamp, colorVars, cx, finiteOr, formatNumber } from './chartUtils';

/**
 * Gauge: a dial that shows one value on a scale, drawn as a row of ticks or as a continuous arc.
 * Use it for a real value on a real scale (a score out of 5, a percentage of a goal).
 *
 * Value
 *   value (0), min (0), max (100)
 *   formatValue(value)    text for the value; default Indian digit grouping, at most 2 decimals
 *
 * Shape
 *   sweep (180)       how much of a circle the dial covers, in degrees (up to 360).
 *                     180 is a half circle opening downwards, 270 a three-quarter dial.
 *   rotation (0)      turns the dial: 0 is symmetric about 12 o'clock, 90 would face right
 *   variant ('ticks') 'ticks' (separate rounded ticks) or 'arc' (one continuous stroke)
 *   size (240)        the dial never grows wider than this many px, and shrinks with its container
 *   ticks (40), tickLength (16), tickWidth (4.5)    tick count and size, in dial units
 *   thickness (14)    stroke width of the arc variant, in dial units
 *   rounded (true)    round line ends
 *   (Dial units: the dial is drawn 100 units in radius and scaled to `size`.)
 *
 * Content in the middle
 *   children          a node, or a function ({ value, percent, text }) => node, shown at the
 *                     centre of the dial. Default: the formatted value.
 *
 * Look
 *   animate (true)    the filled ticks light up one after another on mount
 *   glide (false)     arc variant: the fill sweeps in along the arc on mount and glides to a new value
 *                     when alue changes, instead of fading in and jumping
 *   colors            { fill, track, text, label }, any CSS colour
 *
 * Accessibility
 *   label             the name of the dial (aria-label)
 *   valueDescription  the spoken value; default "<value> out of <max>"
 *   className, style  passed to the root element
 *
 * CSS variables: --ga-fill --ga-track --ga-text --ga-label
 */

const COLOR_VARS = {
  fill: '--ga-fill',
  track: '--ga-track',
  text: '--ga-text',
  label: '--ga-label',
};

const RADIUS = 100;

const round3 = (n) => Math.round(n * 1000) / 1000;

/** A point on a circle around (0, 0). Angles are degrees clockwise from 12 o'clock. */
function pointAt(angle, radius) {
  const rad = (angle * Math.PI) / 180;
  return { x: round3(radius * Math.sin(rad)), y: round3(-radius * Math.cos(rad)) };
}

function arcPath(radius, fromAngle, span) {
  const length = Math.min(Math.abs(span), 359.99);
  const start = pointAt(fromAngle, radius);
  const end = pointAt(fromAngle + length, radius);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${length > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

export default function Gauge({
  value = 0,
  min = 0,
  max = 100,
  formatValue = formatNumber,
  sweep = 180,
  rotation = 0,
  variant = 'ticks',
  size = 240,
  ticks = 40,
  tickLength = 16,
  tickWidth = 4.5,
  thickness = 14,
  rounded = true,
  children,
  animate = true,
  glide = false,
  colors,
  label,
  valueDescription,
  className,
  style,
}) {
  const range = max - min || 1;
  const current = clamp(finiteOr(value, min), Math.min(min, max), Math.max(min, max));
  const percent = clamp((current - min) / range, 0, 1);
  const text = formatValue(current);

  const totalSweep = clamp(finiteOr(sweep, 180), 10, 360);
  const startAngle = rotation - totalSweep / 2;
  const endAngle = rotation + totalSweep / 2;

  // The box that holds the dial, found by walking along its outline. The centre is included so
  // the middle content always has room, whatever the sweep is.
  const pad = (variant === 'arc' ? thickness : tickWidth) / 2 + 1;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  const grow = (point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  };
  for (let angle = startAngle; angle < endAngle; angle += 2) grow(pointAt(angle, RADIUS));
  grow(pointAt(endAngle, RADIUS));

  const boxWidth = round3(maxX - minX + pad * 2);
  const boxHeight = round3(maxY - minY + pad * 2);
  const boxLeft = round3(minX - pad);
  const boxTop = round3(minY - pad);
  const centerLeft = (-boxLeft / boxWidth) * 100;
  const centerTop = (-boxTop / boxHeight) * 100;

  let marks;
  if (variant === 'arc') {
    const arcRadius = RADIUS - thickness / 2;
    marks = (
      <>
        <path className="ga__track" d={arcPath(arcRadius, startAngle, totalSweep)} strokeWidth={thickness} />
        {percent > 0 &&
          (glide ? (
            // The whole arc, drawn as a dash of `percent` of its length: it sweeps in on mount and glides when the value changes
            <path className="ga__fill" d={arcPath(arcRadius, startAngle, totalSweep)} pathLength={1} strokeWidth={thickness} style={{ strokeDasharray: `${round3(percent)} 2` }} />
          ) : (
            <path className="ga__fill" d={arcPath(arcRadius, startAngle, totalSweep * percent)} strokeWidth={thickness} />
          ))}
      </>
    );
  } else {
    const count = Math.max(2, Math.round(ticks));
    const steps = totalSweep >= 360 ? count : count - 1;
    const lit = percent <= 0 ? 0 : Math.max(1, Math.round(percent * count));
    const innerRadius = RADIUS - tickLength;
    marks = Array.from({ length: count }, (_, index) => {
      const angle = startAngle + (index / steps) * totalSweep;
      const from = pointAt(angle, innerRadius);
      const to = pointAt(angle, RADIUS);
      return (
        <line
          key={index}
          className="ga__tick"
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          strokeWidth={tickWidth}
          data-lit={index < lit ? 'true' : 'false'}
          style={{ '--i': index }}
        />
      );
    });
  }

  const content =
    typeof children === 'function'
      ? children({ value: current, percent, text })
      : children !== undefined && children !== null
        ? children
        : <span className="ga__value">{text}</span>;

  const rootStyle = {
    '--ga-size': `${size}px`,
    // The number of lit ticks: the sweep of the entrance is spread over them
    '--n': Math.max(1, Math.round(percent * Math.max(2, Math.round(ticks)))),
    ...colorVars(colors, COLOR_VARS),
    ...style,
  };

  return (
    <div
      className={cx('cc ga', className)}
      style={rootStyle}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={current}
      aria-valuetext={valueDescription || `${text} out of ${formatValue(max)}`}
      data-animate={animate ? 'true' : 'false'}
      data-glide={glide ? 'true' : 'false'}
      data-round={rounded ? 'true' : 'false'}
    >
      <svg
        className="ga__svg"
        viewBox={`${boxLeft} ${boxTop} ${boxWidth} ${boxHeight}`}
        aria-hidden="true"
        focusable="false"
      >
        {marks}
      </svg>
      <div
        className="ga__content"
        data-anchor={totalSweep <= 180 ? 'bottom' : 'center'}
        style={{ left: `${round3(centerLeft)}%`, top: `${round3(centerTop)}%` }}
      >
        {content}
      </div>
    </div>
  );
}
