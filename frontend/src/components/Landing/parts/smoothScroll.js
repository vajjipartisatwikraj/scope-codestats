import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Smooth scrolling for the landing pages, with Lenis: the wheel and the keyboard move the page toward where
 * they point with a soft ease, instead of in steps. It scrolls the real page (the window), so everything that
 * listens to the scroll (framer-motion's useScroll and useInView, CSS scroll timelines, position: sticky) works
 * as it does without it.
 *
 * What it leaves alone, on purpose:
 *   - people who asked for less motion (prefers-reduced-motion): the page scrolls natively;
 *   - touch screens: Lenis does not take over touch scrolling, so a phone keeps its own momentum;
 *   - an element with data-lenis-prevent (or a scrollable element, which Lenis detects): it scrolls by itself.
 *
 * startSmoothScroll() returns a function that stops it; useLandingShell.js starts it when a landing page is
 * shown and stops it when the page goes away, so the rest of the app never sees it.
 * scrollToSection(id) is the one way to move to a part of the page from code: it glides when smooth
 * scrolling is on and uses the browser's own smooth scroll when it is not.
 */

let current = null;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function startSmoothScroll() {
  if (typeof window === 'undefined' || reducedMotion()) return () => {};

  const lenis = new Lenis({
    autoRaf: true,
    lerp: 0.085, // how much of the distance is covered each frame: lower is silkier, higher is snappier
    wheelMultiplier: 0.95,
    smoothWheel: true,
    anchors: false,
  });
  current = lenis;

  return () => {
    if (current === lenis) current = null;
    lenis.destroy();
  };
}

/** Glides to the element with this id, stopping where its scroll-margin-top (the room for the navbar) says */
export function scrollToSection(id) {
  const element = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!element) return;
  if (current) {
    const margin = parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0;
    current.scrollTo(element, { offset: -margin, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    return;
  }
  element.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}
