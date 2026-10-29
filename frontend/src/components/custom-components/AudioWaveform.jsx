import React, { useEffect, useRef } from 'react';
import './shared.css';
import './AudioWaveform.css';
import { cx } from './chartUtils';
import { barCountFor, barHeightFor, levelFromRms, rmsOf, shapeLevel, smoothLevel } from '../../utils/waveformMath';

/**
 * AudioWaveform: a live voice waveform. Rounded vertical bars, centred on a midline, that glide
 * to the left as you speak. With no signal it shows a row of dots.
 *
 * It reads a Web Audio `AnalyserNode` inside its own animation loop and draws on a canvas, so a
 * recording never causes React renders. Each bar is the loudness (RMS, on a decibel scale) of one
 * short slice of audio: a new bar enters on the right every `sampleIntervalMs`. The maths is in
 * utils/waveformMath.js.
 *
 * A canvas cannot read CSS variables, so the colours are resolved with getComputedStyle on the
 * component itself and resolved again when the theme changes (the `data-theme` attribute of
 * <html>). `color` can therefore be any CSS colour or a 'var(--ds-...)' string.
 *
 * Props
 *   analyser (null)         the AnalyserNode to read; without one the dots stay still
 *   active (true)           false freezes the display on idle dots
 *   height (64)             px
 *   barWidth (6), gap (5)   bar thickness and the space between bars, px
 *   color                   bar colour; default 'var(--ds-danger)'
 *   idleColor               colour of the dots when there is no signal; default 'var(--ds-bar-muted)'
 *   sampleIntervalMs (60)   how often a new bar is produced
 *   label ('Microphone level')   the text equivalent (the canvas is role="img" with this name)
 *   className, style        passed to the root element
 *
 * Reduced motion: bars still arrive, but the row steps instead of gliding.
 *
 * CSS variables: --aw-color --aw-idle
 */

/** Reads the computed colour of an element once its `color` is set to a (possibly var()) value. */
const readColor = (node, fallback) => {
  if (!node) return fallback;
  const value = window.getComputedStyle(node).color;
  return value || fallback;
};

export default function AudioWaveform({
  analyser = null,
  active = true,
  height = 64,
  barWidth = 6,
  gap = 5,
  color = 'var(--ds-danger)',
  idleColor = 'var(--ds-bar-muted)',
  sampleIntervalMs = 60,
  label = 'Microphone level',
  className,
  style,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const colorRef = useRef(null);
  const idleRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const live = Boolean(analyser && active);
    const step = barWidth + gap;

    let width = 0;
    let count = 1;
    let levels = []; // oldest -> newest; one extra entry for the bar scrolling in
    let raf = 0;
    let barColor = 'transparent'; // replaced by resolveColors() before the first draw
    let dotColor = 'transparent';

    // Signal accumulated between two bars
    let sumSquares = 0;
    let frames = 0;
    let lastPush = performance.now();
    let lastLevel = 0;
    const samples = analyser ? new Float32Array(analyser.fftSize) : null;

    const resolveColors = () => {
      barColor = readColor(colorRef.current, barColor);
      dotColor = readColor(idleRef.current, dotColor);
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, Math.floor(wrap.clientWidth));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      count = barCountFor(width, barWidth, gap) + 2;
      // Keep the most recent history when the width changes
      levels = [...new Array(Math.max(0, count - levels.length)).fill(0), ...levels].slice(-count);
    };

    const draw = (frac) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineWidth = barWidth;
      const paint = live ? barColor : dotColor;
      ctx.strokeStyle = paint;
      ctx.fillStyle = paint;

      const midY = height / 2;
      const fadeZone = step * 3;

      for (let i = 0; i < levels.length; i += 1) {
        const age = levels.length - 1 - i; // 0 = newest
        const x = width - barWidth / 2 - (age + frac) * step + step;
        if (x < -barWidth || x > width + barWidth) continue;

        // The newest bar grows in as it arrives instead of popping
        const grow = age === 0 ? Math.min(1, 0.25 + frac * 1.5) : 1;
        const h = barHeightFor(levels[i] * grow, barWidth, height);
        const half = Math.max(0, h / 2 - barWidth / 2);

        // Bars fade out towards the left edge
        ctx.globalAlpha = Math.min(1, Math.max(0, x / fadeZone));

        ctx.beginPath();
        if (half < 0.5) {
          // A silent bar is a dot. Filling a circle is drawn reliably everywhere, whereas a
          // zero-length rounded stroke is not.
          ctx.arc(x, midY, barWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.moveTo(x, midY - half);
          ctx.lineTo(x, midY + half);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const push = (level) => {
      levels.push(level);
      if (levels.length > count) levels.shift();
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);

      analyser.getFloatTimeDomainData(samples);
      const rms = rmsOf(samples);
      sumSquares += rms * rms;
      frames += 1;

      const elapsed = now - lastPush;
      if (elapsed >= sampleIntervalMs) {
        // Several intervals may have passed if the tab was in the background
        const due = Math.min(count, Math.floor(elapsed / sampleIntervalMs));
        const reading = levelFromRms(Math.sqrt(sumSquares / Math.max(1, frames)));
        for (let n = 0; n < due; n += 1) {
          const value = n === 0 ? reading : 0;
          lastLevel = smoothLevel(lastLevel, shapeLevel(value));
          push(lastLevel);
        }
        lastPush = elapsed > sampleIntervalMs * count ? now : lastPush + due * sampleIntervalMs;
        sumSquares = 0;
        frames = 0;
      }

      const frac = reducedMotion ? 0 : Math.min(1, (now - lastPush) / sampleIntervalMs);
      draw(frac);
    };

    resolveColors();
    resize();

    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            resize();
            if (!live) draw(0);
          })
        : null;
    if (observer) observer.observe(wrap);

    // A theme change swaps every --ds-* colour: read them again (and repaint when idle, because a
    // live loop repaints by itself)
    const themeWatcher =
      typeof MutationObserver === 'function'
        ? new MutationObserver(() => {
            resolveColors();
            if (!live) draw(0);
          })
        : null;
    if (themeWatcher) themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (live) {
      lastPush = performance.now();
      raf = requestAnimationFrame(tick);
    } else {
      draw(0); // idle dots
    }

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
      if (themeWatcher) themeWatcher.disconnect();
    };
  }, [analyser, active, height, barWidth, gap, color, idleColor, sampleIntervalMs]);

  return (
    <div
      ref={wrapRef}
      className={cx('cc aw', className)}
      role="img"
      aria-label={label}
      style={{ '--aw-color': color, '--aw-idle': idleColor, '--aw-height': `${height}px`, ...style }}
    >
      {/* Two empty probes whose computed `color` is the resolved bar and dot colour */}
      <span ref={colorRef} className="aw__probe aw__probe--bar" aria-hidden="true" />
      <span ref={idleRef} className="aw__probe aw__probe--idle" aria-hidden="true" />
      <canvas ref={canvasRef} className="aw__canvas" aria-hidden="true" />
    </div>
  );
}
