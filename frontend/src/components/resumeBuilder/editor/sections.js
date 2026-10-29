import { fieldsToMap } from "../../../utils/resume";
import { pluralize } from "../../ui";

/** True when a value (text, list or entry) carries something worth counting */
export const isFilled = (value) => {
  if (Array.isArray(value)) return value.some(isFilled);
  if (value && typeof value === "object") return Object.values(value).some(isFilled);
  return String(value ?? "").trim().length > 0;
};

/**
 * Groups the template's fields into the section cards of the editor. A field that names a
 * `section` starts its own card; the fields before the first section (the name and the contact
 * line) share one "Personal details" card, so a template that adds fields needs no editor change.
 *
 * @returns [{ id, title, definitions }]
 */
export function groupSections(template) {
  const sections = [];
  template.fields.forEach((definition) => {
    const last = sections[sections.length - 1];
    if (definition.section) {
      sections.push({ id: definition.key, title: definition.section, definitions: [definition], implicit: false });
    } else if (last && last.implicit) {
      last.definitions.push(definition);
    } else {
      sections.push({
        id: definition.key,
        title: sections.length === 0 ? "Personal details" : "More details",
        definitions: [definition],
        implicit: true,
      });
    }
  });
  return sections;
}

/** The short hint on a section card header: "2 entries", "Added", "1 of 2 filled", "Empty" */
export function summarize(section, fields) {
  const byKey = fieldsToMap(fields);
  const { definitions } = section;

  if (definitions.length === 1) {
    const value = byKey[definitions[0].key]?.value;
    if (definitions[0].type === "repeater") {
      const count = (Array.isArray(value) ? value : []).filter(isFilled).length;
      return count === 0 ? "Empty" : pluralize(count, "entry", "entries");
    }
    return isFilled(value) ? "Added" : "Empty";
  }

  const filled = definitions.filter((definition) => isFilled(byKey[definition.key]?.value)).length;
  return filled === 0 ? "Empty" : `${filled} of ${definitions.length} filled`;
}
