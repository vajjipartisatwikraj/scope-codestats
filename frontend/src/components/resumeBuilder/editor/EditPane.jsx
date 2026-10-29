import React, { useEffect, useMemo, useRef, useState } from "react";
import DocumentCard from "./DocumentCard";
import FieldEditor from "./FieldEditor";
import SectionCard, { sectionDomId } from "./SectionCard";
import SectionNav from "./SectionNav";
import { groupSections, summarize } from "./sections";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The editing side of the editor: the document settings, a section navigator and one collapsible
 * card per section. Everything is generated from the template definition, so a field added in
 * backend/resumeTemplates appears here with no change.
 *
 *   templates, template, fonts, fontId   the catalogues and the current choices
 *   fields                               [{ key, value, fontSize }]
 *   importing
 *   onTemplate(id), onFont(id), onField(key, patch), onImport()
 */
export default function EditPane({
  templates,
  template,
  fonts,
  fontId,
  fields,
  importing,
  onTemplate,
  onFont,
  onField,
  onImport,
}) {
  const scrollRef = useRef(null);
  const sections = useMemo(() => groupSections(template), [template]);
  // Only the first section is open at the start; the rest open when asked
  const [open, setOpen] = useState({});
  const [current, setCurrent] = useState("document");

  const isOpen = (section, index) => open[section.id] ?? index === 0;
  const allOpen = sections.every(isOpen);

  const navItems = useMemo(
    () => [{ id: "document", title: "Document" }, ...sections.map(({ id, title }) => ({ id, title }))],
    [sections],
  );

  const toggle = (section, index) =>
    setOpen((previous) => ({ ...previous, [section.id]: !isOpen(section, index) }));

  const toggleAll = () =>
    setOpen(Object.fromEntries(sections.map((section) => [section.id, !allOpen])));

  const goTo = (id) => {
    if (id !== "document") setOpen((previous) => ({ ...previous, [id]: true }));
    window.requestAnimationFrame(() => {
      const card = document.getElementById(sectionDomId(id));
      if (!card) return;
      card.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      const heading = card.querySelector(".rbe-section__toggle");
      if (heading) heading.focus({ preventScroll: true });
    });
  };

  // The pill of the section in view follows the scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = container.getBoundingClientRect().top + 96;
      let found = navItems[0].id;
      navItems.forEach((item) => {
        const card = document.getElementById(sectionDomId(item.id));
        if (card && card.getBoundingClientRect().top <= line) found = item.id;
      });
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [navItems]);

  return (
    <div className="rbe-edit" ref={scrollRef}>
      <SectionNav
        sections={navItems}
        current={current}
        allOpen={allOpen}
        onGo={goTo}
        onToggleAll={toggleAll}
      />

      <div className="rbe-edit__stack">
        <DocumentCard
          templates={templates}
          template={template}
          fonts={fonts}
          fontId={fontId}
          importing={importing}
          onTemplate={onTemplate}
          onFont={onFont}
          onImport={onImport}
        />

        {sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            summary={summarize(section, fields)}
            open={isOpen(section, index)}
            onToggle={() => toggle(section, index)}
          >
            {section.definitions.map((definition) => {
              const field = fields.find((item) => item.key === definition.key);
              if (!field) return null;
              return (
                <FieldEditor
                  key={definition.key}
                  template={template}
                  definition={definition}
                  field={field}
                  showLabel={section.definitions.length > 1}
                  onChange={(patch) => onField(definition.key, patch)}
                />
              );
            })}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
