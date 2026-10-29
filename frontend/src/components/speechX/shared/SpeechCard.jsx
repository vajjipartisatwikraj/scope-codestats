import React from "react";
import CardBanner from "./CardBanner";
import "./speechX.css";

/**
 * SpeechCard: the flat card of the speech screens (24px corners, no border, no shadow). With a
 * `title` it starts with a CardBanner; the children go in the padded body (24px, 16px on phones).
 *
 * Props
 *   tone ('plain')   'plain' (surface) | 'raised' (one step up, for a card on a surface or a side card)
 *   padded (true)    false removes the body padding (a list or table that runs to the edges)
 *   fill (false)     height: 100%, so cards in a row share one height
 *   minHeight        a CSS length, for the old SetupCard `minHeight`
 *   as ('section')   the element
 *
 *   Banner (shown when `title` is given; all the CardBanner props)
 *   title, description, label, icon, hue, badge, actions, compact, divided, headingAs ('h2')
 *
 *   footer           a node under the body (buttons), padded like the body
 *   className, style, ...rest   passed to the card
 *
 * Example:  <SpeechCard icon={MicrophoneIcon} title="Check your microphone" description="..." badge={<ExamStatusBadge status="live" />}>...</SpeechCard>
 */
const SpeechCard = ({
  tone = "plain",
  padded = true,
  fill = false,
  minHeight,
  as: Component = "section",
  title,
  description,
  label,
  icon,
  hue,
  badge,
  actions,
  compact,
  divided,
  headingAs,
  footer,
  className,
  style,
  children,
  ...rest
}) => (
  <Component
    {...rest}
    className={className ? `sx-card ${className}` : "sx-card"}
    data-tone={tone === "raised" ? "raised" : "plain"}
    data-padded={padded ? "true" : "false"}
    data-fill={fill ? "true" : undefined}
    style={minHeight ? { minHeight, ...style } : style}
  >
    {title ? <CardBanner icon={icon} hue={hue} label={label} title={title} description={description} badge={badge} actions={actions} as={headingAs} compact={compact} divided={divided} /> : null}
    {children ? <div className="sx-card__body">{children}</div> : null}
    {footer ? <div className="sx-card__footer">{footer}</div> : null}
  </Component>
);

export default SpeechCard;
