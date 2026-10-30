import { pluralize } from "../../ui";

/**
 * Small helpers for a resume's `details`, the plain object the editor edits and the server turns
 * into HTML. Its shape is fixed by backend/resumeTemplates/fields.js: a text or list for each field,
 * plus `titles` (the student's own section headings) and `breaks` (sections that start a new page).
 */

/** True when a value (text, list or entry) carries something worth counting */
export const isFilled = (value) => {
  if (Array.isArray(value)) return value.some(isFilled);
  if (value && typeof value === "object") return Object.values(value).some(isFilled);
  return String(value ?? "").trim().length > 0;
};

/** An empty entry of a repeater: "" for text, [] for bullets */
export const blankItem = (subFields) =>
  subFields.reduce((entry, subField) => {
    entry[subField.key] = subField.type === "bullets" ? [] : "";
    return entry;
  }, {});

/** The short hint on a section card: "2 entries", "Added", "1 of 2 filled" or "Empty" */
export function summarize(section, details) {
  const { fields } = section;

  if (fields.length === 1) {
    const value = details[fields[0].key];
    if (fields[0].type === "repeater") {
      const count = (Array.isArray(value) ? value : []).filter(isFilled).length;
      return count === 0 ? "Empty" : pluralize(count, "entry", "entries");
    }
    return isFilled(value) ? "Added" : "Empty";
  }

  const filled = fields.filter((field) => isFilled(details[field.key])).length;
  return filled === 0 ? "Empty" : `${filled} of ${fields.length} filled`;
}

/**
 * Puts the profile snapshot into the details. Only a field the profile has something for is replaced,
 * so a section the profile knows nothing about stays as the student wrote it. Section headings and
 * page breaks are never touched.
 *
 * @returns {{ details: object, applied: string[] }} the new details and the fields that changed
 */
export function applyProfile(details, snapshot, sections) {
  const next = { ...details };
  const applied = [];
  sections.forEach((section) =>
    section.fields.forEach((field) => {
      const incoming = snapshot?.[field.key];
      if (incoming !== undefined && isFilled(incoming)) {
        next[field.key] = incoming;
        applied.push(field.key);
      }
    }),
  );
  return { details: next, applied };
}

/** A file name from the resume's title: letters, digits and dashes only */
export const fileNameOf = (title) =>
  String(title || "resume")
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "resume";
