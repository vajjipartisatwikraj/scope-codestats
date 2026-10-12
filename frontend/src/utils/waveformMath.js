/**
 * Pure math for the recording waveform, kept apart from the canvas code so it
 * can be tested without a browser.
 */

/** Quietest and loudest levels the display maps to 0 and 1, in dBFS. */
export const DB_FLOOR = -56;
export const DB_CEIL = -16;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** Root-mean-square of a block of samples in the range -1..1. */
export function rmsOf(samples) {
  const n = samples.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / n);
}

/**
 * Maps an RMS value to a 0..1 display level on a decibel scale.
 *
 * Loudness is perceived logarithmically, so a linear scale would leave normal
 * speech as a sliver next to a shout. Anything below DB_FLOOR (room noise) maps
 * to 0, so a silent microphone shows flat dots instead of jittering.
 */
export function levelFromRms(rms) {
  if (!Number.isFinite(rms) || rms <= 1e-7) return 0;
  const db = 20 * Math.log10(rms);
  return clamp01((db - DB_FLOOR) / (DB_CEIL - DB_FLOOR));
}

/**
 * Smooths a new reading against the previous one: rises at once (so a syllable
 * is never missed) and falls gradually (so bars do not flicker).
 */
export function smoothLevel(previous, next, release = 0.5) {
  return next >= previous ? next : previous * release + next * (1 - release);
}

/**
 * Curves a 0..1 decibel level so a soft syllable and a strong one look clearly
 * different instead of everything crowding near the top. Microphones already
 * apply automatic gain in the browser, so a fixed scale is enough and keeps the
 * display predictable: the same sound always draws the same bar.
 */
export function shapeLevel(level, exponent = 1.35) {
  return clamp01(Math.pow(clamp01(level), exponent));
}
/** How many bars fit across `width` pixels. Always at least 1. */
export function barCountFor(width, barWidth, gap) {
  if (!(width > 0)) return 1;
  return Math.max(1, Math.floor((width + gap) / (barWidth + gap)));
}

/** Bar height in pixels for a 0..1 level: a dot when silent, full height when loud. */
export function barHeightFor(level, barWidth, maxHeight) {
  const usable = Math.max(0, maxHeight - barWidth);
  return barWidth + clamp01(level) * usable;
}
