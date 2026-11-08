import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { BookOpenIcon } from '@phosphor-icons/react/dist/csr/BookOpen';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import PointerArrow from './PointerArrow';
import './CoursesDemo.css';

/**
 * The courses and opportunities tile as a short film that loops while the tile is on screen, two scenes in one
 * picture:
 *
 *   course   a course card (a cover, its name and size) with an "Enroll" button; a mouse pointer glides in and clicks it, the button gives a
 *            little, and it turns into a soft button-shaped card that says "Enrolled"
 *   jobs     a list of openings scrolls down and back up; one card comes out of the list while the others step
 *            back; the pointer clicks its "Apply" button and it turns into "Applied"
 *
 * The pointer belongs to the stage, not to a scene, and is placed from the measured button of the scene it is in,
 * so it lands on the button at any width. The area keeps one size through both scenes. It starts when the tile is
 * mostly in view and stops when it leaves. For people who asked for less motion it shows the finished "Enrolled"
 * card and nothing moves. Decorative (aria-hidden): the tile's title and sentence carry the meaning. The course
 * and the companies are made up.
 */

const COURSE = { name: 'Python foundations', meta: '12 modules' };
const JOBS = [
  { org: 'Northwind', role: 'Software engineer intern' },
  { org: 'Lumen Labs', role: 'Data analyst trainee' },
  { org: 'Orbit Systems', role: 'Frontend developer' },
  { org: 'Kestrel', role: 'Backend developer' },
  { org: 'Brightpath', role: 'QA engineer intern' },
  { org: 'Helix', role: 'Cloud support associate' },
];const PICKED = 2; // the opening that comes out of the list

// Times in ms
const COURSE_WAIT = 1300; // the course card on its own before the pointer comes
const POINTER_MS = 1000; // the pointer's trip to a button (also in CoursesDemo.css, .fx-pointer)
const PRESS_MS = 320; // the press, before the button turns
const COURSE_HOLD = 2300; // "Enrolled" stays
const SWAP_MS = 400; // a scene leaving
const JOBS_WAIT = 1500; // the list on its own before it scrolls (the scene is still coming in)
const SCROLL_DOWN_MS = 1300;
const SCROLL_BACK_MS = 1200;
const PICK_MS = 700; // the card coming out
const JOBS_HOLD = 2500; // "Applied" stays

const EASE_OUT = [0.22, 1, 0.36, 1];

function Label({ idle, done }) {
  return (
    <>
      <i className="fx-cs-ripple" />
      <span className="fx-cs-idle">{idle}</span>
      <span className="fx-cs-done">
        <CheckCircleIcon size={14} weight="fill" aria-hidden="true" />
        {done}
      </span>
    </>
  );
}

function Scene({ children, reduced }) {
  return (
    <motion.div
      className="fx-layer fx-cs-layer"
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: SWAP_MS / 1000, ease: 'easeIn' } }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

export default function CoursesDemo() {
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const enrollRef = useRef(null);
  const trackRef = useRef(null);
  const viewRef = useRef(null);
  const pickedRef = useRef(null);
  const applyRef = useRef(null);
  const inView = useInView(rootRef, { margin: '0px 0px -22% 0px' });

  const [scene, setScene] = useState('course'); // 'course' | 'jobs'
  const [enroll, setEnroll] = useState(reduced ? 'done' : 'idle'); // 'idle' | 'press' | 'done'
  const [apply, setApply] = useState('idle'); // 'idle' | 'press' | 'done'
  const [picked, setPicked] = useState(false);
  const [scroll, setScroll] = useState({ y: 0, ms: 0 });
  const [pointer, setPointer] = useState({ x: 0, y: 0, show: false, animate: false, down: false });

  useEffect(() => {
    if (reduced) {
      setScene('course');
      setEnroll('done');
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

    // The pointer glides to the middle of a button from the lower right
    const approach = (button) => {
      if (!button || !stageRef.current) return;
      const stageBox = stageRef.current.getBoundingClientRect();
      const box = button.getBoundingClientRect();
      const to = { x: box.left - stageBox.left + box.width * 0.6, y: box.top - stageBox.top + box.height * 0.55 };
      setPointer({ x: to.x + 80, y: to.y + 64, show: true, animate: false, down: false });
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        raf = window.requestAnimationFrame(() => setPointer({ x: to.x, y: to.y, show: true, animate: true, down: false }));
      });
    };
    const hidePointer = () => setPointer((value) => ({ ...value, show: false, down: false }));

    // Scene 1: the course, enrolled
    const run = () => {
      setScene('course');
      setEnroll('idle');
      setApply('idle');
      setPicked(false);
      setScroll({ y: 0, ms: 0 });
      setPointer({ x: 0, y: 0, show: false, animate: false, down: false });

      later(COURSE_WAIT, () => approach(enrollRef.current));
      later(COURSE_WAIT + POINTER_MS + 120, () => {
        setEnroll('press');
        setPointer((value) => ({ ...value, down: true }));
      });
      later(COURSE_WAIT + POINTER_MS + 120 + PRESS_MS, () => {
        setEnroll('done');
        hidePointer();
      });
      later(COURSE_WAIT + POINTER_MS + 120 + PRESS_MS + COURSE_HOLD, jobs);
    };

    // Scene 2: the openings scroll, one comes out, and it is applied to
    const jobs = () => {
      setScene('jobs');
      later(JOBS_WAIT, () => {
        const view = viewRef.current;
        const track = trackRef.current;
        if (!view || !track) return;
        setScroll({ y: -Math.max(0, track.scrollHeight - view.clientHeight), ms: SCROLL_DOWN_MS });
      });
      later(JOBS_WAIT + SCROLL_DOWN_MS + 200, () => {
        const view = viewRef.current;
        const track = trackRef.current;
        const card = pickedRef.current;
        if (!view || !track || !card) return;
        const far = Math.max(0, track.scrollHeight - view.clientHeight);
        const wanted = card.offsetTop - (view.clientHeight - card.offsetHeight) / 2;
        setScroll({ y: -Math.min(far, Math.max(0, wanted)), ms: SCROLL_BACK_MS });
      });
      const settled = JOBS_WAIT + SCROLL_DOWN_MS + 200 + SCROLL_BACK_MS + 200;
      later(settled, () => setPicked(true));
      later(settled + PICK_MS, () => approach(applyRef.current));
      later(settled + PICK_MS + POINTER_MS + 120, () => {
        setApply('press');
        setPointer((value) => ({ ...value, down: true }));
      });
      later(settled + PICK_MS + POINTER_MS + 120 + PRESS_MS, () => {
        setApply('done');
        hidePointer();
      });
      later(settled + PICK_MS + POINTER_MS + 120 + PRESS_MS + JOBS_HOLD, run);
    };

    run();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [inView, reduced]);

  return (
    <div ref={rootRef} className="fx-cs">
      <div ref={stageRef} className="fx-cs-stage" aria-hidden="true">
        <AnimatePresence mode="wait">
          {scene === 'course' ? (
            <Scene key="course" reduced={reduced}>
              <div className="fx-course">
                <div className="fx-course-cover">
                  <span className="fx-course-mark">
                    <BookOpenIcon size={26} weight="fill" aria-hidden="true" />
                  </span>
                </div>
                <div className="fx-course-body">
                  <span className="fx-course-title">{COURSE.name}</span>
                  <span className="fx-row-meta">{COURSE.meta}</span>
                  <span ref={enrollRef} className="fx-cs-button fx-cs-button--wide" data-state={enroll}>
                    <Label idle="Enroll" done="Enrolled" />
                  </span>
                </div>
              </div>            </Scene>
          ) : (
            <Scene key="jobs" reduced={reduced}>
              <div ref={viewRef} className="fx-jobs" data-picked={picked ? 'true' : 'false'}>
                <ul
                  ref={trackRef}
                  className="fx-jobs-track"
                  style={{ transform: `translateY(${scroll.y}px)`, transitionDuration: `${scroll.ms}ms` }}
                >
                  {JOBS.map((job, index) => {
                    const isPicked = index === PICKED;
                    return (
                      <li
                        key={job.org}
                        ref={isPicked ? pickedRef : undefined}
                        className="fx-row fx-job"
                        data-picked={isPicked && picked ? 'true' : 'false'}
                      >
                        <span className="fx-row-icon fx-row-icon--org">{job.org.charAt(0)}</span>
                        <span className="fx-row-main">
                          <span className="fx-row-title">{job.role}</span>
                          <span className="fx-row-meta">{job.org}</span>
                        </span>
                        <span
                          ref={isPicked ? applyRef : undefined}
                          className="fx-cs-button fx-cs-button--pill"
                          data-state={isPicked ? apply : 'idle'}
                          data-picked={isPicked && picked ? 'true' : 'false'}
                        >
                          <Label idle="Apply" done="Applied" />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Scene>
          )}
        </AnimatePresence>

        <div
          className="fx-pointer"
          data-show={pointer.show ? 'true' : 'false'}
          data-animate={pointer.animate ? 'true' : 'false'}
          data-down={pointer.down ? 'true' : 'false'}
          style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }}
          aria-hidden="true"
        >
          <PointerArrow />
        </div>
      </div>
    </div>
  );
}
