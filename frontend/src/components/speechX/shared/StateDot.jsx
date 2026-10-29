import React from "react";
import { STATE_ICON, STATE_KEYS, STATE_LABEL } from "./states";
import "./speechX.css";

const SIZES = { sm: 24, md: 36, lg: 44 };

/**
 * StateDot: a circle in the colour of a question state (see states.js). Without children it holds
 * the state's icon; with children (a question number) it shows the number and puts the icon on a
 * small inverted badge at the corner, so the state is readable without colour either way.
 *
 * Props
 *   state ('open')   'answered' | 'current' | 'open' | 'later' | 'review' | 'flagged'
 *   size ('md')      'sm' 24px | 'md' 36px | 'lg' 44px (use 'lg' for something a finger presses)
 *   children         usually the question number
 *   label            the accessible name; default STATE_LABEL[state]. With a number: "3, Answered"
 *   decorative (false)  hidden from assistive technology, for a dot that sits next to its own word
 *   ring             CSS colour of the 2px ring around the corner badge; default the surface.
 *                    Set it on a raised or canvas background: ring="var(--ds-canvas)"
 *   className, style   passed to the dot
 *
 * Example:  <StateDot state="answered" size="lg">3</StateDot>
 */
export const StateDot = ({ state = "open", size = "md", children, label, decorative = false, ring, className, style }) => {
  const key = STATE_ICON[state] ? state : "open";
  const Icon = STATE_ICON[key];
  const hasNumber = children !== undefined && children !== null && children !== false;
  const px = SIZES[size] || SIZES.md;
  const name = label || (hasNumber ? `${children}, ${STATE_LABEL[key]}` : STATE_LABEL[key]);
  const iconSize = hasNumber ? 12 : Math.round(px * 0.6);

  return (
    <span
      className={className ? `sx-state-dot ${className}` : "sx-state-dot"}
      data-state={key}
      data-size={SIZES[size] ? size : "md"}
      style={ring ? { "--sx-ring": ring, ...style } : style}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? "true" : undefined}
    >
      {hasNumber ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sx-state-dot__badge" aria-hidden="true">
            <Icon size={iconSize} weight="bold" aria-hidden="true" />
          </span>
        </>
      ) : (
        <Icon size={iconSize} weight="bold" aria-hidden="true" />
      )}
    </span>
  );
};

/**
 * StateLegend: the states as a list, each a StateDot and its word, optionally with a count.
 *
 * Props
 *   states            which to show, in order; default answered, current, open, later, review
 *                     (STATE_KEYS has all six, with flagged)
 *   counts            optional { answered: 4, open: 2 }: prints the number after the word
 *   label             accessible name of the list (default "Question states")
 *   className, style  passed to the list
 *
 * Example:  <StateLegend counts={{ answered: 6, open: 4 }} />
 */
export const StateLegend = ({ states = ["answered", "current", "open", "later", "review"], counts, label = "Question states", className, style }) => (
  <ul className={className ? `sx-legend ${className}` : "sx-legend"} style={style} aria-label={label}>
    {states
      .filter((state) => STATE_KEYS.includes(state))
      .map((state) => (
        <li key={state} className="sx-legend__item">
          <StateDot state={state} size="sm" decorative />
          <span>{STATE_LABEL[state]}</span>
          {counts && typeof counts[state] === "number" ? <span className="sx-legend__count">{counts[state]}</span> : null}
        </li>
      ))}
  </ul>
);

export default StateDot;
