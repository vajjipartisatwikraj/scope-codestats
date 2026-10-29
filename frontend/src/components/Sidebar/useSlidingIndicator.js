import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// How long the highlight takes to reach another item. A longer trip takes a little longer, so a
// jump across the whole list still reads as one smooth move.
const MIN_TRAVEL_MS = 260;
const MAX_TRAVEL_MS = 440;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * One highlight that slides between the sidebar items.
 *
 * The highlight is a single element behind the links. When the current page changes it travels
 * to the new link and takes on that link's width, so it reads as one pill moving over to occupy
 * the new button, rather than one pill fading out and another fading in.
 *
 * It follows the link's real box, measured in layout units, so it also stays glued to the link
 * while the rail opens and closes (the link's width animates then), when a font arrives, or when
 * a badge appears. Only a change of page animates the highlight; everything else moves it
 * instantly, so it never lags behind the link.
 *
 * While it travels, the nav carries data-travel="true" plus two variables, --ind-duration and
 * --ind-color-delay. Sidebar.css uses them to time the colour change of the two links, so the
 * text turns dark just as the pill arrives under it.
 *
 * @param navRef        the <nav>: the highlight's positioning parent
 * @param indicatorRef  the highlight element inside it
 * @param activeId      id of the current item, or null when no item matches the page
 * @param layoutKey     changes when items appear or disappear and the others move
 */
export default function useSlidingIndicator({ navRef, indicatorRef, activeId, layoutKey }) {
  const state = useRef({
    visible: false,
    activeId: null,
    box: null,
    travelling: false,
    timer: 0,
  });

  // The current link's box, relative to the nav. Layout units (offset*) ignore transforms such as
  // the press scale, so the highlight never ends up a few pixels short.
  const measure = useCallback(() => {
    const link = navRef.current?.querySelector('[data-active="true"]');
    if (!link || link.offsetWidth === 0) return null;
    return { x: link.offsetLeft, y: link.offsetTop, w: link.offsetWidth, h: link.offsetHeight };
  }, [navRef]);

  const place = useCallback(
    (box) => {
      const indicator = indicatorRef.current;
      if (!indicator) return;
      indicator.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
      indicator.style.width = `${box.w}px`;
      indicator.style.height = `${box.h}px`;
      state.current.box = box;
    },
    [indicatorRef]
  );

  const setTravel = useCallback(
    (on) => {
      const nav = navRef.current;
      if (!nav) return;
      if (on) nav.setAttribute('data-travel', 'true');
      else nav.removeAttribute('data-travel');
    },
    [navRef]
  );

  // The current page changed (slide), or the list changed under it (snap).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;

    const s = state.current;
    const changedItem = s.activeId !== activeId;
    s.activeId = activeId;
    window.clearTimeout(s.timer);
    s.travelling = false;

    const box = measure();

    // No item on this page: let the highlight fade away where it is.
    if (!box) {
      setTravel(false);
      indicator.style.opacity = '0';
      s.visible = false;
      return;
    }

    // First placement, coming back after a gap, or the list moved: no travel.
    if (!s.visible || !changedItem || !s.box) {
      setTravel(false);
      place(box);
      indicator.style.opacity = '1';
      s.visible = true;
      return;
    }

    const distance = Math.abs(box.x - s.box.x) + Math.abs(box.y - s.box.y);
    const duration = Math.round(clamp(220 + distance * 0.35, MIN_TRAVEL_MS, MAX_TRAVEL_MS));
    const colorDelay = Math.round(duration * (0.1 + 0.4 * Math.min(1, distance / 400)));

    nav.style.setProperty('--ind-duration', `${duration}ms`);
    nav.style.setProperty('--ind-color-delay', `${colorDelay}ms`);
    setTravel(true);
    place(box);

    s.travelling = true;
    s.timer = window.setTimeout(() => {
      s.travelling = false;
      setTravel(false);
      // Settle on the link's final box in case it changed size during the trip.
      const latest = measure();
      if (latest) place(latest);
    }, duration + 60);
  }, [activeId, layoutKey, measure, place, setTravel, navRef, indicatorRef]);

  // Keep the highlight on its link while the link changes size or place: the rail opening and
  // closing, a font arriving, a badge appearing.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return undefined;

    const s = state.current;
    const sync = () => {
      if (s.travelling) return;
      const box = measure();
      const indicator = indicatorRef.current;
      if (!box || !indicator) return;
      place(box);
      if (!s.visible) {
        indicator.style.opacity = '1';
        s.visible = true;
      }
    };

    const observer = new ResizeObserver(sync);
    observer.observe(nav);
    const link = nav.querySelector('[data-active="true"]');
    if (link) observer.observe(link);
    return () => observer.disconnect();
  }, [activeId, layoutKey, measure, place, navRef, indicatorRef]);

  useEffect(() => () => window.clearTimeout(state.current.timer), []);
}
