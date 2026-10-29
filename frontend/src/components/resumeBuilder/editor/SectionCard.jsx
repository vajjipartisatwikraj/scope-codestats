import React, { useId } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Card } from "../../ui";

export const sectionDomId = (sectionId) => `rbe-section-${sectionId}`;

/**
 * A section of the resume as a card that collapses (a native disclosure: a button with
 * aria-expanded that controls the panel). The header says what is inside in a few words
 * ("2 entries", "Empty") so a closed card still tells its state.
 *
 *   section    { id, title }
 *   summary    the hint on the header
 *   open       whether the panel is shown
 *   onToggle   called when the header is pressed
 *   children   the fields
 */
const SectionCard = React.forwardRef(function SectionCard({ section, summary, open, onToggle, children }, ref) {
  const panelId = useId();

  return (
    <Card flush as="section" className="rbe-section" id={sectionDomId(section.id)} data-open={open ? "true" : "false"}>
      <h2 className="rbe-section__heading">
        <button
          ref={ref}
          type="button"
          className="rbe-section__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="rbe-section__title">{section.title}</span>
          <span className="rbe-section__hint">{summary}</span>
          <CaretDownIcon className="rbe-section__caret" size={20} weight="regular" aria-hidden="true" />
        </button>
      </h2>
      <div id={panelId} className="rbe-section__panel" hidden={!open}>
        {children}
      </div>
    </Card>
  );
});

export default SectionCard;
