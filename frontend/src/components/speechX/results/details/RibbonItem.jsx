import React from "react";

/**
 * A small caption over a value in the details band. `large` is the title-sized value of the
 * headline figures; `compact` (the band folded while the page is scrolled) steps the value down
 * a size. The change of size is the only thing that animates.
 */
const RibbonItem = ({ label, children, large = false, compact = false }) => (
  <div className="sxe-item" data-large={large ? "true" : undefined} data-compact={compact ? "true" : undefined}>
    <span className="sxe-item__label">{label}</span>
    <span className="sxe-item__value">{children}</span>
  </div>
);

export default RibbonItem;
