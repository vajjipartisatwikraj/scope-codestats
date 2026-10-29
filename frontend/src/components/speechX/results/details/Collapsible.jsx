import React from "react";

/**
 * Shows or hides its content by animating the space it takes (220ms), along one axis:
 * `axis="y"` shrinks the height, `axis="x"` the width. The space itself animates (grid track from
 * 1fr to 0fr), so neighbouring elements slide into place instead of jumping, and the content keeps
 * its natural size and is clipped, never squashed. Nothing is hidden from assistive technology:
 * folded content is only clipped, so a screen reader still reads the details band in full.
 * Reduced motion makes it instant. Used by the details band that folds while the page scrolls
 * (this replaces the old Collapsible; ui Disclosure is an accordion item and is used for the
 * questions).
 *
 *   open   true shows the content
 *   axis   'y' (default) | 'x'
 */
const Collapsible = ({ open, axis = "y", className, children }) => (
  <div className={className ? `sxe-fold ${className}` : "sxe-fold"} data-axis={axis} data-open={open ? "true" : "false"}>
    <div className="sxe-fold__inner">{children}</div>
  </div>
);

export default Collapsible;
