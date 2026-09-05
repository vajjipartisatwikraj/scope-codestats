/**
 * Resume template registry.
 *
 * Add a template module here and it becomes available to the API, the model's
 * enum and the editor UI. Templates are plain config objects - see classic.js
 * for the supported field types.
 */
const classic = require("./classic");

const templates = [classic];

const templatesById = new Map(templates.map((template) => [template.id, template]));

const TEMPLATE_IDS = templates.map((template) => template.id);

const DEFAULT_TEMPLATE_ID = classic.id;

const getTemplate = (templateId) =>
  templatesById.get(templateId) || templatesById.get(DEFAULT_TEMPLATE_ID);

const DEFAULT_MAX_LENGTH = 600;
const DEFAULT_MAX_ITEMS = 10;
const DEFAULT_MIN_FONT_SIZE = 6;
const DEFAULT_MAX_FONT_SIZE = 48;
const FALLBACK_FONT_SIZE = 13;

const toText = (value, definition) =>
  String(value ?? definition.defaultValue ?? "").slice(
    0,
    definition.maxLength || DEFAULT_MAX_LENGTH,
  );

const toBullets = (value, definition) =>
  (Array.isArray(value) ? value : [])
    .slice(0, definition.maxItems || DEFAULT_MAX_ITEMS)
    .map((point) => toText(point, definition));

// One repeater entry, keyed by its subField definitions so unknown keys are dropped
const toItem = (subFields, item) =>
  subFields.reduce((entry, subField) => {
    const raw = item?.[subField.key];
    entry[subField.key] =
      subField.type === "bullets" ? toBullets(raw, subField) : toText(raw, subField);
    return entry;
  }, {});

const blankItem = (subFields) => toItem(subFields, {});

/** Value a field starts with when the client sends nothing for it. */
const defaultValue = (definition) => {
  if (definition.type === "repeater") {
    return Array.from({ length: definition.defaultItems || 0 }, () =>
      blankItem(definition.subFields),
    );
  }
  if (definition.type === "bullets") return [];
  return definition.defaultValue ?? "";
};

const toValue = (definition, value) => {
  if (value === undefined) return defaultValue(definition);

  switch (definition.type) {
    case "repeater":
      return (Array.isArray(value) ? value : [])
        .slice(0, definition.maxItems || DEFAULT_MAX_ITEMS)
        .map((item) => toItem(definition.subFields, item));
    case "bullets":
      return toBullets(value, definition);
    default:
      return toText(value, definition);
  }
};

/**
 * Rebuilds a resume's fields from the template definition, so the stored shape
 * always matches the template: unknown keys are dropped, missing keys get their
 * defaults, values are coerced to the field's type, and font sizes are clamped.
 */
const normalizeFields = (templateId, incomingFields) => {
  const template = getTemplate(templateId);
  // Fall back rather than trust the template: an undefined bound turns the
  // clamp below into NaN, which mongoose then rejects on save.
  const minFontSize = template.typography.minFontSize ?? DEFAULT_MIN_FONT_SIZE;
  const maxFontSize = template.typography.maxFontSize ?? DEFAULT_MAX_FONT_SIZE;

  const byKey = new Map(
    (Array.isArray(incomingFields) ? incomingFields : [])
      .filter((field) => field && typeof field === "object")
      .map((field) => [field.key, field]),
  );

  return template.fields.map((definition) => {
    const incoming = byKey.get(definition.key) || {};

    const rawFontSize = Number(incoming.fontSize);
    const fallback = Number.isFinite(definition.defaultFontSize)
      ? definition.defaultFontSize
      : FALLBACK_FONT_SIZE;
    const fontSize =
      Number.isFinite(rawFontSize) && rawFontSize > 0
        ? Math.min(maxFontSize, Math.max(minFontSize, Math.round(rawFontSize)))
        : fallback;

    return {
      key: definition.key,
      value: toValue(definition, incoming.value),
      fontSize,
    };
  });
};

module.exports = {
  templates,
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  normalizeFields,
};
