import React, { forwardRef } from 'react';
import './shared.css';
import './WaveformBars.css';
import { clamp, cx, finiteOr } from './chartUtils';

/**
 * WaveformBars: a still waveform of rounded bars, drawn with HTML and CSS (no canvas). Use it for
 * a recorded clip (with `progress` it shows how much has been played) or as a decorative wave.
 * The live microphone version is AudioWaveform.
 *
 * Props
 *   values        number[] in 0..1: the height of each bar (a bar is never shorter than a dot)
 *   bars          when given, `values` is resampled to this many bars (the tallest value of each
 *                 slice wins), so a clip of any length fits a box of any width
 *   progress      0..1. When given, the part up to it is drawn in `playedColor`, sweeping smoothly
 *                 (the edge cuts through a bar). It is published as the CSS variable --wb-progress
 *                 on the root, so a player can update it from an animation loop without rendering:
 *                 `ref.current.style.setProperty('--wb-progress', String(share))`
 *   height (40)   px
 *   gap (3)       px between bars
 *   color         colour of the bars; default 'var(--ds-bar-muted)'
 *   playedColor   colour of the played part; default 'var(--ds-accent)'
 *   label         the text equivalent, for example "Recording, 0:42". Without it the wave is hidden
 *                 from assistive technology (a purely decorative wave)
 *   className, style   passed to the root element (the ref is the root element too)
 *
 * Also exported from this file: resamplePeaks(values, count)
 *
 * CSS variables: --wb-color --wb-played --wb-progress
 */

/** `values` shrunk (tallest of each slice) or stretched (nearest) to exactly `count` numbers. */
export function resamplePeaks(values, count) {
  const source = Array.isArray(values) ? values.map((v) => clamp(finiteOr(v, 0), 0, 1)) : [];
  const target = Math.max(0, Math.floor(count));
  if (target === 0 || source.length === 0) return [];
  if (source.length === target) return source;
  return Array.from({ length: target }, (_, index) => {
    const from = (index * source.length) / target;
    const to = ((index + 1) * source.length) / target;
    if (to - from <= 1) return source[Math.min(source.length - 1, Math.floor(from + (to - from) / 2))];
    let peak = 0;
    for (let k = Math.floor(from); k < Math.min(source.length, Math.ceil(to)); k += 1) peak = Math.max(peak, source[k]);
    return peak;
  });
}

const WaveformBars = forwardRef(function WaveformBars(
  { values = [], bars, progress, height = 40, gap = 3, color, playedColor, label, className, style },
  ref
) {
  const shown = typeof bars === 'number' ? resamplePeaks(values, bars) : resamplePeaks(values, values.length);
  const hasProgress = progress !== undefined && progress !== null;
  const share = hasProgress ? clamp(finiteOr(progress, 0), 0, 1) : 0;

  const layer = (name) => (
    <span className={cx('wb__layer', name)} aria-hidden="true">
      {shown.map((value, index) => (
        <span key={index} className="wb__bar" style={{ height: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      ))}
    </span>
  );

  const rootStyle = {
    '--wb-height': `${height}px`,
    '--wb-gap': `${gap}px`,
    ...(color ? { '--wb-color': color } : null),
    ...(playedColor ? { '--wb-played': playedColor } : null),
    ...(hasProgress ? { '--wb-progress': share } : null),
    ...style,
  };

  const text = label ? (hasProgress ? `${label}, ${Math.round(share * 100)}% played` : label) : undefined;

  return (
    <span
      ref={ref}
      className={cx('cc wb', className)}
      style={rootStyle}
      data-progress={hasProgress ? 'true' : 'false'}
      {...(text ? { role: 'img', 'aria-label': text } : { 'aria-hidden': 'true' })}
    >
      {layer('wb__layer--base')}
      {hasProgress ? layer('wb__layer--played') : null}
    </span>
  );
});

export default WaveformBars;
