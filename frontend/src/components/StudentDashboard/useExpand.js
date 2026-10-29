import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// How long the panel takes to open and to close (closing is faster), and the easing of both. The
// radius is the radius of a card, which the window keeps all the way.
export const OPEN_MS = 540;
export const CLOSE_MS = 400;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const RADIUS = 24;

/**
 * The state and the motion of a card that opens up to fill the whole dashboard.
 *
 * THE MOTION. The panel is laid out at its full size from the first frame and shown through a
 * window (clip-path) that starts exactly on the card that was clicked and grows to the edges of
 * the dashboard, rounded like a card all the way. Nothing is squashed or stretched, because the
 * content never changes size: only the window does. While it grows, the panel fades in under it
 * so the card's own content gives way to the panel instead of popping out, and the rest of the
 * dashboard fades away (see StudentDashboard.css, [data-expand]). Closing runs it backwards, a
 * little faster, from wherever the window is, onto the card's current place.
 *
 * Phases: closed -> opening -> open -> closing -> closed. A request to close during 'opening'
 * is honoured at once.
 *
 * Below 1000px the dashboard is a stack and scrolls, so there is no card to grow from: the
 * panel simply fades and rises in place of the stack, and closes without a shrink.
 *
 * With reduced motion the window is skipped and the panel only fades (opacity carries the state
 * change; there is no movement).
 *
 * @param {object}  options
 * @param {React.RefObject<HTMLElement>} options.rootRef  the dashboard element
 * @param {boolean} options.morph  true when the card-to-panel motion applies (1000px and up)
 * @returns {{ view: string|null, phase: string, panelRef: React.RefObject, open: Function, close: Function }}
 */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The clip-path that matches a card, measured inside the panel */
function windowOf(panel, card) {
  const inner = panel.getBoundingClientRect();
  const box = card.getBoundingClientRect();
  const top = Math.max(0, box.top - inner.top);
  const right = Math.max(0, inner.right - box.right);
  const bottom = Math.max(0, inner.bottom - box.bottom);
  const left = Math.max(0, box.left - inner.left);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${RADIUS}px)`;
}

const FULL = `inset(0px 0px 0px 0px round ${RADIUS}px)`;

export default function useExpand({ rootRef, morph }) {
  const [state, setState] = useState({ view: null, phase: 'closed' });
  const phaseRef = useRef('closed');
  const panelRef = useRef(null);
  const originRef = useRef(null);
  const resumeFrom = useRef(null); // the window to shrink from when closing starts mid-opening
  const pageTop = useRef(0); // where the page was scrolled when a stack gave way to a panel
  phaseRef.current = state.phase;

  const open = useCallback((view, card) => {
    if (phaseRef.current !== 'closed') return;
    originRef.current = card;
    resumeFrom.current = null;
    pageTop.current = window.scrollY;
    setState({ view, phase: 'opening' });
  }, []);

  const close = useCallback(() => {
    const phase = phaseRef.current;
    if (phase !== 'opening' && phase !== 'open') return;
    const panel = panelRef.current;
    resumeFrom.current = panel ? window.getComputedStyle(panel).clipPath : null;
    setState((current) => ({ ...current, phase: 'closing' }));
  }, []);

  // ---- Opening ------------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (state.phase !== 'opening') return undefined;
    const panel = panelRef.current;
    const card = originRef.current;
    if (!panel) return undefined;

    const reduced = prefersReducedMotion();
    let motion;
    if (!morph) window.scrollTo(0, 0);
    if (morph && card && !reduced) {
      const from = windowOf(panel, card);
      motion = panel.animate([{ clipPath: from }, { clipPath: FULL }], { duration: OPEN_MS, easing: EASE_OUT, fill: 'backwards' });
      panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear', fill: 'backwards' });
    } else {
      motion = panel.animate(
        reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: reduced ? 160 : 300, easing: EASE_OUT, fill: 'backwards' }
      );
    }

    let alive = true;
    motion.finished
      .then(() => {
        if (alive) setState((current) => (current.phase === 'opening' ? { ...current, phase: 'open' } : current));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [state.phase, morph]);

  // ---- Closing ------------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (state.phase !== 'closing') return undefined;
    const panel = panelRef.current;
    const card = originRef.current;
    const finish = () => {
      setState({ view: null, phase: 'closed' });
      // A stack is back: put the page where it was
      if (!morph) window.scrollTo(0, pageTop.current);
      // Hand the keyboard back to the card that was opened
      const button = card && card.querySelector ? card.querySelector('.sd-card__open, .sd-card__expand') : null;
      window.requestAnimationFrame(() => (button || card)?.focus?.({ preventScroll: true }));
    };

    if (!panel) {
      finish();
      return undefined;
    }

    const reduced = prefersReducedMotion();
    let alive = true;
    let motions;
    if (morph && card && !reduced) {
      const from = resumeFrom.current && resumeFrom.current !== 'none' ? resumeFrom.current : FULL;
      const to = windowOf(panel, card);
      motions = [
        panel.animate([{ clipPath: from }, { clipPath: to }], { duration: CLOSE_MS, easing: EASE_OUT, fill: 'forwards' }),
        panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: CLOSE_MS - 200, easing: 'linear', fill: 'forwards' }),
      ];
    } else if (reduced) {
      motions = [panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards' })];
    } else {
      // A stack that scrolls has nothing to shrink onto
      finish();
      return undefined;
    }

    Promise.all(motions.map((motion) => motion.finished))
      .then(() => {
        if (alive) finish();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [state.phase, morph]);

  // ---- The rest of the dashboard cannot be reached while a panel covers it ---------------------
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const covered = root.querySelectorAll(':scope > .sd-left, :scope > .sd-rail');
    covered.forEach((node) => {
      if (state.phase === 'closed') node.removeAttribute('inert');
      else node.setAttribute('inert', '');
    });
    return () => covered.forEach((node) => node.removeAttribute('inert'));
  }, [rootRef, state.phase]);

  // ---- Escape goes back ----------------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'opening' && state.phase !== 'open') return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, close]);

  return { view: state.view, phase: state.phase, panelRef, open, close };
}
