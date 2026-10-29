import React, { isValidElement } from "react";
import "./speechX.css";

const HUES = ["accent", "blue", "teal", "amber", "violet", "coral", "green", "sky", "slate"];

/**
 * TonalMark: an icon in a tonal circle. 'accent' (the default) is accent-soft with accent text; the
 * other hues are the DESIGN.md data series (a tint of the hue behind an icon in a deeper or lighter
 * mix of it). It is decorative: it is hidden from assistive technology, so put the meaning in text.
 *
 * Props
 *   icon          a Phosphor icon component (icon={MicrophoneIcon}) or an element (icon={<Foo />})
 *   hue ('accent')  'accent' | 'blue' | 'teal' | 'amber' | 'violet' | 'coral' | 'green' | 'sky' | 'slate'
 *                 (SECTION_TYPE_META[type].hue gives one per section type)
 *   size (40)     px, the diameter of the circle; the icon is 50% of it (at least 16px)
 *   weight ('regular')  the Phosphor weight; use 'fill' only for a selected item
 *   className, style    passed to the circle
 *   children      shown instead of the icon (a number, a letter)
 */
const TonalMark = ({ icon: Icon, hue = "accent", size = 40, weight = "regular", className, style, children }) => {
  const iconSize = Math.max(16, Math.round(size * 0.5));
  let content = children;
  if (content === undefined || content === null) {
    if (isValidElement(Icon)) content = Icon;
    else if (Icon) content = <Icon size={iconSize} weight={weight} aria-hidden="true" />;
  }
  return (
    <span className={className ? `sx-mark ${className}` : "sx-mark"} data-hue={HUES.includes(hue) ? hue : "accent"} style={{ "--sx-mark-size": `${size}px`, ...style }} aria-hidden="true">
      {content}
    </span>
  );
};

export default TonalMark;
