import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import PointerArrow from './PointerArrow';
import './CohortsDemo.css';

/**
 * The cohorts tile, as a short film that loops while the tile is on screen:
 *
 *   typing    a text cursor writes the solution, character by character
 *   moving    a mouse pointer leaves the end of the code and glides to Run
 *   press     it clicks; the button gives
 *   launch    Run shows 'Running' for a moment while the code is judged
 *   passed    Run turns green and the three test cases come in, one after another
 *   reset     the tile fades and the film starts again
 *
 * Everything is drawn (SVG and CSS), nothing is downloaded. It starts when the tile is mostly in view and
 * stops when it leaves. People who asked for less motion get the finished picture and no movement.
 * The picture is decorative (aria-hidden): the tile's title and sentence say what it shows.
 */

// ─── The code that gets typed ───────────────────────────────────────────────

// [text, class]: k keyword, f function, n constant, no class for plain text
const LINES = [
  [['def', 'k'], [' '], ['two_sum', 'f'], ['(nums, target):']],
  [['    seen = {}']],
  [['    '], ['for', 'k'], [' i, n '], ['in', 'k'], [' '], ['enumerate', 'f'], ['(nums):']],
  [['        j = seen.'], ['get', 'f'], ['(target - n)']],
  [['        '], ['if', 'k'], [' j '], ['is not', 'k'], [' '], ['None', 'n'], [':']],
  [['            '], ['return', 'k'], [' [j, i]']],
  [['        seen[n] = i']],
];

// The code as segments with their place in the whole text, newlines between the lines
const SEGMENTS = [];
let TOTAL = 0;
LINES.forEach((line, lineIndex) => {
  line.forEach(([text, cls]) => {
    SEGMENTS.push({ text, cls, start: TOTAL });
    TOTAL += text.length;
  });
  if (lineIndex < LINES.length - 1) {
    SEGMENTS.push({ text: '\n', cls: undefined, start: TOTAL });
    TOTAL += 1;
  }
});
const FULL_TEXT = SEGMENTS.map((segment) => segment.text).join('');

// When each character appears (ms from the start): a steady hand, quick through indentation, a breath at
// the end of a line and after punctuation. Fixed numbers, so every loop types the same way.
const TIMES = [];
{
  let clock = 350;
  for (let i = 0; i < FULL_TEXT.length; i += 1) {
    const ch = FULL_TEXT[i];
    const lineStart = i === 0 || FULL_TEXT[i - 1] === '\n';
    const inIndent = /^ *$/.test(FULL_TEXT.slice(FULL_TEXT.lastIndexOf('\n', i - 1) + 1, i + 1));
    let step = inIndent && !lineStart ? 6 : 19 + ((i * 7) % 5) * 4;
    if (ch === '\n') step += 150;
    if (ch === ',' || ch === ':' || ch === '(') step += 45;
    clock += step;
    TIMES.push(clock);
  }
}

const CASES = ['Case 1', 'Case 2', 'Case 3'];

// ─── Pieces ─────────────────────────────────────────────────────────────────

/** The code typed so far, the not yet typed part kept in place (invisible) so the tile never changes size */
function CodeText({ count, caretRef, caretBlinking }) {
  const parts = [];
  let caretPlaced = false;
  SEGMENTS.forEach((segment, index) => {
    const shown = Math.max(0, Math.min(segment.text.length, count - segment.start));
    const typed = segment.text.slice(0, shown);
    const rest = segment.text.slice(shown);
    if (typed) {
      parts.push(
        <span key={`t${index}`} className={segment.cls}>
          {typed}
        </span>
      );
    }
    if (!caretPlaced && rest) {
      parts.push(<span key="caret" ref={caretRef} className="fx-caret" data-blinking={caretBlinking ? 'true' : 'false'} />);
      caretPlaced = true;
    }
    if (rest) {
      parts.push(
        <span key={`g${index}`} className="fx-ghost">
          {rest}
        </span>
      );
    }
  });
  if (!caretPlaced) parts.push(<span key="caret" ref={caretRef} className="fx-caret" data-blinking="true" />);
  return <>{parts}</>;
}

// ─── The film ───────────────────────────────────────────────────────────────

export default function CohortsDemo() {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const fxRef = useRef(null);
  const runRef = useRef(null);
  const caretRef = useRef(null);
  const inView = useInView(rootRef, { margin: '0px 0px -25% 0px' });

  const [phase, setPhase] = useState(reduced ? 'passed' : 'idle');
  const [typed, setTyped] = useState(reduced ? TOTAL : 0);
  const [pointer, setPointer] = useState({ x: 0, y: 0, show: false, animate: false, down: false });

  useEffect(() => {
    if (reduced) {
      setPhase('passed');
      setTyped(TOTAL);
      return undefined;
    }
    if (!inView) return undefined;

    let cancelled = false;
    let raf = 0;
    const timers = [];
    const later = (ms, fn) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) fn();
        }, ms)
      );
    };

    // Where a point of `node` is, measured from the top left of the tile (the effects layer fills it)
    const spot = (node, fx, fy) => {
      const origin = fxRef.current.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return { x: box.left - origin.left + box.width * fx, y: box.top - origin.top + box.height * fy };
    };

    const start = () => {
      passedOnce = false;
      setPhase('typing');
      setTyped(0);
      setPointer({ x: 0, y: 0, show: false, animate: false, down: false });

      const t0 = performance.now();
      let shown = 0;
      const tick = (now) => {
        if (cancelled) return;
        const elapsed = now - t0;
        while (shown < TOTAL && TIMES[shown] <= elapsed) shown += 1;
        setTyped(shown);
        if (shown < TOTAL) raf = window.requestAnimationFrame(tick);
        else later(380, movePointer);
      };
      raf = window.requestAnimationFrame(tick);
    };

    const movePointer = () => {
      setPhase('moving');
      // It leaves from the end of the code and goes to the middle of Run
      const from = spot(caretRef.current, 0, 0.5);
      const to = spot(runRef.current, 0.5, 0.55);
      setPointer({ x: from.x + 6, y: from.y + 4, show: true, animate: false, down: false });
      raf = window.requestAnimationFrame(() => {
        raf = window.requestAnimationFrame(() => {
          setPointer({ x: to.x - 4, y: to.y - 3, show: true, animate: true, down: false });
        });
      });
      later(1050, press);
    };

    const press = () => {
      setPhase('press');
      setPointer((value) => ({ ...value, down: true }));
      later(260, launch);
    };

    const launch = () => {
      setPointer((value) => ({ ...value, down: false, show: false }));
      setPhase('launch');
      later(1600, passed);
    };

    let passedOnce = false;
    const passed = () => {
      if (passedOnce) return;
      passedOnce = true;
      setPhase('passed');
      later(3600, () => {
        setPhase('reset');
        later(650, start);
      });
    };

    start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [inView, reduced]);

  const running = phase === 'launch';
  const done = phase === 'passed' || (phase === 'reset' && typed === TOTAL);

  return (
    <div ref={rootRef} className="fx-demo" data-phase={phase} aria-hidden="true">
      <div className="fx-shot fx-demo-shot">
        <div className="fx-editor-bar">
          <span className="fx-file">two_sum.py</span>
          <span ref={runRef} className="fx-run fx-demo-run" data-state={phase === 'press' ? 'press' : running ? 'running' : done ? 'done' : 'idle'}>
            {running ? <SpinnerGapIcon size={14} weight="bold" aria-hidden="true" data-spin="true" /> : null}
            {done ? <CheckCircleIcon size={14} weight="fill" aria-hidden="true" /> : null}
            {running ? 'Running' : done ? 'Passed' : 'Run'}
          </span>
        </div>
        <pre className="fx-code">
          <CodeText count={typed} caretRef={caretRef} caretBlinking={phase !== 'typing'} />
        </pre>
        <ul className="fx-cases fx-demo-cases" data-show={done ? 'true' : 'false'}>
          {CASES.map((name, index) => (
            <li key={name} className="fx-case" style={{ '--i': index }}>
              <CheckCircleIcon className="fx-ok" size={16} weight="fill" aria-hidden="true" />
              {name} passed
            </li>
          ))}
        </ul>
      </div>

      {/* Everything that moves across the tile sits in one layer that fills it */}
      <div ref={fxRef} className="fx-demo-fx">
        <div
          className="fx-pointer"
          data-show={pointer.show ? 'true' : 'false'}
          data-animate={pointer.animate ? 'true' : 'false'}
          data-down={pointer.down ? 'true' : 'false'}
          style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }}
        >
          <PointerArrow />
        </div>


      </div>
    </div>
  );
}
