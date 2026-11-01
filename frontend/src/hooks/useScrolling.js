import { useEffect, useRef, useState } from 'react';

/**
 * Tells whether an element is being scrolled right now, so its scrollbar can be shown only then
 * (a slim bar that appears while the list moves and fades out when it stops). Put the returned ref
 * on the scrolling element and read the flag into a data attribute the CSS can style:
 *
 *   const [listRef, scrolling] = useScrolling();
 *   <ul ref={listRef} data-scrolling={scrolling}>...</ul>
 *
 * The flag turns true on the first scroll event and back to false `delay` ms after the last one
 * (wheel, touch, keyboard and dragging the bar all fire scroll events).
 *
 *   delay   ms of stillness before the bar hides (default 700)
 */
export default function useScrolling(delay = 700) {
  const ref = useRef(null);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    let timer = null;
    const onScroll = () => {
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), delay);
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, [delay]);

  return [ref, scrolling];
}
