import React, { useEffect, useRef } from "react";

/**
 * Brings a setup step in. Wrap each step in this and key it by the step name. The step slides in
 * from the side it comes from (24px) while it fades, over 240ms, on transform and opacity only;
 * under prefers-reduced-motion it only fades (CSS, setup.css).
 *
 * After the first step has been left, the step's heading (the element marked `data-step-heading`)
 * takes focus, so a keyboard or screen reader user lands at the top of the new step and hears its
 * title.
 *
 * Props
 *   direction   1 when moving forward (arrives from the right), -1 when moving back (from the left)
 *   animate     false for the first step shown, which has nothing to slide from
 *   children    the step
 */
const StepTransition = ({ direction = 1, animate = true, children }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!animate) return;
    const heading = ref.current?.querySelector("[data-step-heading]");
    if (heading) heading.focus({ preventScroll: true });
  }, [animate]);

  return (
    <div ref={ref} className="sxs-step" data-dir={direction < 0 ? "back" : "forward"} data-animate={animate ? "true" : "false"}>
      {children}
    </div>
  );
};

export default StepTransition;
