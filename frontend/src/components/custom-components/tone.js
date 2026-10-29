import { useEffect, useState } from 'react';

/**
 * Helpers for the status components (ProgressBar, SignalBars, ScoreRing, AnimatedCheck ...).
 * Plain functions and one small hook: no styling.
 */

// A tone is a name for a design token. Any other string is taken as a CSS colour, so a caller can
// also pass 'var(--ds-series-teal)' or a colour of its own.
const TONES = {
  accent: { fill: 'var(--ds-accent)', soft: 'var(--ds-accent-soft)', ink: 'var(--ds-accent-text)' },
  success: { fill: 'var(--ds-success)', soft: 'var(--ds-success-soft)', ink: 'var(--ds-success)' },
  good: { fill: 'var(--ds-success)', soft: 'var(--ds-success-soft)', ink: 'var(--ds-success)' },
  warning: { fill: 'var(--ds-warning)', soft: 'var(--ds-warning-soft)', ink: 'var(--ds-warning)' },
  danger: { fill: 'var(--ds-danger)', soft: 'var(--ds-danger-soft)', ink: 'var(--ds-danger)' },
  neutral: { fill: 'var(--ds-bar-muted)', soft: 'var(--ds-high)', ink: 'var(--ds-muted)' },
  muted: { fill: 'var(--ds-bar-muted)', soft: 'var(--ds-high)', ink: 'var(--ds-muted)' },
};

/** True when `tone` is one of the named tones above. */
export const isNamedTone = (tone) => Object.prototype.hasOwnProperty.call(TONES, tone);

/**
 * The colours of a tone: { fill, soft, ink }.
 *   fill  the colour of a bar, a ring or an icon
 *   soft  a quiet tint of it, for a disc or a badge behind an icon
 *   ink   the same hue as text (for the accent it is the readable accent-text role)
 * An unknown string is a CSS colour: fill and ink are that colour and soft is a 16% mix of it.
 */
export function toneColors(tone, fallback = 'accent') {
  if (isNamedTone(tone)) return TONES[tone];
  if (typeof tone === 'string' && tone.trim() !== '') {
    return { fill: tone, soft: `color-mix(in srgb, ${tone} 16%, transparent)`, ink: tone };
  }
  return TONES[fallback];
}

/** The band of a 0..1 share, as a tone name: 'success' from 70%, 'warning' from 40%, else 'danger'. */
export const toneForShare = (share) => (share >= 0.7 ? 'success' : share >= 0.4 ? 'warning' : 'danger');

const QUERY = '(prefers-reduced-motion: reduce)';

/** True while the user asks for reduced motion. Follows a change of the setting. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(QUERY);
    const update = () => setReduced(media.matches);
    update();
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update);
      else media.removeListener(update);
    };
  }, []);

  return reduced;
}
