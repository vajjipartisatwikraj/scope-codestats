import React from "react";
import "./runner.css";

/**
 * The area between the fixed top bar and the app footer. It is exactly `var(--sx-stage)` tall,
 * never scrolls itself, and anything taller than the screen scrolls inside its own column.
 *
 * `layout`
 *   split   (default) the question list on the left (300px from 900px wide, a block on top below
 *           that) and the question on the right
 *   review  one centred column, 1100px at most
 *   center  one centred card, for the loading and error states
 *
 * It is the page's `main` landmark.
 */
const RunnerStage = ({ layout = "split", children, className, ...rest }) => (
  <main {...rest} className={className ? `sxr-stage ${className}` : "sxr-stage"}>
    <div className="sxr-stage__grid" data-layout={layout}>
      {children}
    </div>
  </main>
);

export default RunnerStage;
