import React from "react";
import TonalMark from "./TonalMark";
import "./speechX.css";

/**
 * InfoLine: a tonal icon mark with a small label and a value beside it ("Duration / 45 min").
 * The label comes first in the markup and the value second, so a screen reader reads
 * "Duration, 45 min".
 *
 * Props
 *   icon      a Phosphor icon component (same as the old InfoLine)
 *   label     the muted caption
 *   value     the figure or text (tabular numerals)
 *   hue ('accent')  see TonalMark
 *   size (32)       px, the diameter of the mark
 *   as ('div')      the element ('li' inside a .sx-info-grid <ul>)
 *   className       passed to the root
 */
const InfoLine = ({ icon, label, value, hue = "accent", size = 32, as: Component = "div", className }) => (
  <Component className={className ? `sx-info ${className}` : "sx-info"}>
    {icon ? <TonalMark icon={icon} hue={hue} size={size} /> : null}
    <div className="sx-info__text">
      <p className="sx-info__label">{label}</p>
      <p className="sx-info__value">{value}</p>
    </div>
  </Component>
);

export default InfoLine;
