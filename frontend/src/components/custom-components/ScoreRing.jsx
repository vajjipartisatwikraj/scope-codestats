import React from 'react';
import './shared.css';
import './ScoreRing.css';
import Gauge from './Gauge';
import AnimatedNumber from './AnimatedNumber';
import { clamp, cx, finiteOr } from './chartUtils';
import { toneColors, toneForShare } from './tone';

/**
 * ScoreRing: a small closed ring that shows one score, with the number counting up inside it.
 *
 * It is a thin wrapper over Gauge (variant 'arc', a full 360 degree sweep that starts at
 * 12 o'clock), so it has the same meter semantics and the same entrance and takes the colour
 * from the same tokens. What it adds is the API of the old results ring: a score, a size, a
 * tone and a caption, and a number in the middle that is an AnimatedNumber.
 *
 * Props
 *   value (0), max (100)   the score and the top of its scale
 *   size (56)              px, the diameter. The stroke is 9% of it (at least 4px).
 *   label                  the name of the ring, spoken by assistive technology ("Fluency score")
 *   caption                a short line under the number inside the ring ("of 100", "Fluency").
 *                          Shown from size 96 up; below that it is only spoken.
 *   tone ('accent')        'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'auto', or any
 *                          CSS colour. 'auto' bands the score: from 70% success, from 40% warning,
 *                          below that danger. The number is always printed, so colour never
 *                          carries the score alone.
 *   decimals (0)           digits of the number in the middle
 *   thickness             px, overrides the stroke
 *   animate (true)         the ring appears and the number counts up once
 *   className, style       passed to the root element
 *
 * CSS variables: the Gauge ones (--ga-fill --ga-track --ga-text --ga-label)
 */

export default function ScoreRing({
  value = 0,
  max = 100,
  size = 56,
  label,
  caption,
  tone = 'accent',
  decimals = 0,
  thickness,
  animate = true,
  className,
  style,
}) {
  const top = finiteOr(max, 100) > 0 ? finiteOr(max, 100) : 100;
  const current = clamp(finiteOr(value, 0), 0, top);
  const resolvedTone = tone === 'auto' ? toneForShare(current / top) : tone;
  const stroke = thickness !== undefined ? thickness : Math.max(4, size * 0.09);
  // The Gauge draws 100 units of radius, so a stroke in px becomes units of the 200 unit width
  const strokeUnits = Math.round(((stroke * 200) / size) * 10) / 10;
  const showCaption = Boolean(caption) && size >= 96;
  const rounded = Math.round(current * 10 ** decimals) / 10 ** decimals;

  return (
    <Gauge
      className={cx('sring', className)}
      style={{ '--sring-size': `${size}px`, width: size, flex: 'none', ...style }}
      variant="arc"
      sweep={360}
      rotation={180}
      size={size}
      thickness={strokeUnits}
      min={0}
      max={top}
      value={current}
      animate={animate}
      label={label}
      valueDescription={`${rounded} out of ${top}${caption ? `, ${caption}` : ''}`}
      colors={{ fill: toneColors(resolvedTone).fill }}
    >
      <span className="sring__value">
        <AnimatedNumber value={rounded} decimals={decimals} duration={animate ? 950 : 0} delay={animate ? 240 : 0} />
      </span>
      {showCaption ? <span className="sring__caption">{caption}</span> : null}
    </Gauge>
  );
}
