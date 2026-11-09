import React from "react";
import { TonalMark } from "../shared";

/**
 * The heading block of a check step: a tonal mark, the step title (an h2 that takes focus when the
 * step opens, see StepTransition) and one line of help.
 *
 * Props: icon (Phosphor component), title, description, align ('center' | 'start'), id (for aria-labelledby),
 * hideTitle (keeps the title for screen readers and focus, but does not show it)
 */
const StepHead = ({ icon, title, description, align = "center", id, hideTitle = false }) => (
  <header className="sxs-stephead" data-align={align}>
    {icon ? <TonalMark icon={icon} size={48} /> : null}
    <h2 className={hideTitle ? "sx-sr" : "sxs-stephead__title"} id={id} tabIndex={-1} data-step-heading>
      {title}
    </h2>
    {description ? <p className="sxs-stephead__text">{description}</p> : null}
  </header>
);

export default StepHead;
