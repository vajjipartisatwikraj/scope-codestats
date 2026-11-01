import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import './RocketAnimation.css';

/**
 * RocketAnimation: a rocket that launches while something is being judged, flies away when it went
 * well and tumbles when it did not. It is a flourish for the moment a submission is graded, drawn in
 * the theme's colours (the accent for the rocket, the series colours for the flames) so it follows
 * Midnight and Daylight.
 *
 * Props
 *   state ('idle')        'idle' (nothing is shown) | 'submitting' (launching) | 'success' (flies
 *                         away) | 'failure' (tumbles)
 *   onComplete()          called when the success or failure animation has finished, so the caller
 *                         can show the result. With reduced motion it is called after a moment and
 *                         the rocket does not move.
 *   labels                the words: { launching, running, success: { title, subtitle },
 *                         failure: { title, subtitle } }. Defaults are written for a code submission.
 *   className, style      passed to the root element
 *
 * CSS variables: --rk-body --rk-main --rk-main-dark --rk-glass --rk-flame-outer --rk-flame-mid
 * --rk-flame-core --rk-smoke --rk-success --rk-danger --rk-text --rk-muted
 */

const DEFAULT_LABELS = {
  launching: 'Launching your code',
  running: 'Running test cases',
  success: { title: 'Mission accomplished!', subtitle: 'All test cases passed' },
  failure: { title: 'Houston, we have a problem!', subtitle: 'Some test cases failed' },
};

// The flames are redrawn through these shapes while the rocket launches
const FIRE_OUTER = [
  'M72 195 Q66 220 60 245 Q70 238 80 250 Q90 238 100 245 Q94 220 88 195 Z',
  'M72 195 Q64 222 56 250 Q68 240 80 258 Q92 240 104 250 Q96 222 88 195 Z',
  'M72 195 Q68 218 62 240 Q72 235 80 248 Q88 235 98 240 Q92 218 88 195 Z',
  'M72 195 Q66 220 60 245 Q70 238 80 250 Q90 238 100 245 Q94 220 88 195 Z',
];
const FIRE_MID = [
  'M74 195 Q70 215 66 235 Q73 228 80 240 Q87 228 94 235 Q90 215 86 195 Z',
  'M74 195 Q68 218 62 242 Q72 232 80 248 Q88 232 98 242 Q92 218 86 195 Z',
  'M74 195 Q72 212 68 230 Q74 225 80 236 Q86 225 92 230 Q88 212 86 195 Z',
  'M74 195 Q70 215 66 235 Q73 228 80 240 Q87 228 94 235 Q90 215 86 195 Z',
];
const FIRE_CORE = [
  'M76 195 Q74 208 72 222 Q76 218 80 226 Q84 218 88 222 Q86 208 84 195 Z',
  'M76 195 Q73 210 70 228 Q75 222 80 232 Q85 222 90 228 Q87 210 84 195 Z',
  'M76 195 Q75 206 74 218 Q77 215 80 222 Q83 215 86 218 Q85 206 84 195 Z',
  'M76 195 Q74 208 72 222 Q76 218 80 226 Q84 218 88 222 Q86 208 84 195 Z',
];

const SMOKE = Array.from({ length: 5 }, (_, i) => ({
  key: `smoke-${i}`,
  cx: 80 + (i % 2 === 0 ? -1 : 1) * (10 + i * 5),
  animate: { cy: [240 + i * 3, 260 + i * 6], r: [3 + i, 12 + i * 3], opacity: [1, 0] },
  transition: { duration: 1.2 + i * 0.15, repeat: Infinity, delay: i * 0.18, ease: 'easeOut' },
}));

const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  key: `spark-${i}`,
  tone: ['text', 'mid', 'outer'][i % 3],
  animate: { cx: [80, 80 + Math.sin(i * 0.9) * (18 + i * 4)], cy: [200, 235 + i * 4], opacity: [1, 0], r: [1.8, 0.3] },
  transition: { duration: 0.45 + i * 0.06, repeat: Infinity, delay: i * 0.07, ease: 'easeOut' },
}));

const FAILURE_SMOKE = Array.from({ length: 5 }, (_, i) => ({
  key: `failure-smoke-${i}`,
  cx: 68 + i * 8,
  animate: { cy: [160, 130 - i * 12], r: [2, 10 + i * 3], opacity: [1, 0] },
  transition: { duration: 2.2, repeat: Infinity, delay: i * 0.25, ease: 'easeOut' },
}));

const MOTION = {
  submitting: {
    initial: { opacity: 0, scale: 0.5, y: 60 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  },
  success: {
    animate: { y: [-10, -400], scale: [1, 0.3], opacity: [1, 0], transition: { duration: 2, ease: 'easeIn', times: [0, 1] } },
    exit: { opacity: 0 },
  },
  failure: {
    animate: { y: [0, 80], rotate: [0, -12, 14, -8, 0], scale: [1, 0.85], transition: { duration: 1.5, ease: 'easeOut' } },
  },
};

const MESSAGE = {
  initial: { opacity: 0, y: 20, scale: 0.8 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, delay: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, scale: 0.8, transition: { duration: 0.3 } },
};

const SHAKE = {
  animate: { x: [0, -1.2, 1.2, -0.8, 0.8, 0], y: [0, 0.8, -0.8, 0.5, -0.5, 0] },
  transition: { duration: 0.12, repeat: Infinity, ease: 'linear' },
};

/** The rocket drawing. Every colour is a class, so the theme decides it (RocketAnimation.css). */
const RocketSvg = React.memo(function RocketSvg({ launching, failed, still }) {
  const flames = launching && !still;
  return (
    <svg width="180" height="260" viewBox="0 0 180 260" aria-hidden="true" focusable="false">
      {flames ? (
        <g>
          <motion.path className="rk-flame rk-flame--outer" initial={{ d: FIRE_OUTER[0] }} animate={{ d: FIRE_OUTER }} transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.path className="rk-flame rk-flame--mid" initial={{ d: FIRE_MID[0] }} animate={{ d: FIRE_MID }} transition={{ duration: 0.28, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.path className="rk-flame rk-flame--core" initial={{ d: FIRE_CORE[0] }} animate={{ d: FIRE_CORE }} transition={{ duration: 0.22, repeat: Infinity, ease: 'easeInOut' }} />
          {SMOKE.map((puff) => (
            <motion.circle key={puff.key} className="rk-smoke" cx={puff.cx} initial={{ cy: puff.animate.cy[0], r: puff.animate.r[0], opacity: 1 }} animate={puff.animate} transition={puff.transition} />
          ))}
          {SPARKS.map((spark) => (
            <motion.circle key={spark.key} className={`rk-spark rk-spark--${spark.tone}`} initial={{ cx: 80, cy: 200, r: 1.8, opacity: 1 }} animate={spark.animate} transition={spark.transition} />
          ))}
        </g>
      ) : null}

      {/* Fins */}
      <path className="rk-fin" d="M64 140 Q52 158 44 178 Q46 180 50 178 Q56 166 64 154 Z" />
      <path className="rk-fin" d="M96 140 Q108 158 116 178 Q114 180 110 178 Q104 166 96 154 Z" />

      {/* Body */}
      <path className="rk-body" d="M64 62 L62 165 Q62 185 72 190 L88 190 Q98 185 98 165 L96 62 Z" />
      <rect className="rk-band" x="62" y="120" width="36" height="8" rx="1" />

      {/* Nose */}
      <path className="rk-nose" d="M64 62 Q64 32 80 8 Q96 32 96 62 Z" />

      {/* Window */}
      <circle className="rk-ring" cx="80" cy="90" r="14" />
      <circle className="rk-glass" cx="80" cy="90" r="11" />
      <circle className="rk-shine" cx="76" cy="84" r="2.5" />

      {/* Nozzle */}
      <path className="rk-nozzle" d="M72 190 Q70 194 67 200 Q66 202 68 202 L92 202 Q94 202 93 200 L90 194 Q88 190 88 190 Z" />

      {failed ? (
        <g>
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
            <path className="rk-crack" d="M72 68 L68 76 L74 80 L70 88" />
            <path className="rk-crack" d="M90 96 L94 102 L88 106 L92 112" />
          </motion.g>
          {FAILURE_SMOKE.map((puff) => (
            <motion.circle key={puff.key} className="rk-smoke" cx={puff.cx} initial={{ cy: puff.animate.cy[0], r: puff.animate.r[0], opacity: 1 }} animate={puff.animate} transition={puff.transition} />
          ))}
        </g>
      ) : null}
    </svg>
  );
});

export default function RocketAnimation({ state = 'idle', onComplete, labels, className, style }) {
  const reduced = useReducedMotion();
  const words = { ...DEFAULT_LABELS, ...labels };
  const [showMessage, setShowMessage] = useState(false);
  const finished = state === 'success' || state === 'failure';
  const done = useRef(onComplete);
  done.current = onComplete;

  // The result message comes in half a second into the flight
  useEffect(() => {
    if (!finished) {
      setShowMessage(false);
      return undefined;
    }
    const timer = setTimeout(() => setShowMessage(true), 500);
    return () => clearTimeout(timer);
  }, [finished, state]);

  // With reduced motion nothing flies, so the result is handed over after a moment
  useEffect(() => {
    if (!reduced || !finished) return undefined;
    const timer = setTimeout(() => done.current && done.current(), 900);
    return () => clearTimeout(timer);
  }, [reduced, finished, state]);

  const onAnimationComplete = useCallback(() => {
    // Only the flight away or the tumble counts; the entrance of the launch is not a result
    if (reduced || !done.current || !finished) return;
    setTimeout(() => done.current && done.current(), state === 'success' ? 300 : 600);
  }, [reduced, finished, state]);

  if (state === 'idle') return null;

  const launching = state === 'submitting';
  const message = finished ? words[state] : null;

  return (
    <div className={className ? `rk ${className}` : 'rk'} style={style} role="status" data-state={state}>
      <AnimatePresence mode="wait">
        <motion.div key={state} className="rk-stage" {...(reduced ? {} : MOTION[state])} onAnimationComplete={onAnimationComplete}>
          <div className="rk-box">
            {launching && !reduced ? (
              <motion.div className="rk-shake" {...SHAKE}>
                <RocketSvg launching />
              </motion.div>
            ) : (
              <RocketSvg launching={launching} failed={state === 'failure'} still={reduced} />
            )}
          </div>
          {launching ? (
            <motion.div className="rk-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
              <p className="rk-caption__title">{words.launching}</p>
              <p className="rk-caption__text">{words.running}</p>
            </motion.div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showMessage && message ? (
          <motion.div key="message" className="rk-message" data-tone={state} {...(reduced ? {} : MESSAGE)}>
            <p className="rk-message__title">{message.title}</p>
            <p className="rk-message__text">{message.subtitle}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
