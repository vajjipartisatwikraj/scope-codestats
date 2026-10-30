/**
 * Resume templates.
 *
 * A template is ONE .html file in this folder: the structure of the resume, its styles and its
 * {{placeholders}} together (see engine.js for the placeholders). There is no other code to write.
 *
 * To add a template:
 *   1. Copy classic.html to a new file, for example compact.html, and change the markup and CSS.
 *   2. Describe it in the comment at the top of the file (@name, @category, @description).
 *   3. Add its file name (without .html) to ORDER below.
 *
 * The editor builds its inputs from the placeholders the file uses, so a section or a field that
 * the template leaves out simply has no input.
 */
const fs = require("fs");
const path = require("path");
const { render, describe, normalizeDetails } = require("./engine");
const SAMPLE_DETAILS = require("./sample");

// The order of the gallery. The first one is the default.
const ORDER = ["classic", "modern", "executive", "minimal", "banner"];

/** @name, @category and @description from the comment at the top of a template */
function readMeta(source, id) {
  const comment = /<!--([\s\S]*?)-->/.exec(source);
  const meta = {};
  if (comment) {
    comment[1].replace(/@(\w+)[ \t]+([^\n]+)/g, (_all, key, value) => {
      meta[key] = value.trim();
      return "";
    });
  }
  return {
    id,
    name: meta.name || id,
    category: meta.category || "Resume template",
    description: meta.description || "",
  };
}

const templates = ORDER.map((id) => {
  const source = fs.readFileSync(path.join(__dirname, `${id}.html`), "utf8");
  return { ...readMeta(source, id), source, sections: describe(source) };
});

const byId = new Map(templates.map((template) => [template.id, template]));

const TEMPLATE_IDS = templates.map((template) => template.id);
const DEFAULT_TEMPLATE_ID = ORDER[0];

const getTemplate = (templateId) => byId.get(templateId) || byId.get(DEFAULT_TEMPLATE_ID);

/** The finished HTML document of a resume: the template filled with the (cleaned) details */
const renderResume = (templateId, details) => render(getTemplate(templateId).source, normalizeDetails(details));

/**
 * What the editor and the gallery need: for each template its name, the sections and fields it
 * uses, and a preview drawn with made-up details. The source itself is not sent.
 */
let catalogueCache = null;
const catalogue = () => {
  if (!catalogueCache) {
    const sample = normalizeDetails(SAMPLE_DETAILS);
    catalogueCache = templates.map(({ id, name, category, description, sections, source }) => ({
      id,
      name,
      category,
      description,
      sections,
      previewHtml: render(source, sample),
    }));
  }
  return catalogueCache;
};

module.exports = {
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  renderResume,
  catalogue,
  normalizeDetails,
};
