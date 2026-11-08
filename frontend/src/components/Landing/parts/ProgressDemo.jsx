import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import BarChart from '../../custom-components/BarChart';
import PieChart from '../../custom-components/PieChart';
import LineChart from '../../custom-components/LineChart';
import './ProgressDemo.css';

/**
 * The analytics and progress tile as a short film that loops while the tile is on screen, one chart after
 * another, with nothing but the charts (no titles, labels, legends or lines):
 *
 *   bars   seven bars rise from the baseline in a soft wave, the last one in the brightest blue
 *   pie    a donut whose slices sweep in
 *   line   a fluctuating line (30 points that rise and fall around a slow upward drift) that draws itself over a
 *          soft area and ends on a dot
 *
 * The charts are the app's own custom components (BarChart, PieChart, LineChart), which play their own entrance
 * once when they mount; here each one is mounted afresh for its turn. Their colours are set in ProgressDemo.css
 * (bars, line) and below (the slices), all from the platform's blues. The area keeps one size through every
 * chart. It starts when the tile is mostly in view and stops when it leaves. For people who asked for less
 * motion it shows the finished line chart, and the components themselves do not animate. Decorative
 * (aria-hidden): the tile's title and sentence carry the meaning. All the figures are sample data.
 *
 * The charts take no pointer (ProgressDemo.css): this is a picture, so no hover card or dimming appears over it.
 */

const STAGES = ['bars', 'pie', 'line'];
const HOLD_MS = { bars: 4300, pie: 4300, line: 4800 }; // how long each chart stays, swap included
const SWAP_MS = 400; // a chart leaving
const EASE_OUT = [0.22, 1, 0.36, 1];

// ─── The data (sample) ──────────────────────────────────────────────────────────────────────────────────

const SOLVED = [14, 22, 18, 31, 27, 38, 46].map((value, i) => ({ key: i, label: i, value }));

// The slices, brightest first. These are the platform blues of FeatureShowcase.css written out, because the
// landing page is always dark whatever theme the app is in.
const PLATFORMS = [
  { key: 'a', label: 'LeetCode', value: 152, color: '#66bfff' },
  { key: 'b', label: 'Codeforces', value: 78, color: '#0585e0' },
  { key: 'c', label: 'CodeChef', value: 46, color: '#0a5a94' },
  { key: 'd', label: 'HackerRank', value: 36, color: '#1d5f8c' },
];

// A fluctuating series: a slow upward drift under two waves of different lengths and a little jitter, the same on
// every render
const SCORE = Array.from({ length: 30 }, (_, i) => {
  const jitter = Math.sin(i * 12.9898) * 43758.5453;
  const value = 50 + i * 0.9 + 15 * Math.sin(i * 0.8) + 8 * Math.sin(i * 1.9 + 1) + 4 * (jitter - Math.floor(jitter) - 0.5);
  return { key: i, label: i, value: Math.round(value * 10) / 10 };
});

// ─── One layer per chart ────────────────────────────────────────────────────────────────────────────────

function Layer({ children, reduced }) {
  return (
    <motion.div
      className="fx-layer fx-prog-layer"
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: SWAP_MS / 1000, ease: 'easeIn' } }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

function Chart({ stage, reduced }) {
  const animate = !reduced;
  if (stage === 'bars') {
    return (
      <BarChart
        data={SOLVED}
        height={170}
        gap={10}
        radius="full"
        minColumnWidth={20}
        barMaxWidth={36}
        highlight="last"
        showValues={false}
        showLabels={false}
        animate={animate}
        title="Problems solved per month"
      />
    );
  }
  if (stage === 'pie') {
    return (
      <PieChart
        data={PLATFORMS}
        getColor={(item) => item.color}
        donut={0.62}
        gap={5}
        size={180}
        legend="none"
        animate={animate}
        title="Problems solved by platform"
      >
        <></>
      </PieChart>
    );
  }
  return (
    <LineChart
      data={SCORE}
      variant="area"
      height={170}
      showGrid={false}
      strokeWidth={2.2}
      dotRadius={5}
      animate={animate}
      title="Overall score over time"
    />
  );
}

export default function ProgressDemo() {
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { margin: '0px 0px -22% 0px' });
  const [stage, setStage] = useState(reduced ? 'line' : 'bars'); // 'bars' | 'pie' | 'line'

  useEffect(() => {
    if (reduced) {
      setStage('line');
      return undefined;
    }
    if (!inView) return undefined;

    let cancelled = false;
    let timer = 0;
    const show = (index) => {
      setStage(STAGES[index]);
      timer = window.setTimeout(() => {
        if (!cancelled) show((index + 1) % STAGES.length);
      }, HOLD_MS[STAGES[index]]);
    };
    show(0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [inView, reduced]);

  return (
    <div ref={rootRef} className="fx-prog">
      <div className="fx-prog-stage" aria-hidden="true">
        <AnimatePresence mode="wait">
          <Layer key={stage} reduced={reduced}>
            <Chart stage={stage} reduced={reduced} />
          </Layer>
        </AnimatePresence>
      </div>
    </div>
  );
}
