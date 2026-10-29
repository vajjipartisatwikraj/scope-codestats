import React from "react";
import { Button } from "../../ui";

/**
 * The section navigator: a sticky row of pills, one per section, that opens the section and
 * scrolls to it. The section in view is marked with aria-current. At its end, a button opens or
 * closes every section at once.
 *
 *   sections        [{ id, title }]
 *   current         the id of the section in view
 *   allOpen         whether every section is open (the end button then closes them)
 *   onGo(id)        open and scroll to a section
 *   onToggleAll()
 */
export default function SectionNav({ sections, current, allOpen, onGo, onToggleAll }) {
  return (
    <div className="rbe-nav">
      <nav className="rbe-nav__list" aria-label="Sections of the resume">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className="rbe-nav__item"
            aria-current={current === section.id ? "location" : undefined}
            onClick={() => onGo(section.id)}
          >
            {section.title}
          </button>
        ))}
      </nav>
      <Button variant="ghost" size="sm" onClick={onToggleAll}>
        {allOpen ? "Collapse all" : "Expand all"}
      </Button>
    </div>
  );
}
