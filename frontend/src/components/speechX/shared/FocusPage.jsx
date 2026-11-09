import React from "react";
import "./speechX.css";

const WIDTHS = ["narrow", "reading", "wide", "full"];

/**
 * FocusPage: the frame of a focus screen (setup, section list, feedback, results, runner). It
 * sits under a <FocusHeader /> and above the app footer, is at least as tall as the room between
 * them (`min-height: var(--sx-stage)`), centres its content at a calm maximum width and pads it
 * 16px on phones, 24px from 600px and 32px from 1200px.
 *
 * Props
 *   width ('reading')  the content width: 'narrow' 760px | 'reading' 880px | 'wide' 1100px | 'full' 1280px
 *   narrow, wide       shortcuts for width="narrow" and width="wide"
 *   center (false)     centre the content vertically in the stage
 *   gap (false)        put the var(--sx-gap) between the children (12px, 16px, 20px)
 *   as ('main')        the element; use 'div' where the screen already has a <main>
 *   className, style, ...rest   passed to the element
 *
 * Example:  <FocusHeader subtitle="VocalQ" /><FocusPage wide gap><SpeechCard .../></FocusPage>
 */
const FocusPage = ({ as: Component = "main", width = "reading", narrow = false, wide = false, center = false, gap = false, className, children, ...rest }) => {
  const size = narrow ? "narrow" : wide ? "wide" : WIDTHS.includes(width) ? width : "reading";
  return (
    <Component {...rest} className={className ? `sx-page ${className}` : "sx-page"} data-width={size} data-center={center ? "true" : undefined} data-gap={gap ? "true" : undefined}>
      {children}
    </Component>
  );
};

export default FocusPage;
