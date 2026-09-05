// Helpers for the resume builder. Field definitions (labels, defaults, font
// size bounds, page geometry) come from the backend template config, so these
// helpers only reshape data - they never hardcode a field.

// Used only when a template omits its bounds or a field its default, so the
// steppers and the saved payload always carry a real number.
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 48;
const FALLBACK_FONT_SIZE = 13;

const resolveFontSize = (size, definition) => {
  const num = Number(size);
  if (Number.isFinite(num) && num > 0) return num;
  return Number.isFinite(definition?.defaultFontSize)
    ? definition.defaultFontSize
    : FALLBACK_FONT_SIZE;
};

// [{ key, value, fontSize }] -> { key: { value, fontSize } }
export const fieldsToMap = (fields) =>
  (Array.isArray(fields) ? fields : []).reduce((map, field) => {
    if (field?.key) map[field.key] = field;
    return map;
  }, {});

// A blank repeater entry, with one empty bullet so the editor shows an input
export const blankItem = (subFields = []) =>
  subFields.reduce((item, subField) => {
    item[subField.key] = subField.type === "bullets" ? [""] : "";
    return item;
  }, {});

/** Value a field starts with when nothing is stored for it yet. */
const defaultValue = (definition) => {
  if (definition.type === "repeater") {
    return Array.from({ length: definition.defaultItems ?? 1 }, () =>
      blankItem(definition.subFields),
    );
  }
  if (definition.type === "bullets") return [""];
  return definition.defaultValue ?? "";
};

// Guards against a stored value whose shape no longer matches the field type,
// which happens when a template changes or the user switches templates.
const coerceValue = (definition, value) => {
  if (value === undefined || value === null) return defaultValue(definition);

  if (definition.type === "repeater") {
    if (!Array.isArray(value)) return defaultValue(definition);
    return value.map((item) => ({
      ...blankItem(definition.subFields),
      ...(item && typeof item === "object" ? item : {}),
    }));
  }

  if (definition.type === "bullets") {
    return Array.isArray(value) ? value.map((point) => String(point ?? "")) : [""];
  }

  return typeof value === "string" ? value : "";
};

/**
 * Ordered, fully populated field list for a template. Missing fields fall back
 * to the template defaults and unknown stored fields are dropped, which mirrors
 * normalizeFields() on the server.
 */
export const buildFields = (template, storedFields) => {
  if (!template) return [];
  const stored = fieldsToMap(storedFields);

  return template.fields.map((definition) => {
    const current = stored[definition.key];
    return {
      key: definition.key,
      value: coerceValue(definition, current?.value),
      fontSize: resolveFontSize(current?.fontSize, definition),
    };
  });
};

// True when an imported value actually carries something worth applying
const hasContent = (value) => {
  if (Array.isArray(value)) return value.some((item) => hasContent(item));
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => hasContent(item));
  }
  return String(value ?? "").trim().length > 0;
};

/**
 * Overlays a profile snapshot from the API onto the current fields.
 *
 * Only fields the template declares are touched, and only when the profile has
 * something for them, so an empty profile section never wipes existing content.
 * Font sizes are always preserved. A field may declare `importKey` when its key
 * differs from the snapshot key.
 */
export const applyProfileSnapshot = (template, fields, snapshot) => {
  if (!template || !snapshot) return { fields, applied: [] };

  const applied = [];

  const nextFields = template.fields.map((definition) => {
    const field =
      fields.find((item) => item.key === definition.key) || {
        key: definition.key,
        value: "",
        fontSize: resolveFontSize(undefined, definition),
      };

    const incoming = snapshot[definition.importKey || definition.key];
    if (!hasContent(incoming)) return field;

    applied.push(definition.label);
    return { ...field, value: coerceValue(definition, incoming) };
  });

  return { fields: nextFields, applied };
};

/** Font size bounds for a template, with fallbacks if it declares none. */
export const getFontSizeBounds = (template) => {
  const { minFontSize, maxFontSize } = template?.typography || {};
  return {
    minFontSize: Number.isFinite(minFontSize) ? minFontSize : MIN_FONT_SIZE,
    maxFontSize: Number.isFinite(maxFontSize) ? maxFontSize : MAX_FONT_SIZE,
  };
};

export const clampFontSize = (template, size) => {
  const { minFontSize, maxFontSize } = getFontSizeBounds(template);
  const num = Number(size);
  if (!Number.isFinite(num)) return minFontSize;
  return Math.min(maxFontSize, Math.max(minFontSize, Math.round(num)));
};

export const setFieldValue = (fields, key, patch) =>
  fields.map((field) => (field.key === key ? { ...field, ...patch } : field));

// Compares only what gets persisted, so the Save button reflects real changes.
export const isResumeDirty = (draft, saved) =>
  JSON.stringify({
    title: draft.title,
    template: draft.template,
    font: draft.font,
    fields: draft.fields,
  }) !==
  JSON.stringify({
    title: saved.title,
    template: saved.template,
    font: saved.font,
    fields: saved.fields,
  });

export const formatUpdatedAt = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
