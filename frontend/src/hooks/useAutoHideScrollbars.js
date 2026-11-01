import { useEffect } from 'react';
import './autoHideScrollbars.css';

/**
 * Shows the scrollbars of a screen only while something on it is being scrolled: a slim bar that
 * appears with the first scroll event of an area and fades out `delay` ms after the last one (wheel,
 * touch, keyboard and dragging the bar all count). Call it once in a screen; it covers every
 * scrolling area of that screen, the page itself included, and switches off when the screen closes.
 *
 * It marks the page with the class `autohide-scrollbars` and the area that is moving with
 * `data-scroll-active`; autoHideScrollbars.css draws the bar from those two, so nothing re-renders.
 * The code editor draws its own scrollbars and is not affected.
 *
 *   delay   ms of stillness before the bar hides (default 700)
 */
export default function useAutoHideScrollbars(delay = 700) {
  useEffect(() => {
    const page = document.documentElement;
    const timers = new WeakMap();

    const onScroll = (event) => {
      // The page itself scrolls with the document as the target
      const area = event.target === document ? page : event.target;
      if (!(area instanceof Element)) return;
      area.setAttribute('data-scroll-active', '');
      window.clearTimeout(timers.get(area));
      timers.set(area, window.setTimeout(() => area.removeAttribute('data-scroll-active'), delay));
    };

    page.classList.add('autohide-scrollbars');
    // Scroll events do not bubble, so they are caught on the way down
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      page.classList.remove('autohide-scrollbars');
      document.querySelectorAll('[data-scroll-active]').forEach((area) => area.removeAttribute('data-scroll-active'));
    };
  }, [delay]);
}
