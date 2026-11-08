import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { GlobeSimpleIcon } from '@phosphor-icons/react/dist/csr/GlobeSimple';
import { PLATFORM_MARKS } from './platformMarks';
import './PortfolioDemo.css';

/**
 * The public portfolio tile as a short film that loops while the tile is on screen:
 *
 *   scan       a white QR code; a line sweeps down and back up over it
 *   search     the QR goes and an address bar comes in, already holding the address of the profile; a thin
 *              line along its bottom edge fills like the loading line of a browser
 *   portfolio  the address bar goes, the portfolio opens as grey skeletons, and its sections fill in one after
 *              another: the profile, the figures, the platforms
 *
 * Then it fades back to the QR code and starts again. The area keeps one size through every step. It starts
 * when the tile is mostly in view and stops when it leaves. For people who asked for less motion it shows the
 * finished portfolio and nothing moves. The picture is decorative (aria-hidden): the tile's title and sentence
 * carry the meaning. Name and figures are sample data.
 */

const NAME = 'harry';
const MARKS = ['leetcode', 'codeforces', 'codechef', 'hackerrank', 'github'];
const SECTIONS = 3; // the sections that fill in

// Times in ms (the scan and the loading line are also in PortfolioDemo.css: keep them the same)
const SCAN_START = 700; // the QR code is shown for a moment before the line starts
const SCAN_MS = 2200; // the line down and back up
const LOCK_MS = 450; // a short pause after the line, before the QR goes
const SWAP_MS = 400; // a step leaving
const SEARCH_MS = 3000; // the address bar coming in, and its loading line running
const OPEN_MS = 650; // the portfolio opening, as skeletons
const SECTION_STEP = 540; // between two sections filling in
const HOLD_MS = 5200; // the finished portfolio stays

const EASE_OUT = [0.22, 1, 0.36, 1];

// ─── The QR code: a fixed pattern of 25 by 25 squares, so it is the same on every render ───────────────

const QR_SIZE = 25;
const noise = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Whether the square at (x, y) is dark */
function isDark(x, y) {
  const finder = (ox, oy) => {
    const dx = x - ox;
    const dy = y - oy;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
    const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
    return ring || core;
  };
  for (const [ox, oy] of [
    [0, 0],
    [QR_SIZE - 7, 0],
    [0, QR_SIZE - 7],
  ]) {
    const hit = finder(ox, oy);
    if (hit !== null) return hit;
  }
  // The light border around each finder pattern
  if ((x <= 7 && y <= 7) || (x >= QR_SIZE - 8 && y <= 7) || (x <= 7 && y >= QR_SIZE - 8)) return false;
  // Timing patterns
  if (y === 6) return x % 2 === 0;
  if (x === 6) return y % 2 === 0;
  // A smaller square near the corner that has no finder pattern
  const ax = x - (QR_SIZE - 9);
  const ay = y - (QR_SIZE - 9);
  if (ax >= 0 && ax <= 4 && ay >= 0 && ay <= 4) return ax === 0 || ax === 4 || ay === 0 || ay === 4 || (ax === 2 && ay === 2);
  return noise(y * QR_SIZE + x + 3) > 0.52;
}

const QR_PATH = (() => {
  let d = '';
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (isDark(x, y)) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
})();


// ─── Step 1: the QR code and the scanner ────────────────────────────────────────────────────────────────

function ScanLayer() {
  return (
    <motion.div
      className="fx-layer fx-scanlayer"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: SWAP_MS / 1000, ease: 'easeIn' } }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      <div className="fx-scanbox">
        <svg className="fx-qr" viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} shapeRendering="crispEdges" focusable="false">
          <path d={QR_PATH} />
        </svg>
        <span className="fx-scanline" />
      </div>
    </motion.div>
  );
}
// ─── Step 2: the address bar, loading ───────────────────────────────────────────────────────────────────

function SearchLayer({ host }) {
  return (
    <motion.div
      className="fx-layer fx-searchlayer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: SWAP_MS / 1000, ease: 'easeIn' } }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      <div className="fx-search">
        <GlobeSimpleIcon className="fx-search__globe" size={16} weight="regular" aria-hidden="true" />
        <span className="fx-search__text">
          <span className="fx-search__host">{host}</span>
          <span className="fx-search__path">/{NAME}</span>
        </span>
        <span className="fx-search__progress" />
      </div>
    </motion.div>
  );
}

// ─── Step 3: the portfolio, as skeletons that fill in ───────────────────────────────────────────────────

/** One section of the portfolio: a grey skeleton that is replaced by the real thing */
function Section({ loaded, name, skeleton, children }) {
  return (
    <div className="fx-sec" data-sec={name} data-loaded={loaded ? 'true' : 'false'}>
      <div className="fx-sk" aria-hidden="true">
        {skeleton}
      </div>
      <div className="fx-ct">{children}</div>
    </div>
  );
}

function PortfolioLayer({ loaded, still }) {
  return (
    <motion.div
      className="fx-layer fx-pagelayer"
      initial={still ? false : { opacity: 0, scale: 0.94, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeIn' } }}
      transition={{ duration: OPEN_MS / 1000, ease: EASE_OUT }}
    >
      <Section
        loaded={loaded >= 1}
        name="who"
        skeleton={
          <div className="fx-sk-row">
            <span className="fx-sk-block fx-sk-circle" />
            <span className="fx-sk-lines">
              <span className="fx-sk-block" style={{ width: '38%' }} />
              <span className="fx-sk-block" style={{ width: '66%' }} />
            </span>
          </div>
        }
      >
        <div className="fx-who">
          <span className="fx-avatar">H</span>
          <span className="fx-who__text">
            <strong>Harry</strong>
            <small>Computer Science</small>
          </span>
        </div>
      </Section>

      <Section
        loaded={loaded >= 2}
        name="figures"
        skeleton={
          <div className="fx-sk-cols">
            {[0, 1, 2].map((i) => (
              <span key={i} className="fx-sk-col">
                <span className="fx-sk-block" style={{ width: '52%', height: '1.1rem' }} />
                <span className="fx-sk-block" style={{ width: '40%' }} />
              </span>
            ))}
          </div>
        }
      >
        <ul className="fx-figures">
          <li>
            <b>#25</b>
            <span>Rank</span>
          </li>
          <li>
            <b>312</b>
            <span>Problems</span>
          </li>
          <li>
            <b>14</b>
            <span>Contests</span>
          </li>
        </ul>
      </Section>

      <Section
        loaded={loaded >= 3}
        name="marks"
        skeleton={
          <div className="fx-sk-marks">
            {MARKS.map((key) => (
              <span key={key} className="fx-sk-block fx-sk-dot" />
            ))}
          </div>
        }
      >
        <ul className="fx-folio-marks">
          {MARKS.map((key, i) => (
            <li key={key} style={{ '--n': i }}>
              <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
                <path d={PLATFORM_MARKS[key].path} fill={PLATFORM_MARKS[key].color} />
              </svg>
            </li>
          ))}
        </ul>
      </Section>
    </motion.div>
  );
}

export default function PortfolioDemo() {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { margin: '0px 0px -25% 0px' });

  const host = typeof window !== 'undefined' ? window.location.host : 'codestats';

  const [stage, setStage] = useState(reduced ? 'portfolio' : 'scan'); // 'scan' | 'search' | 'portfolio'
  const [loaded, setLoaded] = useState(reduced ? SECTIONS : 0);

  useEffect(() => {
    if (reduced) {
      setStage('portfolio');
      setLoaded(SECTIONS);
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

    // Step 1: the line sweeps over the QR code
    const run = () => {
      setStage('scan');
      setLoaded(0);
      later(SCAN_START + SCAN_MS + LOCK_MS, search);
    };

    // Step 2: the address bar loads
    const search = () => {
      setStage('search');
      later(SWAP_MS + SEARCH_MS, open);
    };

    // Step 3: the portfolio opens as skeletons and fills in section by section
    const open = () => {
      setStage('portfolio');
      const start = SWAP_MS + OPEN_MS * 0.6;
      for (let i = 1; i <= SECTIONS; i += 1) later(start + i * SECTION_STEP, () => setLoaded(i));
      later(start + SECTIONS * SECTION_STEP + HOLD_MS, run);
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [inView, reduced]);

  return (
    <div ref={rootRef} className="fx-folio">
      <div className="fx-folio-stage" aria-hidden="true">
        <AnimatePresence mode="wait">
          {stage === 'scan' ? <ScanLayer key="scan" /> : null}
          {stage === 'search' ? <SearchLayer key="search" host={host} /> : null}
          {stage === 'portfolio' ? <PortfolioLayer key="portfolio" loaded={loaded} still={reduced} /> : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
