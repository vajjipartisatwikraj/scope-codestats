import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Pre-computed particle data (avoids re-creation every render) ─── */
const SMOKE_PARTICLES = Array.from({ length: 5 }, (_, i) => ({
  key: `smoke-${i}`,
  cx: 80 + (i % 2 === 0 ? -1 : 1) * (10 + i * 5),
  anim: { cy: [240 + i * 3, 260 + i * 6], r: [3 + i, 12 + i * 3], opacity: [0.25, 0] },
  transition: { duration: 1.2 + i * 0.15, repeat: Infinity, delay: i * 0.18, ease: "easeOut" },
}));

const SPARK_COLORS = ["#ffffff", "#ffcc00", "#ff6600"];
const SPARK_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  key: `spark-${i}`,
  fill: SPARK_COLORS[i % 3],
  anim: {
    cx: [80, 80 + Math.sin(i * 0.9) * (18 + i * 4)],
    cy: [200, 235 + i * 4],
    opacity: [1, 0],
    r: [1.8, 0.3],
  },
  transition: { duration: 0.45 + i * 0.06, repeat: Infinity, delay: i * 0.07, ease: "easeOut" },
}));

const FAILURE_SMOKE = Array.from({ length: 5 }, (_, i) => ({
  key: `fsmoke-${i}`,
  cx: 68 + i * 8,
  anim: { cy: [160, 130 - i * 12], r: [2, 10 + i * 3], opacity: [0.3, 0] },
  transition: { duration: 2.2, repeat: Infinity, delay: i * 0.25, ease: "easeOut" },
}));

/* ─── Fire path keyframes ─── */
const FIRE_OUTER_PATHS = [
  "M72 195 Q66 220 60 245 Q70 238 80 250 Q90 238 100 245 Q94 220 88 195 Z",
  "M72 195 Q64 222 56 250 Q68 240 80 258 Q92 240 104 250 Q96 222 88 195 Z",
  "M72 195 Q68 218 62 240 Q72 235 80 248 Q88 235 98 240 Q92 218 88 195 Z",
  "M72 195 Q66 220 60 245 Q70 238 80 250 Q90 238 100 245 Q94 220 88 195 Z",
];
const FIRE_MID_PATHS = [
  "M74 195 Q70 215 66 235 Q73 228 80 240 Q87 228 94 235 Q90 215 86 195 Z",
  "M74 195 Q68 218 62 242 Q72 232 80 248 Q88 232 98 242 Q92 218 86 195 Z",
  "M74 195 Q72 212 68 230 Q74 225 80 236 Q86 225 92 230 Q88 212 86 195 Z",
  "M74 195 Q70 215 66 235 Q73 228 80 240 Q87 228 94 235 Q90 215 86 195 Z",
];
const FIRE_CORE_PATHS = [
  "M76 195 Q74 208 72 222 Q76 218 80 226 Q84 218 88 222 Q86 208 84 195 Z",
  "M76 195 Q73 210 70 228 Q75 222 80 232 Q85 222 90 228 Q87 210 84 195 Z",
  "M76 195 Q75 206 74 218 Q77 215 80 222 Q83 215 86 218 Q85 206 84 195 Z",
  "M76 195 Q74 208 72 222 Q76 218 80 226 Q84 218 88 222 Q86 208 84 195 Z",
];

/* ─── Static animation variants ─── */
const CONTAINER_VARIANTS = {
  submitting: {
    initial: { opacity: 0, scale: 0.5, y: 60 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  },
  success: {
    animate: { y: [-10, -400], scale: [1, 0.3], opacity: [1, 0], transition: { duration: 2, ease: "easeIn", times: [0, 1] } },
    exit: { opacity: 0 },
  },
  failure: {
    animate: { y: [0, 80], rotate: [0, -12, 14, -8, 0], scale: [1, 0.85], transition: { duration: 1.5, ease: "easeOut" } },
  },
};

const MESSAGE_VARIANTS = {
  initial: { opacity: 0, y: 20, scale: 0.8 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, delay: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, scale: 0.8, transition: { duration: 0.3 } },
};

const MESSAGES = {
  success: { title: "Mission Accomplished!", subtitle: "All test cases passed successfully", color: "#4caf50" },
  failure: { title: "Houston, We Have a Problem!", subtitle: "Some test cases failed", color: "#f44336" },
};

const VIBRATION = {
  animate: { x: [0, -1.2, 1.2, -0.8, 0.8, 0], y: [0, 0.8, -0.8, 0.5, -0.5, 0] },
  transition: { duration: 0.12, repeat: Infinity, ease: "linear" },
};

/* ─── Rocket SVG (memoized — only re-renders when phase/darkMode change) ─── */
const RocketSVG = React.memo(({ isLaunching, isFailure, darkMode }) => (
  <svg width="180" height="260" viewBox="0 0 180 260">
    {/* Gradients — only needed during launch */}
    {isLaunching && (
      <defs>
        <linearGradient id="rk-fireOuter" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ff6600" /><stop offset="50%" stopColor="#ff3300" /><stop offset="100%" stopColor="#cc0000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rk-fireMid" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffcc00" /><stop offset="50%" stopColor="#ff9900" /><stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rk-fireCore" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="40%" stopColor="#ffffcc" /><stop offset="100%" stopColor="#ffcc00" stopOpacity="0" />
        </linearGradient>
      </defs>
    )}

    {/* Fire & Thrust */}
    {isLaunching && (
      <g>
        <motion.path fill="url(#rk-fireOuter)"
          initial={{ d: FIRE_OUTER_PATHS[0], opacity: 0.85 }}
          animate={{ d: FIRE_OUTER_PATHS, opacity: [0.85, 1, 0.9, 0.85] }}
          transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }} />
        <motion.path fill="url(#rk-fireMid)"
          initial={{ d: FIRE_MID_PATHS[0], opacity: 0.9 }}
          animate={{ d: FIRE_MID_PATHS, opacity: [0.9, 1, 0.85, 0.9] }}
          transition={{ duration: 0.28, repeat: Infinity, ease: "easeInOut" }} />
        <motion.path fill="url(#rk-fireCore)"
          initial={{ d: FIRE_CORE_PATHS[0] }}
          animate={{ d: FIRE_CORE_PATHS }}
          transition={{ duration: 0.22, repeat: Infinity, ease: "easeInOut" }} />

        {SMOKE_PARTICLES.map((p) => (
          <motion.circle key={p.key} cx={p.cx}
            fill={darkMode ? "rgba(255,255,255,0.06)" : "rgba(180,180,180,0.12)"}
            initial={{ cy: p.anim.cy[0], r: p.anim.r[0], opacity: 0.25 }}
            animate={p.anim} transition={p.transition} />
        ))}
        {SPARK_PARTICLES.map((p) => (
          <motion.circle key={p.key} fill={p.fill}
            initial={{ cx: p.anim.cx[0], cy: p.anim.cy[0], r: 1.8, opacity: 1 }}
            animate={p.anim} transition={p.transition} />
        ))}
      </g>
    )}

    {/* Fins */}
    <path d="M64 140 Q52 158 44 178 Q46 180 50 178 Q56 166 64 154 Z" fill="#1565c0" stroke="#0d47a1" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M62 142 Q54 156 48 172" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.25" />
    <path d="M96 140 Q108 158 116 178 Q114 180 110 178 Q104 166 96 154 Z" fill="#1565c0" stroke="#0d47a1" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M98 142 Q106 156 112 172" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.25" />

    {/* Body */}
    <path d="M64 62 L62 165 Q62 185 72 190 L88 190 Q98 185 98 165 L96 62 Z" fill="#ffffff" stroke="#1565c0" strokeWidth="2" strokeLinejoin="round" />
    <path d="M64 62 L62 165 Q62 185 72 190 L74 190 Q64 185 64 165 L66 62 Z" fill="rgba(21,101,192,0.08)" />

    {/* Nose Cone */}
    <path d="M64 62 Q64 32 80 8 Q96 32 96 62 Z" fill="#1565c0" stroke="#0d47a1" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M78 14 Q80 10 82 14 Q82 28 80 32 Q78 28 78 14 Z" fill="#ffffff" opacity="0.3" />

    {/* Window */}
    <circle cx="80" cy="90" r="14" fill="none" stroke="#1565c0" strokeWidth="2.5" />
    <circle cx="80" cy="90" r="11" fill="#1976d2" stroke="#0d47a1" strokeWidth="1" />
    <path d="M73 84 Q76 78 84 82 Q78 84 76 90 Q74 86 73 84 Z" fill="#ffffff" opacity="0.45" />
    <circle cx="76" cy="84" r="2" fill="#ffffff" opacity="0.5" />

    {/* Body details */}
    <rect x="62" y="120" width="36" height="8" rx="1" fill="#1565c0" />
    <line x1="62" y1="132" x2="98" y2="132" stroke="#1976d2" strokeWidth="1.2" opacity="0.5" />
    <line x1="62" y1="112" x2="98" y2="112" stroke="#1976d2" strokeWidth="0.8" opacity="0.3" />
    <circle cx="67" cy="105" r="1.5" fill="#1565c0" opacity="0.5" />
    <circle cx="93" cy="105" r="1.5" fill="#1565c0" opacity="0.5" />
    <circle cx="67" cy="140" r="1.5" fill="#1565c0" opacity="0.5" />
    <circle cx="93" cy="140" r="1.5" fill="#1565c0" opacity="0.5" />

    {/* Nozzle */}
    <path d="M72 190 Q70 194 67 200 Q66 202 68 202 L92 202 Q94 202 93 200 L90 194 Q88 190 88 190 Z" fill="#0d47a1" stroke="#0a3470" strokeWidth="1.2" strokeLinejoin="round" />
    <ellipse cx="80" cy="201" rx="13" ry="2.5" fill="#0a3470" stroke="#082c5a" strokeWidth="0.8" />
    {isLaunching && (
      <motion.ellipse cx="80" cy="200" rx="8" fill="#ffcc00"
        initial={{ opacity: 0.6, ry: 1.5 }}
        animate={{ opacity: [0.6, 0.9, 0.6], ry: [1.5, 2, 1.5] }}
        transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }} />
    )}

    {/* Failure effects */}
    {isFailure && (
      <g>
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <path d="M72 68 L68 76 L74 80 L70 88" stroke="#0d47a1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M90 96 L94 102 L88 106 L92 112" stroke="#0d47a1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </motion.g>
        {FAILURE_SMOKE.map((p) => (
          <motion.circle key={p.key} cx={p.cx}
            fill={darkMode ? "rgba(200,200,200,0.15)" : "rgba(120,120,120,0.15)"}
            initial={{ cy: p.anim.cy[0], r: p.anim.r[0], opacity: 0.3 }}
            animate={p.anim} transition={p.transition} />
        ))}
      </g>
    )}
  </svg>
));

RocketSVG.displayName = 'RocketSVG';

/* ─── Shared styles ─── */
const containerSx = {
  position: 'relative', width: '100%', height: '100%',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '180px', overflow: 'hidden',
};
const rocketBoxSx = {
  width: 140, height: 180, position: 'relative',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  '& svg': { width: '120px', height: 'auto' },
};
const centerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const vibrationStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* ─── Main Component ─── */
const RocketAnimation = ({ submissionState = 'idle', darkMode = false, onAnimationComplete }) => {
  const [showMessage, setShowMessage] = useState(false);

  // Clean up timers on state change
  useEffect(() => {
    if (submissionState === 'success' || submissionState === 'failure') {
      const timer = setTimeout(() => setShowMessage(true), 500);
      return () => clearTimeout(timer);
    }
    setShowMessage(false);
  }, [submissionState]);

  const handleAnimationComplete = useCallback((definition) => {
    // ONLY signal completion for success/failure flyaway/tumble animations.
    // Ignore the submitting entrance animation — it is NOT a completion signal.
    if (!onAnimationComplete) return;
    if (submissionState !== 'success' && submissionState !== 'failure') return;
    const delay = submissionState === 'success' ? 300 : 600;
    setTimeout(onAnimationComplete, delay);
  }, [submissionState, onAnimationComplete]);

  if (submissionState === 'idle') return null;

  const isLaunching = submissionState === 'submitting';
  const variants = CONTAINER_VARIANTS[submissionState];
  const msg = MESSAGES[submissionState];

  return (
    <Box sx={containerSx}>
      <AnimatePresence mode="wait">
        <motion.div
          key={submissionState}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={centerStyle}
          onAnimationComplete={handleAnimationComplete}
        >
          <Box sx={rocketBoxSx}>
            {isLaunching ? (
              <motion.div {...VIBRATION} style={vibrationStyle}>
                <RocketSVG isLaunching darkMode={darkMode} />
              </motion.div>
            ) : (
              <RocketSVG isFailure={submissionState === 'failure'} darkMode={darkMode} />
            )}
          </Box>

          {isLaunching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
              <Typography variant="subtitle2" sx={{ mt: 0.5, color: darkMode ? '#64b5f6' : '#1565c0', fontWeight: 600, textAlign: 'center', fontSize: '0.85rem' }}>
                Launching Your Code...
              </Typography>
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                <Typography variant="caption" sx={{ mt: 0.25, color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', textAlign: 'center', fontSize: '0.7rem', display: 'block' }}>
                  Running test cases...
                </Typography>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Result message */}
      <AnimatePresence>
        {showMessage && msg && (
          <motion.div variants={MESSAGE_VARIANTS} initial="initial" animate="animate" exit="exit"
            style={{ position: 'absolute', bottom: '10%', textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ color: msg.color, fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>
              {msg.title}
            </Typography>
            <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', fontSize: '0.8rem' }}>
              {msg.subtitle}
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default RocketAnimation;
