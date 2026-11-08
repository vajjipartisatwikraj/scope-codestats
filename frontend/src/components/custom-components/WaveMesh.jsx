import React, { useEffect, useRef } from 'react';
import './WaveMesh.css';

/**
 * WaveMesh: a flowing sheet of fine triangles with glowing nodes, like a wave of light, drawn on one canvas.
 * A decorative background (aria-hidden); it fills its positioned parent.
 *
 * Props
 *   energy     0 to 1, how lively the wave is: taller, faster and brighter as it goes up. It eases to a new
 *              value instead of jumping. Default 0.5.
 *   fps        frames per second while it runs. Default 30.
 *   className  extra class for the canvas.
 *
 * Colours: five CSS variables on the canvas or any parent (hex values), each with a default:
 *   --wm-bg (#0d0d0f, the colour of the surface behind the canvas), --wm-deep (#0a5a94), --wm-mid (#0585e0),
 *   --wm-bright (#66bfff), --wm-peak (#e6f5ff)
 *
 * How it looks real: the sheet is drawn from the far edge to the near one, and each strip is first filled with
 * a faint body of the same blue, so a near hill hides what is behind it and the far end melts into the
 * background instead of showing through. Brightness changes smoothly (eight shades of one blue ramp), with
 * the crests and the slopes facing you lit.
 *
 * Light on purpose: 84 by 30 points, about 7,000 lines in at most eight strokes per strip, the pixel ratio
 * capped at 1.5, no per-frame allocation. It only runs while it is on screen and the tab is visible. With
 * reduced motion it draws one still frame and never animates.
 * Text equivalent: none needed; the picture carries no information.
 */

const COLS = 84;
const ROWS = 30;
const LEVELS = 8;
const POINTS = COLS * ROWS;
const STRIP_LINES = (COLS - 1) * 4 + 1;
const STILL_TIME = 2.6;

const hexToRgb = (value, fallback) => {
  const match = /^#?([0-9a-f]{6})$/i.exec((value || '').trim());
  const hex = match ? match[1] : fallback;
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
};

const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const rgba = (c, alpha) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;
const rgb = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

export default function WaveMesh({ energy = 0.5, fps = 30, className = '' }) {
  const canvasRef = useRef(null);
  const energyRef = useRef(energy);
  energyRef.current = energy;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const style = window.getComputedStyle(canvas);
    const background = hexToRgb(style.getPropertyValue('--wm-bg'), '0d0d0f');
    const deep = hexToRgb(style.getPropertyValue('--wm-deep'), '0a5a94');
    const mid = hexToRgb(style.getPropertyValue('--wm-mid'), '0585e0');
    const bright = hexToRgb(style.getPropertyValue('--wm-bright'), '66bfff');
    const peak = hexToRgb(style.getPropertyValue('--wm-peak'), 'e6f5ff');

    // One ramp of blue, dim to bright, sampled at eight levels: [position, colour, alpha]
    const ramp = [
      [0, deep, 0.4],
      [0.38, mix(deep, mid, 0.6), 0.62],
      [0.62, mid, 0.8],
      [0.84, bright, 0.92],
      [1, peak, 1],
    ];
    const sample = (f) => {
      for (let k = 1; k < ramp.length; k += 1) {
        if (f <= ramp[k][0]) {
          const [p0, c0, a0] = ramp[k - 1];
          const [p1, c1, a1] = ramp[k];
          const u = (f - p0) / (p1 - p0);
          return { color: mix(c0, c1, u), alpha: a0 + (a1 - a0) * u };
        }
      }
      return { color: peak, alpha: 1 };
    };
    const levels = Array.from({ length: LEVELS }, (_, n) => {
      const f = (n + 0.5) / LEVELS;
      const s = sample(f);
      return { stroke: rgba(s.color, s.alpha), glow: rgba(s.color, 0.09), width: 0.4 + 0.35 * f };
    });
    const dot = [mid, bright, peak];

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heights = new Float32Array(POINTS);
    const xs = new Float32Array(POINTS);
    const ys = new Float32Array(POINTS);
    const lights = new Float32Array(POINTS);
    // A fixed, scattered phase for the twinkle of each node
    const phases = Float32Array.from({ length: POINTS }, (_, n) => {
      const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return (v - Math.floor(v)) * Math.PI * 2;
    });
    const lines = Array.from({ length: LEVELS }, () => new Float32Array(STRIP_LINES * 4));
    const counts = new Int32Array(LEVELS);

    let width = 1;
    let height = 1;
    let frameId = 0;
    let last = 0;
    let time = STILL_TIME;
    let current = energyRef.current;
    let onScreen = false;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(box.width));
      height = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const addLine = (a, b) => {
      const light = (lights[a] + lights[b]) * 0.5;
      const level = Math.min(LEVELS - 1, Math.floor(light * LEVELS));
      const store = lines[level];
      const at = counts[level] * 4;
      store[at] = xs[a];
      store[at + 1] = ys[a];
      store[at + 2] = xs[b];
      store[at + 3] = ys[b];
      counts[level] += 1;
    };

    const draw = (t, lively) => {
      ctx.clearRect(0, 0, width, height);
      const amplitude = height * 0.23 * (0.8 + 0.45 * lively);
      const spread = width * 0.62;
      const boost = 0.85 + 0.3 * lively;

      // The surface: three waves running in different directions, seen in perspective
      for (let j = 0; j < ROWS; j += 1) {
        const depth = j / (ROWS - 1);
        const scale = 1 / (1 + 0.47 * depth);
        const base = height * (0.95 - 0.49 * ((1 - scale) / 0.32));
        const z = depth * 2;
        for (let i = 0; i < COLS; i += 1) {
          const x = ((i / (COLS - 1)) * 2 - 1) * 1.3;
          const h =
            0.55 * Math.sin(1.7 * x + 1.3 * z - t * 0.5) +
            0.28 * Math.sin(3.1 * x - 2.1 * z + t * 0.75 + 1.7) +
            0.12 * Math.sin(6 * x + 3.4 * z - t * 1.25 + 0.4);
          const at = j * COLS + i;
          heights[at] = h;
          xs[at] = width / 2 + x * spread * scale;
          ys[at] = base - h * amplitude * scale;
        }
      }

      // Light: crests are bright, and so is a slope that faces the viewer; the far end fades into the dark
      for (let j = 0; j < ROWS; j += 1) {
        const fade = 1 - 0.5 * (j / (ROWS - 1));
        for (let i = 0; i < COLS; i += 1) {
          const at = j * COLS + i;
          const crest = Math.min(1, Math.max(0, (heights[at] + 0.95) / 1.9));
          const facing = j < ROWS - 1 ? Math.min(1, Math.max(0, 0.5 + (heights[at + COLS] - heights[at]) * 3.4)) : 0.5;
          lights[at] = Math.min(0.999, (0.2 + 0.5 * Math.pow(crest, 1.4) + 0.62 * facing * (0.3 + 0.7 * crest)) * fade * boost);
        }
      }

      // Strip by strip from the far edge to the near one: a faint body first (it hides what is behind), then
      // the lines of the strip, then its nodes
      for (let j = ROWS - 2; j >= 0; j -= 1) {
        const near = j * COLS;
        const far = near + COLS;

        let average = 0;
        for (let i = 0; i < COLS; i += 1) average += lights[near + i];
        average /= COLS;
        ctx.beginPath();
        ctx.moveTo(xs[far], ys[far]);
        for (let i = 1; i < COLS; i += 1) ctx.lineTo(xs[far + i], ys[far + i]);
        for (let i = COLS - 1; i >= 0; i -= 1) ctx.lineTo(xs[near + i], ys[near + i]);
        ctx.closePath();
        ctx.fillStyle = rgb(mix(background, deep, 0.02 + 0.2 * average));
        ctx.fill();

        counts.fill(0);
        for (let i = 0; i < COLS - 1; i += 1) {
          addLine(near + i, near + i + 1);
          addLine(near + i, far + i);
          addLine(near + i + 1, far + i);
          if (j === ROWS - 2) addLine(far + i, far + i + 1);
        }
        addLine(near + COLS - 1, far + COLS - 1);
        for (let level = 0; level < LEVELS; level += 1) {
          const total = counts[level];
          if (!total) continue;
          const store = lines[level];
          ctx.beginPath();
          for (let n = 0; n < total; n += 1) {
            const at = n * 4;
            ctx.moveTo(store[at], store[at + 1]);
            ctx.lineTo(store[at + 2], store[at + 3]);
          }
          if (level >= LEVELS - 3) {
            // a soft glow round the brightest lines
            ctx.strokeStyle = levels[level].glow;
            ctx.lineWidth = levels[level].width * 3.2;
            ctx.stroke();
          }
          ctx.strokeStyle = levels[level].stroke;
          ctx.lineWidth = levels[level].width;
          ctx.stroke();
        }

        // The nodes: the bright ones are dots, and a few of them twinkle
        for (let i = 0; i < COLS; i += 1) {
          const at = near + i;
          const light = lights[at];
          const sparkle = Math.pow(Math.max(0, Math.sin(t * 1.5 + phases[at])), 14);
          if (light < 0.62 && sparkle < 0.45) continue;
          const size = 0.8 + 1.5 * sparkle + 0.4 * light;
          ctx.fillStyle = rgba(dot[sparkle > 0.35 ? 2 : light > 0.7 ? 1 : 0], Math.min(1, 0.25 + 0.6 * light + 0.5 * sparkle));
          ctx.fillRect(xs[at] - size / 2, ys[at] - size / 2, size, size);
        }
      }
    };

    const stop = () => {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const tick = (now) => {
      frameId = window.requestAnimationFrame(tick);
      const gap = now - last;
      if (gap < 1000 / fps - 2) return;
      last = now;
      const seconds = Math.min(gap, 100) / 1000;
      current += (energyRef.current - current) * Math.min(1, seconds * 2.5);
      time += seconds * (0.6 + 0.75 * current);
      draw(time, current);
    };

    const start = () => {
      if (reduced || frameId || !onScreen || document.hidden) return;
      last = performance.now();
      frameId = window.requestAnimationFrame(tick);
    };

    resize();
    draw(STILL_TIME, reduced ? 0.6 : current);

    const sizeObserver = new ResizeObserver(() => {
      resize();
      draw(time, current);
    });
    sizeObserver.observe(canvas);

    const viewObserver = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0 }
    );
    viewObserver.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fps]);

  return <canvas ref={canvasRef} className={`wave-mesh ${className}`.trim()} aria-hidden="true" />;
}
