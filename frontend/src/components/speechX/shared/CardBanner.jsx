import React from "react";
import TonalMark from "./TonalMark";
import "./speechX.css";

/**
 * CardBanner: the heading strip of a card. A tonal icon circle, an optional small label, the title,
 * a line of description, and a slot at the right for a status badge or buttons. It replaces the old
 * blue band (the blue fill is gone: cards are flat and the accent is rare). A hairline under it
 * separates it from the card body.
 *
 * Props
 *   icon           a Phosphor icon component, shown in a TonalMark
 *   hue ('accent') the mark's hue, see TonalMark
 *   label          a small sentence-case line above the title ("Communication test")
 *   title          the heading text
 *   description    a muted line under the title (72ch at most)
 *   badge, actions nodes at the right (a status Badge, buttons). `badge` is the old prop.
 *   as ('h2')      the heading element; use 'h1' once per page (it gets the Headline size)
 *   compact (false)  the tighter version for narrow side cards
 *   divided (true)   the hairline under the banner
 *   children       shown full width under the text (chips, info lines)
 *   className      passed to the root
 *
 * The old `watermark` prop is gone (a decorative icon cropped into the corner).
 */
const CardBanner = ({ icon, hue = "accent", label, title, description, badge, actions, as: Heading = "h2", compact = false, divided = true, className, children }) => (
  <div className={className ? `sx-banner ${className}` : "sx-banner"} data-compact={compact ? "true" : undefined} data-divided={divided ? "true" : "false"}>
    {icon ? <TonalMark icon={icon} hue={hue} size={compact ? 40 : 48} /> : null}
    <div className="sx-banner__text">
      {label ? <p className="sx-banner__label">{label}</p> : null}
      <Heading className="sx-banner__title" data-level={Heading === "h1" ? "1" : undefined}>
        {title}
      </Heading>
      {description ? <p className="sx-banner__description">{description}</p> : null}
    </div>
    {badge || actions ? (
      <div className="sx-banner__aside">
        {badge}
        {actions}
      </div>
    ) : null}
    {children ? <div className="sx-banner__extra">{children}</div> : null}
  </div>
);

export default CardBanner;
