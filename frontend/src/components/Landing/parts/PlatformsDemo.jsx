import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { PLATFORM_MARKS } from './platformMarks';
import PointerArrow from './PointerArrow';
import './PlatformsDemo.css';

/**
 * The platforms tile as a short film that loops while the tile is on screen. Four steps, all on the
 * middle of the tile:
 *
 *   button   a white "Sync now" button; a mouse pointer glides in and clicks it
 *   fetch    a spinner (eight dashes that run round), and under it, one after another,
 *            "Fetching platforms…" and the four things CodeStats reads
 *   done     the spinner turns into a check and the title says the platforms are synced
 *   list     the words fade away and the five platforms come in one by one
 *
 * Then it fades back to the button and starts again. The area keeps one size through every step, so the
 * tile never jumps. It starts when the tile is mostly in view and stops when it leaves. For people who asked
 * for less motion it shows the finished list and nothing moves. The moving picture is decorative: a plain
 * list of the platforms is always there for screen readers.
 */

const PLATFORMS = ['leetcode', 'codeforces', 'codechef', 'hackerrank', 'github'];
const READS = ['Problems solved', 'Contests participated', 'Ratings', 'GitHub commits'];

// Times in ms
const BUTTON_WAIT = 1000; // the button is on its own for a moment before the pointer comes
const POINTER_MS = 1000; // the pointer's trip to the button
const PRESS_MS = 320; // the press, before the button gives way
const SWAP_MS = 450; // the button fading out before the loader comes in
const LINE_FIRST = 600; // when the first of the four lines comes in
const LINE_STEP = 460; // and the gap between two lines
const FETCH_MS = LINE_FIRST + READS.length * LINE_STEP + 500; // until the last line has settled, and a beat
const DONE_MS = 1300; // the check is drawn and read
const LIST_MS = 6000; // the platforms come in, and stay

const EASE_OUT = [0.22, 1, 0.36, 1];

/** A platform's mark in its own colour, with nothing around it */
function PlatformMark({ platform }) {
  const mark = PLATFORM_MARKS[platform];
  return (
    <svg className="fx-mark" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d={mark.path} fill={mark.color} />
    </svg>
  );
}

// The eight dashes of the spinner: each a little fainter than the one before, so the brightest end
// seems to run round as the whole thing turns in eight steps
const DASHES = Array.from({ length: 8 }, (_, i) => ({ angle: i * 45, opacity: 1 - i * 0.115 }));

/** The spinner while it works, a check when it is done */
function Badge({ done }) {
  return (
    <span className="fx-badge" data-state={done ? 'done' : 'busy'} aria-hidden="true">
      <svg className="fx-spin" viewBox="0 0 40 40" focusable="false">
        {DASHES.map((dash) => (
          <line
            key={dash.angle}
            x1="20"
            y1="5.5"
            x2="20"
            y2="12.5"
            transform={`rotate(${dash.angle} 20 20)`}
            strokeOpacity={dash.opacity}
          />
        ))}
      </svg>
      <svg className="fx-tick" viewBox="0 0 40 40" focusable="false">
        <path d="M11 20.5 L17.5 27 L29 13.5" pathLength="100" />
      </svg>
    </span>
  );
}

/** Step 1: the white button, on its own in the middle */
function ButtonLayer({ buttonRef, pressed }) {
  return (
    <motion.div
      className="fx-layer fx-buttonlayer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: SWAP_MS / 1000, ease: 'easeIn' } }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      <span ref={buttonRef} className="fx-sync" data-pressed={pressed ? 'true' : 'false'}>
        Sync now
      </span>
    </motion.div>
  );
}

/** Steps 2 and 3: the spinner, the title and the four lines, all centred */
function FetchLayer({ done }) {
  return (
    <motion.div className="fx-layer fx-fetch" initial={false} exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
        <Badge done={done} />
      </motion.div>

      <div className="fx-words">
        <motion.p
          className="fx-load-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: EASE_OUT }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={done ? 'done' : 'busy'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {done ? 'Platforms synced' : 'Fetching platforms…'}
            </motion.span>
          </AnimatePresence>
        </motion.p>

        <ul className="fx-reads">
          {READS.map((label, i) => (
            <motion.li
              key={label}
              className="fx-read"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: (LINE_FIRST + i * LINE_STEP) / 1000, ease: EASE_OUT }}
            >
              {label}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/** Step 4: the platforms, one after another */
function ListLayer({ still }) {
  return (
    <motion.div className="fx-layer fx-listlayer" initial={false} exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeIn' } }}>
      <ul className="fx-plist" aria-hidden="true">
        {PLATFORMS.map((key, i) => (
          <motion.li
            key={key}
            className="fx-prow"
            initial={still ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 + i * 0.11, ease: EASE_OUT }}
          >
            <PlatformMark platform={key} />
            <span className="fx-pname">{PLATFORM_MARKS[key].name}</span>
            <span className="fx-synced">
              <CheckCircleIcon className="fx-ok" size={13} weight="fill" aria-hidden="true" />
              Synced
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function PlatformsDemo() {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const buttonRef = useRef(null);
  const inView = useInView(rootRef, { margin: '0px 0px -25% 0px' });
  // 'button' | 'fetch' | 'done' | 'list'
  const [stage, setStage] = useState(reduced ? 'list' : 'button');
  const [pressed, setPressed] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0, show: false, animate: false, down: false });

  useEffect(() => {
    if (reduced) {
      setStage('list');
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

    // Step 1: the button waits, the pointer comes from the lower right and clicks it
    const run = () => {
      setStage('button');
      setPressed(false);
      setPointer({ x: 0, y: 0, show: false, animate: false, down: false });
      later(BUTTON_WAIT, approach);
    };

    const approach = () => {
      const stageBox = stageRef.current.getBoundingClientRect();
      const box = buttonRef.current.getBoundingClientRect();
      const to = { x: box.left - stageBox.left + box.width * 0.6, y: box.top - stageBox.top + box.height * 0.55 };
      setPointer({ x: to.x + 80, y: to.y + 64, show: true, animate: false, down: false });
      raf = window.requestAnimationFrame(() => {
        raf = window.requestAnimationFrame(() => setPointer({ x: to.x, y: to.y, show: true, animate: true, down: false }));
      });
      later(POINTER_MS + 120, press);
    };

    const press = () => {
      setPressed(true);
      setPointer((value) => ({ ...value, down: true }));
      later(PRESS_MS, go);
    };

    // Step 2 to 4: the button gives way to the loader, then the check, then the platforms
    const go = () => {
      setPointer((value) => ({ ...value, show: false, down: false }));
      setStage('fetch');
      later(SWAP_MS + FETCH_MS, () => {
        setStage('done');
        later(DONE_MS, () => {
          setStage('list');
          later(LIST_MS, run);
        });
      });
    };

    run();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [inView, reduced]);

  return (
    <div ref={rootRef} className="fx-platforms">
      {/* The same list, for screen readers, whatever the picture is showing */}
      <ul className="fx-sr" aria-label="Linked platforms">
        {PLATFORMS.map((key) => (
          <li key={key}>{PLATFORM_MARKS[key].name}, synced</li>
        ))}
      </ul>

      <div ref={stageRef} className="fx-pstage" aria-hidden="true">
        <AnimatePresence mode="wait">
          {stage === 'button' ? <ButtonLayer key="button" buttonRef={buttonRef} pressed={pressed} /> : null}
          {stage === 'fetch' || stage === 'done' ? <FetchLayer key="fetch" done={stage === 'done'} /> : null}
          {stage === 'list' ? <ListLayer key="list" still={reduced} /> : null}
        </AnimatePresence>

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

      <p className="fx-foot">
        <ClockIcon size={14} weight="regular" aria-hidden="true" />
        Refreshed every night at 12:00 AM IST
      </p>
    </div>
  );
}
