import React, { useEffect, useState } from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { useCount, usePlay, useTyped } from './useFeaturePlay';
import './AnimatedPictures.css';

/**
 * The small pictures of the feature tiles, each a calm animation that plays when it is on screen:
 *
 *   RankPicture        the rank climbs from last place to #25, and the department and batch ranks with it
 *   HeatmapPicture     a wave fills in the heatmap, then the days of this week light up and the count goes to 3 of 7; it loops while on screen
 *   TimerPicture       the clock counts down and the questions are answered one by one
 *   SpeechPicture      the recorded answer grows and is played through; the section types appear
 *   CodePadPicture     the languages appear, then the program's output is typed
 *   AnalyticsPicture   the department bars grow
 *
 * How it works (useFeaturePlay.js): the markup is always the finished picture. Each root carries
 * data-play, false while it is off screen (CSS holds it in its starting state) and true while it plays.
 * With reduced motion data-play is true and the animations are off, so the finished picture is shown.
 * All the figures are sample data; the pictures are decorative (aria-hidden).
 */

const pad = (n) => String(n).padStart(2, '0');

// ─── Rank ───────────────────────────────────────────────────────────────────

export function RankPicture() {
  const [ref, play, reduced] = usePlay();
  const overall = useCount({ from: 2649, to: 25, play, reduced, duration: 2200 });
  const department = useCount({ from: 1262, to: 11, play, reduced, duration: 2000, delay: 150 });
  const batch = useCount({ from: 898, to: 4, play, reduced, duration: 1800, delay: 300 });
  return (
    <div ref={ref} className="fx-rank fx-a" data-play={play ? 'true' : 'false'} aria-hidden="true">
      <span className="fx-rank-num">#{overall.toLocaleString('en-US')}</span>
      <span className="fx-rank-of">overall, out of 2,649 students</span>
      <ul className="fx-rank-list">
        <li>
          <span>In your department</span>
          <span>#{department.toLocaleString('en-US')}</span>
        </li>
        <li>
          <span>In your batch</span>
          <span>#{batch.toLocaleString('en-US')}</span>
        </li>
      </ul>
    </div>
  );
}

// ─── Heatmap and consistency ────────────────────────────────────────────────

// 16 weeks of practice as a fixed pattern (the same on every render): scattered days, a few quiet weeks,
// lighter weekends
const WEEKS = 16;
const noise = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const HEAT = Array.from({ length: WEEKS * 7 }, (_, i) => {
  const week = Math.floor(i / 7);
  const day = i % 7;
  const quiet = week % 7 === 3 || week === 11;
  const r = noise(i + 1) * (quiet ? 0.45 : 1) * (day >= 5 ? 0.85 : 1);
  if (r > 0.88) return 4;
  if (r > 0.7) return 3;
  if (r > 0.48) return 2;
  return r > 0.28 ? 1 : 0;
});

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PRACTISED = [1, 2, 3]; // Monday to Wednesday, so the count reads "3 of 7"

// The film runs about 3s; it then stays for HEAT_HOLD_MS, fades out for HEAT_FADE_MS and starts again
const HEAT_FILM_MS = 3000;
const HEAT_HOLD_MS = 3200;
const HEAT_FADE_MS = 500; // keep the same as the opacity transition of .fx-heatpic in FeatureShowcase.css

export function HeatmapPicture() {
  const [ref, inView, reduced] = usePlay();
  const [on, setOn] = useState(false); // the film is running
  const [leaving, setLeaving] = useState(false); // the finished picture is fading out

  // While the picture is on screen the film plays, holds, fades out and plays again. Off screen it rests.
  useEffect(() => {
    if (reduced) return undefined;
    if (!inView) {
      setOn(false);
      setLeaving(false);
      return undefined;
    }
    const timers = [];
    const later = (ms, fn) => timers.push(window.setTimeout(fn, ms));
    const cycle = () => {
      setLeaving(false);
      setOn(true);
      later(HEAT_FILM_MS + HEAT_HOLD_MS, () => setLeaving(true));
      later(HEAT_FILM_MS + HEAT_HOLD_MS + HEAT_FADE_MS, () => {
        setOn(false);
        setLeaving(false);
      });
      // a short gap with the film reset, so the animations start again from the beginning
      later(HEAT_FILM_MS + HEAT_HOLD_MS + HEAT_FADE_MS + 120, cycle);
    };
    cycle();
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [inView, reduced]);

  const play = reduced ? true : on;
  const practised = useCount({ from: 0, to: PRACTISED.length, play, reduced, duration: 780, delay: 2000 });
  return (
    <div
      ref={ref}
      className="fx-heatpic fx-a"
      data-play={play ? 'true' : 'false'}
      data-leave={leaving ? 'true' : 'false'}
      aria-hidden="true"
    >
      <div className="fx-heat">
        {HEAT.map((level, i) => (
          <i key={i} data-l={level} style={{ '--c': Math.floor(i / 7), '--r': i % 7 }} />
        ))}
      </div>
      <div className="fx-week">
        <div className="fx-week-head">
          <span className="fx-week-label">This week</span>
          <span className="fx-week-count">{practised} of 7</span>
        </div>
        <ul className="fx-days">
          {DAYS.map((day, n) => {
            const k = PRACTISED.indexOf(n);
            return (
              <li key={n} data-on={k >= 0 ? 'true' : 'false'} style={{ '--n': n, '--k': Math.max(k, 0) }}>
                {day}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Practice arena ─────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, state: 'done' },
  { n: 2, state: 'done' },
  { n: 3, state: 'done' },
  { n: 4, state: 'current' },
  { n: 5, state: 'todo' },
  { n: 6, state: 'todo' },
];

export function TimerPicture() {
  const [ref, play, reduced] = usePlay();
  const left = useCount({ from: 45 * 60, to: 42 * 60 + 18, play, reduced, duration: 2600, delay: 200 });
  return (
    <div ref={ref} className="fx-shot fx-a" data-play={play ? 'true' : 'false'} aria-hidden="true">
      <span className="fx-label">Time left</span>
      <span className="fx-timer">
        {pad(Math.floor(left / 60))}:{pad(left % 60)}
      </span>
      <ul className="fx-steps">
        {STEPS.map((step) => (
          <li key={step.n} className="fx-step" data-state={step.state} style={{ '--n': step.n - 1 }}>
            {step.state === 'done' ? <CheckCircleIcon size={16} weight="fill" aria-hidden="true" /> : step.n}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Communication tests ────────────────────────────────────────────────────

// A recorded answer: bar heights from two slow waves, so the picture is the same on every render
const WAVE = Array.from({ length: 34 }, (_, i) => Math.round(18 + 70 * Math.abs(Math.sin(i * 0.62) * Math.cos(i * 0.21))));
const SECTIONS = ['Reading', 'Repeat', 'Storytelling', 'Fill in the blanks', 'Email writing'];

export function SpeechPicture() {
  const [ref, play] = usePlay();
  return (
    <div ref={ref} className="fx-shot fx-a" data-play={play ? 'true' : 'false'} aria-hidden="true">
      <div className="fx-wave">
        {WAVE.map((height, i) => (
          <i key={i} style={{ height: `${height}%`, '--n': i }} data-played={i < 21 ? 'true' : 'false'} />
        ))}
      </div>
      <ul className="fx-chips">
        {SECTIONS.map((name, i) => (
          <li key={name} className="fx-chip fx-r" style={{ '--n': 5 + i * 0.5 }}>
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── CodePad ────────────────────────────────────────────────────────────────

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++'];

export function CodePadPicture() {
  const [ref, play, reduced] = usePlay();
  const output = useTyped({ text: 'Hello, World!', play, reduced, delay: 1400, perChar: 55 });
  return (
    <div ref={ref} className="fx-shot fx-a" data-play={play ? 'true' : 'false'} aria-hidden="true">
      <ul className="fx-chips">
        {LANGUAGES.map((name, i) => (
          <li key={name} className="fx-chip fx-r" style={{ '--n': i * 0.6 }}>
            {name}
          </li>
        ))}
      </ul>
      <p className="fx-out">
        <span>Output</span>
        {output.shown}
        <i className="fx-out__caret" data-done={output.done ? 'true' : 'false'} />
      </p>
    </div>
  );
}

// ─── Analytics for mentors and admins ───────────────────────────────────────

const DEPARTMENTS = [
  { name: 'CSE', value: 82 },
  { name: 'IT', value: 74 },
  { name: 'ECE', value: 69 },
  { name: 'EEE', value: 57 },
  { name: 'MECH', value: 48 },
];

function Percent({ to, play, reduced, delay }) {
  const value = useCount({ from: 0, to, play, reduced, duration: 1100, delay });
  return <b>{value}%</b>;
}

export function AnalyticsPicture() {
  const [ref, play, reduced] = usePlay();
  return (
    <div ref={ref} className="fx-shot fx-a" data-play={play ? 'true' : 'false'} aria-hidden="true">
      <span className="fx-label">Practised this week, by department</span>
      <ul className="fx-bars" style={{ marginTop: '0.875rem' }}>
        {DEPARTMENTS.map((department, i) => (
          <li key={department.name} className="fx-bar" style={{ '--n': i }}>
            <span>{department.name}</span>
            <span className="fx-bar-track">
              <i style={{ width: `${department.value}%` }} />
            </span>
            <Percent to={department.value} play={play} reduced={reduced} delay={250 + i * 110} />
          </li>
        ))}
      </ul>
    </div>
  );
}
