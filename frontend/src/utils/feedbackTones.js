/**
 * Tiny interface sounds, synthesised with the Web Audio API so no audio files
 * are needed. Both are quiet and short, and clearly different:
 *   start  two rising notes  ("go")
 *   stop   two falling notes ("done")
 *
 * Each function returns how long the sound lasts in milliseconds, so a caller
 * can wait for it to finish before opening the microphone (otherwise the
 * recording would pick the sound up).
 */

const VOLUME = 0.05;

let context = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!context || context.state === "closed") context = new AudioCtx();
  if (context.state === "suspended") context.resume();
  return context;
}

function playNotes(notes) {
  const ctx = getContext();
  if (!ctx) return 0;

  let start = ctx.currentTime + 0.01;
  notes.forEach(({ freq, duration }) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = freq;

    // Short fade in and out so there is no click.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(VOLUME, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    start += duration;
  });

  return notes.reduce((sum, note) => sum + note.duration, 0) * 1000;
}

/** Played just before recording begins. */
export const playStartTone = () =>
  playNotes([
    { freq: 660, duration: 0.08 },
    { freq: 990, duration: 0.11 },
  ]);

/** Played once a recording has finished. */
export const playStopTone = () =>
  playNotes([
    { freq: 880, duration: 0.08 },
    { freq: 587, duration: 0.13 },
  ]);
