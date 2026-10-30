/**
 * The whole "template engine" of the resume builder: a few small functions, no dependencies.
 *
 * A resume template is one HTML file with {{placeholders}}. This file turns it into the student's
 * resume, and tells the editor which inputs the template needs.
 *
 * Placeholders
 *   {{name}}             the value, HTML-escaped. **bold**, *italic* and `code` are understood and a
 *                        line break in the text becomes <br>.
 *   {{@name}}            a link for an href. Only http(s), mailto and tel links come out; anything
 *                        else becomes empty. It is escaped for an attribute.
 *   {{$section}}         the heading of a section: the student's own wording, or the default.
 *   {{~section}}         ` data-break="true"` when the student asked for a new page before the
 *                        section, otherwise nothing. Put it on the section's opening tag.
 *   {{#name}} ... {{/name}}   a list: repeats once per entry (an entry is skipped when empty). Inside,
 *                        {{field}} reads the entry, and {{.}} is the entry itself in a list of strings.
 *                        When the value is a single text, it is shown once if it is not empty.
 *   {{?name}} ... {{/name}}   shown once, without repeating, when the value is not empty. Use it to
 *                        wrap a whole section so an empty one leaves no heading behind.
 *   {{^name}} ... {{/name}}   shown only when the value IS empty.
 *
 * Layout (the student's global size, gap and padding choices)
 *   {{fontScale}} {{gapScale}} {{padScale}}   plain numbers around 1 (0.8 to 1.2 for text, 0.4 to 1.6 for
 *                        gaps, 0.52 to 1.48 for padding). Templates read them once, in :root, as
 *                        --fs, --gs and --ps, and multiply their font sizes, gaps and page margins by them.
 *
 * Every value goes through escapeHtml, so what a student types can never become markup or script.
 */
const { SECTIONS, TITLED_SECTIONS } = require("./fields");

// ---- Text and links ---------------------------------------------------------------------------

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Escaped text with the light formatting resumes need: bold, italic, code and line breaks */
const formatText = (value) =>
  escapeHtml(value)
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\r?\n/g, "<br>");

/** A link that is safe to put in an href, or "" */
const safeUrl = (value) => {
  const text = String(value ?? "").trim().slice(0, 300);
  if (!text) return "";

  if (/^https?:/i.test(text)) {
    try {
      new URL(text);
      return text;
    } catch {
      return "";
    }
  }
  if (/^(mailto|tel):/i.test(text)) return text;
  // Any other scheme (javascript:, data:, vbscript: ...) is refused
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return "";
  // "linkedin.com/in/name" is a web address without its scheme
  if (/^[\w-]+(\.[\w-]+)+(\/|\?|#|$)/.test(text)) return `https://${text}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return `mailto:${text}`;
  return "";
};

// ---- Parsing the template ----------------------------------------------------------------------

const TAG = /\{\{\s*([#^?/@$~]?)\s*([\w.]+)\s*\}\}/g;

const parseCache = new Map();

/** Turns the template source into a tree of text, values and blocks (cached by source) */
function parse(source) {
  if (parseCache.has(source)) return parseCache.get(source);

  const root = { children: [] };
  const stack = [root];
  let last = 0;
  let match;
  TAG.lastIndex = 0;

  while ((match = TAG.exec(source))) {
    const [whole, sigil, name] = match;
    const top = stack[stack.length - 1];
    if (match.index > last) top.children.push({ type: "text", value: source.slice(last, match.index) });
    last = match.index + whole.length;

    if (sigil === "#" || sigil === "?" || sigil === "^") {
      const node = { type: sigil === "#" ? "each" : sigil === "?" ? "if" : "unless", name, children: [] };
      top.children.push(node);
      stack.push(node);
    } else if (sigil === "/") {
      if (stack.length > 1) stack.pop();
    } else {
      const type = sigil === "@" ? "url" : sigil === "$" ? "title" : sigil === "~" ? "break" : "var";
      top.children.push({ type, name });
    }
  }
  if (last < source.length) stack[0].children.push({ type: "text", value: source.slice(last) });

  parseCache.set(source, root);
  return root;
}

// ---- Rendering -------------------------------------------------------------------------------

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** True for nothing worth showing: blank text, an empty list, or an entry whose values are all blank */
const isEmpty = (value) => {
  if (value === undefined || value === null || value === false) return true;
  if (Array.isArray(value)) return value.every(isEmpty);
  if (typeof value === "object") return Object.values(value).every(isEmpty);
  return String(value).trim() === "";
};

/** The value of a name: the innermost entry that has it wins, then the outer ones */
function lookup(name, scopes) {
  for (let index = scopes.length - 1; index >= 0; index -= 1) {
    const scope = scopes[index];
    if (name === "." && (typeof scope === "string" || typeof scope === "number")) return scope;
    if (scope && typeof scope === "object" && !Array.isArray(scope) && hasOwn(scope, name)) return scope[name];
  }
  return undefined;
}

const defaultTitleOf = (key) => TITLED_SECTIONS.find((section) => section.key === key)?.title || "";

function renderNodes(nodes, scopes, details) {
  let html = "";
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        html += node.value;
        break;
      case "var": {
        const value = lookup(node.name, scopes);
        if (typeof value === "string" || typeof value === "number") html += formatText(value);
        break;
      }
      case "url":
        html += escapeHtml(safeUrl(lookup(node.name, scopes)));
        break;
      case "title": {
        const custom = String(details.titles?.[node.name] ?? "").trim();
        html += escapeHtml(custom || defaultTitleOf(node.name));
        break;
      }
      case "break":
        html += details.breaks?.[node.name] ? ' data-break="true"' : "";
        break;
      case "each": {
        const value = lookup(node.name, scopes);
        if (Array.isArray(value)) {
          for (const entry of value) {
            if (!isEmpty(entry)) html += renderNodes(node.children, [...scopes, entry], details);
          }
        } else if (!isEmpty(value)) {
          html += renderNodes(node.children, scopes, details);
        }
        break;
      }
      case "if":
        if (!isEmpty(lookup(node.name, scopes))) html += renderNodes(node.children, scopes, details);
        break;
      case "unless":
        if (isEmpty(lookup(node.name, scopes))) html += renderNodes(node.children, scopes, details);
        break;
      default:
        break;
    }
  }
  return html;
}

// ---- The global layout: text size, gaps and padding ---------------------------------------------

/** How far each control can go either way, and how much one step changes the scale */
const LAYOUT_LIMIT = 4;
const FONT_STEP = 0.05;
const GAP_STEP = 0.15;
const PAD_STEP = 0.12;

const clampStep = (value) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(-LAYOUT_LIMIT, Math.min(LAYOUT_LIMIT, number)) : 0;
};

const scaleOf = (step, size) => Math.round((1 + clampStep(step) * size) * 1000) / 1000;

/** The finished HTML document for a template source and a resume's details */
const render = (source, details) => {
  const layout = details.layout || {};
  const view = {
    ...details,
    fontScale: scaleOf(layout.font, FONT_STEP),
    gapScale: scaleOf(layout.gap, GAP_STEP),
    padScale: scaleOf(layout.pad, PAD_STEP),
  };
  return renderNodes(parse(source).children, [view], view);
};

// ---- Which inputs does a template need? --------------------------------------------------------

/**
 * Reads the placeholders of a template and returns the sections and fields the editor should show:
 * only what the template uses, in the order of fields.js, with each repeater cut down to the
 * sub-fields that the template places inside it.
 */
function describe(source) {
  const used = new Set();
  const inside = {}; // block name -> every name used somewhere inside it
  const titled = new Set();
  const breakable = new Set();
  const open = [];

  TAG.lastIndex = 0;
  let match;
  while ((match = TAG.exec(source))) {
    const [, sigil, name] = match;
    if (sigil === "/") {
      open.pop();
      continue;
    }
    if (sigil === "$") {
      titled.add(name);
      continue;
    }
    if (sigil === "~") {
      breakable.add(name);
      continue;
    }
    used.add(name);
    open.forEach((block) => {
      (inside[block] = inside[block] || new Set()).add(name);
    });
    if (sigil === "#" || sigil === "?" || sigil === "^") open.push(name);
  }

  return SECTIONS.map((section) => {
    const fields = section.fields
      .filter((field) => used.has(field.key))
      .map((field) =>
        field.type === "repeater"
          ? { ...field, subFields: field.subFields.filter((sub) => inside[field.key]?.has(sub.key)) }
          : field,
      );
    if (fields.length === 0) return null;
    return {
      key: section.key,
      title: section.title,
      fixed: Boolean(section.fixed),
      titleEditable: !section.fixed && titled.has(section.key),
      breakable: !section.fixed && breakable.has(section.key),
      fields,
    };
  }).filter(Boolean);
}

// ---- Keeping stored details in shape ---------------------------------------------------------

const DEFAULT_MAX_LENGTH = 600;
const DEFAULT_MAX_ITEMS = 10;
const TITLE_MAX_LENGTH = 60;

const toText = (value, definition) => {
  const text = String(value ?? "").replace(/\r\n/g, "\n");
  // A single-line field cannot hold a line break
  const line = definition.type === "multiline" || definition.type === "bullets" ? text : text.replace(/\s*\n\s*/g, " ");
  return line.slice(0, definition.maxLength || DEFAULT_MAX_LENGTH);
};

const toValue = (definition, value) => {
  switch (definition.type) {
    case "url":
      return safeUrl(value).slice(0, definition.maxLength || DEFAULT_MAX_LENGTH);
    case "bullets":
      return (Array.isArray(value) ? value : [])
        .slice(0, definition.maxItems || DEFAULT_MAX_ITEMS)
        .map((point) => toText(point, definition));
    case "repeater":
      return (Array.isArray(value) ? value : [])
        .slice(0, definition.maxItems || DEFAULT_MAX_ITEMS)
        .map((item) => toEntry(definition.subFields, item));
    default:
      return toText(value, definition);
  }
};

/** One entry of a repeater, rebuilt from its sub-field definitions so unknown keys are dropped */
const toEntry = (subFields, item) =>
  subFields.reduce((entry, sub) => {
    entry[sub.key] = toValue(sub, item && typeof item === "object" ? item[sub.key] : undefined);
    return entry;
  }, {});

/** What a field holds when the client sends nothing for it */
const blankValue = (definition) => {
  if (definition.type === "repeater") {
    return Array.from({ length: definition.defaultItems || 0 }, () => toEntry(definition.subFields, {}));
  }
  return definition.type === "bullets" ? [] : "";
};

/**
 * Rebuilds a resume's details from the field list, so the stored shape is always the same: unknown
 * keys are dropped, every field is present, values are the right type and length, links are safe,
 * section titles are short, and page breaks are true or false.
 */
function normalizeDetails(input) {
  const source = input && typeof input === "object" ? input : {};
  const details = {};

  SECTIONS.forEach((section) =>
    section.fields.forEach((field) => {
      details[field.key] = hasOwn(source, field.key) ? toValue(field, source[field.key]) : blankValue(field);
    }),
  );

  // Global layout choices: whole steps from -4 to 4, 0 being the template as designed
  details.layout = {
    font: clampStep(source.layout?.font),
    gap: clampStep(source.layout?.gap),
    pad: clampStep(source.layout?.pad),
  };

  details.titles = {};
  details.breaks = {};
  TITLED_SECTIONS.forEach((section) => {
    const title = String(source.titles?.[section.key] ?? "").trim().slice(0, TITLE_MAX_LENGTH);
    if (title) details.titles[section.key] = title;
    if (source.breaks?.[section.key] === true) details.breaks[section.key] = true;
  });

  return details;
}

module.exports = { render, describe, normalizeDetails, safeUrl, escapeHtml, formatText, LAYOUT_LIMIT };
