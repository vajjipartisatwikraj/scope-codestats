import React from "react";

/**
 * A single tip in the carousel. The active card is the screen's one spotlight tile (inverted
 * against the theme); its neighbours recede into the plain card surface. A neighbour can be
 * pressed to bring it to the middle.
 *
 * Props: tip { title, description, Icon }, position (1-based), total, active, onSelect.
 * The width comes from the --sxs-tip-w variable set by TipsCarousel.
 */
const TipCard = ({ tip, position, total, active, onSelect }) => {
  const { Icon } = tip;

  return (
    <div
      className="sxs-tip"
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      aria-current={active ? "true" : undefined}
      data-active={active ? "true" : "false"}
      onClick={active ? undefined : onSelect}
    >
      <span className="sxs-tip__mark" aria-hidden="true">
        <Icon size={26} weight={active ? "fill" : "regular"} />
      </span>
      <p className="sxs-tip__count">
        Tip {position} of {total}
      </p>
      <h3 className="sxs-tip__title">{tip.title}</h3>
      <p className="sxs-tip__text">{tip.description}</p>
    </div>
  );
};

export default TipCard;
