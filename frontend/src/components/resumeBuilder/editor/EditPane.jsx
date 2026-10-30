import React, { useEffect, useMemo, useRef, useState } from "react";
import { Switch, TextField } from "../../ui";
import DocumentCard from "./DocumentCard";
import FieldEditor from "./FieldEditor";
import LayoutCard from "./LayoutCard";
import SectionCard, { sectionDomId } from "./SectionCard";
import SectionNav from "./SectionNav";
import { summarize } from "./resumeDetails";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The editing side of the editor: the document settings, a section navigator and one collapsible
 * card per section. Everything is generated from what the template uses, so a field a template adds
 * appears here with no change. A card holds the inputs of its fields and, when the template allows it,
 * the section's heading and a switch to start the section on a new page.
 *
 *   templates, template   the catalogue and the chosen template
 *   details               the resume's details (a value for every field, plus titles and breaks)
 *   importing
 *   onTemplate(id), onField(key, value), onSectionTitle(key, text), onBreak(key, on), onImport()
 *   onLayout(key, change), onLayoutReset()   the global text size, gaps and padding
 */
export default function EditPane({
  templates,
  template,
  details,
  importing,
  onTemplate,
  onField,
  onSectionTitle,
  onBreak,
  onImport,
  onLayout,
  onLayoutReset,
}) {
  const scrollRef = useRef(null);
  const sections = template.sections;
  // Only the first section is open at the start; the rest open when asked
  const [open, setOpen] = useState({});
  const [current, setCurrent] = useState("document");

  const isOpen = (section, index) => open[section.key] ?? index === 0;
  const allOpen = sections.every(isOpen);

  const navItems = useMemo(
    () => [{ id: "document", title: "Document" }, { id: "layout", title: "Layout" }, ...sections.map(({ key, title }) => ({ id: key, title }))],
    [sections],
  );

  const toggle = (section, index) =>
    setOpen((previous) => ({ ...previous, [section.key]: !isOpen(section, index) }));

  const toggleAll = () =>
    setOpen(Object.fromEntries(sections.map((section) => [section.key, !allOpen])));

  const goTo = (id) => {
    if (id !== "document" && id !== "layout") setOpen((previous) => ({ ...previous, [id]: true }));
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
      <SectionNav sections={navItems} current={current} allOpen={allOpen} onGo={goTo} onToggleAll={toggleAll} />

      <div className="rbe-edit__stack">
        <DocumentCard
          templates={templates}
          template={template}
          importing={importing}
          onTemplate={onTemplate}
          onImport={onImport}
        />

        <LayoutCard layout={details.layout} onChange={onLayout} onReset={onLayoutReset} />

        {sections.map((section, index) => {
          const title = (details.titles && details.titles[section.key]) || section.title;
          return (
            <SectionCard
              key={section.key}
              section={{ id: section.key, title }}
              summary={summarize(section, details)}
              open={isOpen(section, index)}
              onToggle={() => toggle(section, index)}
            >
              {section.titleEditable ? (
                <TextField
                  label="Heading on the resume"
                  hint={`Leave it empty to use “${section.title}”.`}
                  placeholder={section.title}
                  value={(details.titles && details.titles[section.key]) || ""}
                  maxLength={60}
                  autoComplete="off"
                  onChange={(event) => onSectionTitle(section.key, event.target.value)}
                />
              ) : null}

              {section.fields.map((definition) => (
                <FieldEditor
                  key={definition.key}
                  definition={definition}
                  value={details[definition.key]}
                  showLabel={section.fields.length > 1}
                  onChange={(value) => onField(definition.key, value)}
                />
              ))}

              {section.breakable ? (
                <Switch
                  label="Start this section on a new page"
                  description="Adds a page break before the section when the resume is printed or saved as PDF."
                  checked={Boolean(details.breaks && details.breaks[section.key])}
                  onChange={(checked) => onBreak(section.key, checked)}
                />
              ) : null}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
