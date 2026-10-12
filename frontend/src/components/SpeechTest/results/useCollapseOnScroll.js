import { useEffect, useState } from "react";

/**
 * Tells whether a scrolling element has been scrolled far enough that a header
 * above it should shrink.
 *
 * Two thresholds (collapse past `collapseAt`, reopen only back near the top)
 * stop it flickering around a single line. It also refuses to collapse when
 * there is barely anything to scroll: shrinking the header makes the scroll area
 * taller, and with little content that could pull the page back to the top and
 * reopen the header in a loop.
 *
 * @param {React.RefObject<HTMLElement>} ref  the scrolling element
 * @param {boolean} active  attach once the element exists
 */
const useCollapseOnScroll = (ref, active, { collapseAt = 48, expandAt = 8, minOverflow = 240 } = {}) => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!active || !element) return undefined;

    const update = () => {
      const top = element.scrollTop;
      const overflow = element.scrollHeight - element.clientHeight;
      setCollapsed((current) =>
        current ? top > expandAt : top > collapseAt && overflow > minOverflow
      );
    };

    update();
    element.addEventListener("scroll", update, { passive: true });
    return () => element.removeEventListener("scroll", update);
  }, [ref, active, collapseAt, expandAt, minOverflow]);

  return collapsed;
};

export default useCollapseOnScroll;
