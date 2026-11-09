import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import './SpeakingFilm.css';

/**
 * SpeakingFilm: a short film about speaking, drawn in plain SVG and CSS. It loops while it is on screen:
 *
 *   speak   the outline of a face in profile draws itself, then sound waves leave its mouth, one arc after another
 *   wave    the face goes and the recorded answer appears as a waveform: every bar grows from a dot into its line,
 *           from the middle outwards, and then the bars move like a live voice
 *
 * A generic component. It fills the box it is put in (give the box a height, or set --sf-min) and keeps one size
 * through both steps. It starts when it is mostly in view and stops when it leaves. For people who asked for less
 * motion it shows the finished waveform and nothing moves. Decorative (aria-hidden): put the meaning in text next to it.
 *
 * Props
 *   className   added to the root element
 *   style       passed to the root element
 *
 * CSS variables (set them on the film or a parent); the defaults follow the app's theme:
 *   --sf-line         the face's outline          default --ds-text
 *   --sf-accent       the sound waves and the bars   default --ds-accent
 *   --sf-face-height  height of the face          default 11.5rem
 *   --sf-wave-height  height of the waveform      default 5rem
 *   --sf-min          minimum height of the film  default 11rem
 */

const BARS = 44;
// The recorded answer: bar heights (in rem, up to 5) from two slow waves, the same on every render
const WAVE = Array.from({ length: BARS }, (_, i) => +(5 * (0.16 + 0.78 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.19 + 0.6)))).toFixed(2));

// Times in ms. The drawing, the arcs and the bars run in CSS (SpeakingFilm.css).
const SPEAK_MS = 5000; // the face and its sound waves
const SWAP_MS = 400; // a step leaving
const WAVE_MS = 6000; // the waveform growing and moving

const EASE_OUT = [0.22, 1, 0.36, 1];

// ─── The face in profile and its sound waves (viewBox units) ────────────────────────────────────────────

// One line, from the forehead down the nose, lips and chin to the neck
const FACE =
  'M36 6C40 14 44 21 44.4 28C44.8 34 38 36 37.6 42C37.2 49 43 53 49 58C53 61 58 63 56.5 66.5C55.5 69.5 51.5 70 47.5 71.5' +
  'C44 72.5 46 74 49 77C50.5 79 48.5 80.5 44 82C40 83.5 35.5 84.5 34.6 85.6C37.5 86.5 43 88 47 90.5C50 92.5 47 94 43 95.5' +
  'C41 96.4 42 98 44.6 100C47.6 102.4 46.6 105.8 42 107.8C38 109.6 32 110.4 26 110.5C20 110.6 16 112 13.5 116C11.5 120 10 123 9.4 127';

// Three arcs round the mouth, each a little wider than the one before
const MOUTH = { x: 50, y: 86 };
const ARCS = [14, 24, 33].map((radius) => {
  const half = (38 * Math.PI) / 180;
  const point = (angle) => `${(MOUTH.x + 0.4 + radius * Math.cos(angle)).toFixed(1)} ${(MOUTH.y + radius * Math.sin(angle)).toFixed(1)}`;
  return `M${point(-half)}A${radius} ${radius} 0 0 1 ${point(half)}`;
});

function SpeakLayer() {
  return (
    <motion.div
      className="sf-layer"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: SWAP_MS / 1000, ease: 'easeIn' } }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      <svg className="sf-face" viewBox="4 2 80 128" focusable="false">
        <path className="sf-line" d={FACE} pathLength="1" />
        {ARCS.map((d, i) => (
          <path key={i} className="sf-arc" d={d} style={{ '--i': i, transformOrigin: `${MOUTH.x}px ${MOUTH.y}px` }} />
        ))}
      </svg>
    </motion.div>
  );
}

function WaveLayer({ reduced }) {
  return (
    <motion.div
      className="sf-layer"
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: SWAP_MS / 1000, ease: 'easeIn' } }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      <div className="sf-wave">
        {WAVE.map((height, i) => (
          <i key={i} style={{ '--h': `${height}rem`, '--d': Math.abs(i - (BARS - 1) / 2), '--n': i }} />
        ))}
      </div>
    </motion.div>
  );
}

export default function SpeakingFilm({ className = '', style }) {
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { margin: '0px 0px -22% 0px' });
  const [stage, setStage] = useState(reduced ? 'wave' : 'speak'); // 'speak' | 'wave'

  useEffect(() => {
    if (reduced) {
      setStage('wave');
      return undefined;
    }
    if (!inView) return undefined;

    let cancelled = false;
    const timers = [];
    const later = (ms, fn) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) fn();
        }, ms)
      );
    };
    const run = () => {
      setStage('speak');
      later(SPEAK_MS, () => setStage('wave'));
      later(SPEAK_MS + SWAP_MS + WAVE_MS, run);
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [inView, reduced]);

  return (
    <div ref={rootRef} className={`sf ${className}`.trim()} style={style} aria-hidden="true">
      <AnimatePresence mode="wait">
        {stage === 'speak' ? <SpeakLayer key="speak" /> : <WaveLayer key="wave" reduced={reduced} />}
      </AnimatePresence>
    </div>
  );
}
