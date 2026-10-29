import React from "react";
import "./speechX.css";

/**
 * Reveal: the entrance of a block. It fades in while rising a few pixels (transform and opacity
 * only, CSS only). Blocks given increasing `delay` (or `index`) appear one after another.
 *
 * Props (same names and units as the old setup/Reveal.jsx, so ported code keeps working)
 *   delay (0)       seconds to wait before the entrance (0.1 = 100ms)
 *   index           stagger shortcut: waits index x 0.06s, added to `delay`
 *   y (12)          px the block rises from
 *   duration (0.28) seconds the entrance takes (stay between 0.22 and 0.32)
 *   leaving (false) fades the block back out (180ms), used just before navigating away
 *   still (false)   no entrance at all, for blocks a parent animation already moves
 *   as ('div')      the element
 *   className, style, ...rest   passed to the element
 *
 * Under prefers-reduced-motion there is no movement, only a 150ms fade.
 */
const Reveal = ({ as: Component = "div", delay = 0, index = 0, y = 12, duration = 0.28, leaving = false, still = false, className, style, children, ...rest }) => {
  const wait = Math.max(0, delay) + Math.max(0, index) * 0.06;
  return (
    <Component
      {...rest}
      className={className ? `sx-reveal ${className}` : "sx-reveal"}
      data-still={still ? "true" : undefined}
      data-leaving={leaving ? "true" : undefined}
      style={{
        "--sx-reveal-delay": `${Math.round(wait * 1000)}ms`,
        "--sx-reveal-duration": `${Math.round(duration * 1000)}ms`,
        "--sx-reveal-y": `${y}px`,
        ...style,
      }}
    >
      {children}
    </Component>
  );
};

export default Reveal;
