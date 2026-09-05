/**
 * Builds the pdfmake document for a resume.
 *
 * Kept separate from resumePdf.js (which loads pdfmake and triggers the
 * download) so the layout can be rendered and page-counted in tests without a
 * browser.
 *
 * Every measurement comes from the template's own `spacing` block in CSS
 * pixels, converted to points here. The preview applies the same pixel values,
 * which is what keeps the page count in the editor honest.
 */
// Explicit extension so this module can also be loaded outside the bundler
import { fieldsToMap } from "./resume.js";

// Templates are authored in CSS pixels at 96 DPI; PDF works in points.
const PT_PER_PX = 72 / 96;
export const toPt = (px) => Number(px || 0) * PT_PER_PX;

const hasText = (value) => Boolean(String(value ?? "").trim());

const filledItems = (items, keys) =>
  (Array.isArray(items) ? items : []).filter((item) =>
    keys.some((key) =>
      Array.isArray(item?.[key]) ? item[key].some(hasText) : hasText(item?.[key]),
    ),
  );

// Mirrors RichText in the preview: **bold** and `code`
const RICH_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

const parseRich = (text) => {
  const source = String(text ?? "");
  if (!source) return [];

  return source
    .split(RICH_TOKEN)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return { text: part.slice(2, -2), bold: true };
      }
      // Backtick spans keep the document font: naming an unregistered font
      // makes pdfmake throw.
      if (part.startsWith("`") && part.endsWith("`")) {
        return { text: part.slice(1, -1) };
      }
      return { text: part };
    });
};

const marginsOf = (page) => {
  const margin = page?.margin;
  if (typeof margin === "number") {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  return { top: 0, right: 0, bottom: 0, left: 0, ...(margin || {}) };
};

const DEFAULT_SPACING = {
  sectionTop: 9,
  sectionBottom: 4,
  headingRule: 2,
  contactTop: 6,
  entryGap: 3,
  experienceGap: 5,
  projectGap: 6,
  bulletTop: 1,
  bulletGap: 1,
};

// Fallback when a font has no measured ratio: most families sit near 1.2
const DEFAULT_LINE_BOX_RATIO = 1.2;

/**
 * CSS `line-height: 1.3` means 1.3x the font size, but pdfmake's `lineHeight`
 * multiplies the font's natural line box, which differs per family. Dividing by
 * the measured ratio makes the PDF's line spacing match the preview, which is
 * what keeps the page count the same in both.
 */
const pdfLineHeight = (cssLineHeight, lineBoxRatio) =>
  (cssLineHeight || 1.3) / (lineBoxRatio || DEFAULT_LINE_BOX_RATIO);

/** Document definition for the classic template. */
const buildClassic = ({ template, fields, font }) => {
  const values = fieldsToMap(fields);
  const { colors, baseFontSize, sectionFontSize, lineHeight } = template.typography;
  const spacing = { ...DEFAULT_SPACING, ...(template.typography.spacing || {}) };

  const sizeOf = (key, fallback = baseFontSize) => toPt(values[key]?.fontSize || fallback);
  const valueOf = (key) => values[key]?.value;

  const content = [];

  /**
   * Section heading plus its rule. A single-cell table is used so the rule
   * always spans the full content width whatever the page margins are.
   */
  const sectionHeading = (title) => ({
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: title,
            bold: true,
            fontSize: toPt(sectionFontSize),
            color: colors.section,
            border: [false, false, false, true],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0,
      hLineColor: () => colors.rule,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => toPt(spacing.headingRule),
    },
    margin: [0, toPt(spacing.sectionTop), 0, toPt(spacing.sectionBottom)],
  });

  // "heading left, date right", the \hfill of the LaTeX original
  const splitRow = (left, right, topMargin = 0) => ({
    columns: [
      { width: "*", ...left },
      ...(right ? [{ width: "auto", alignment: "right", ...right }] : []),
    ],
    columnGap: toPt(10),
    margin: [0, topMargin, 0, 0],
  });

  const bulletList = (points, fontSize) => {
    const list = (Array.isArray(points) ? points : []).filter(hasText);
    if (list.length === 0) return null;

    return {
      ul: list.map((point) => ({
        text: parseRich(point),
        fontSize,
        margin: [0, 0, 0, toPt(spacing.bulletGap)],
      })),
      fontSize,
      margin: [0, toPt(spacing.bulletTop), 0, 0],
    };
  };

  const linkText = (label, url) =>
    hasText(url)
      ? { text: label, link: url, color: colors.link, decoration: "underline" }
      : { text: label, color: colors.link };

  // ==================== HEADER ====================
  content.push({
    text: hasText(valueOf("fullName")) ? valueOf("fullName") : "Your Name",
    bold: true,
    fontSize: sizeOf("fullName", 23),
    alignment: "center",
  });

  const contactItems = filledItems(valueOf("contact"), ["text"]);
  if (contactItems.length > 0) {
    const line = [];
    contactItems.forEach((item, index) => {
      if (index > 0) line.push({ text: "  |  " });
      line.push(hasText(item.url) ? linkText(item.text, item.url) : { text: item.text });
    });
    content.push({
      text: line,
      fontSize: sizeOf("contact"),
      alignment: "center",
      margin: [0, toPt(spacing.contactTop), 0, 0],
    });
  }

  // ==================== OVERVIEW ====================
  if (hasText(valueOf("overview"))) {
    content.push(sectionHeading("Overview"));
    content.push({
      text: parseRich(valueOf("overview")),
      fontSize: sizeOf("overview"),
      alignment: "justify",
    });
  }

  // ==================== EDUCATION ====================
  const education = filledItems(valueOf("education"), [
    "institution",
    "degree",
    "score",
    "dateRange",
  ]);
  if (education.length > 0) {
    content.push(sectionHeading("Education"));
    education.forEach((entry, index) => {
      const fontSize = sizeOf("education");
      content.push(
        splitRow(
          { text: entry.institution, bold: true, fontSize },
          { text: entry.dateRange, bold: true, fontSize },
          index ? toPt(spacing.entryGap) : 0,
        ),
      );
      content.push(
        splitRow(
          { text: entry.degree, color: colors.muted, fontSize },
          { text: entry.score, color: colors.muted, fontSize },
        ),
      );
    });
  }

  // ==================== SKILLS ====================
  const skills = filledItems(valueOf("skills"), ["category", "items"]);
  if (skills.length > 0) {
    content.push(sectionHeading("Skills"));
    skills.forEach((group, index) => {
      content.push({
        text: [
          ...(hasText(group.category) ? [{ text: `${group.category}: `, bold: true }] : []),
          ...parseRich(group.items),
        ],
        fontSize: sizeOf("skills"),
        margin: [0, index ? toPt(spacing.entryGap) : 0, 0, 0],
      });
    });
  }

  // ==================== EXPERIENCE ====================
  const experience = filledItems(valueOf("experience"), [
    "organization",
    "role",
    "points",
  ]);
  if (experience.length > 0) {
    content.push(sectionHeading("Experience"));
    experience.forEach((entry, index) => {
      const fontSize = sizeOf("experience");
      content.push(
        splitRow(
          {
            text: [
              { text: entry.organization, bold: true },
              ...(hasText(entry.role)
                ? [
                    { text: "  |  ", color: colors.muted },
                    { text: entry.role, color: colors.muted },
                  ]
                : []),
            ],
            fontSize,
          },
          { text: entry.dateRange, bold: true, fontSize },
          index ? toPt(spacing.experienceGap) : 0,
        ),
      );
      const bullets = bulletList(entry.points, fontSize);
      if (bullets) content.push(bullets);
    });
  }

  // ==================== PROJECTS ====================
  const projects = filledItems(valueOf("projects"), ["title", "techStack", "points"]);
  if (projects.length > 0) {
    content.push(sectionHeading("Projects"));
    projects.forEach((entry, index) => {
      const fontSize = sizeOf("projects");
      const links = [];
      if (hasText(entry.liveUrl)) links.push(linkText("Live", entry.liveUrl));
      if (hasText(entry.liveUrl) && hasText(entry.githubUrl)) links.push({ text: "  |  " });
      if (hasText(entry.githubUrl)) links.push(linkText("GitHub", entry.githubUrl));

      content.push(
        splitRow(
          { text: entry.title, bold: true, fontSize },
          links.length > 0 ? { text: links, fontSize } : null,
          index ? toPt(spacing.projectGap) : 0,
        ),
      );

      if (hasText(entry.techStack)) {
        content.push({
          text: entry.techStack,
          italics: true,
          color: colors.muted,
          fontSize,
        });
      }

      const bullets = bulletList(entry.points, fontSize);
      if (bullets) content.push(bullets);
    });
  }

  // ==================== CERTIFICATIONS ====================
  const certifications = filledItems(valueOf("certifications"), ["name", "issuer"]);
  if (certifications.length > 0) {
    content.push(sectionHeading("Certifications"));
    certifications.forEach((entry, index) => {
      const fontSize = sizeOf("certifications");
      content.push(
        splitRow(
          {
            text: [
              { text: entry.name, bold: true },
              ...(hasText(entry.issuer)
                ? [
                    { text: "  |  ", color: colors.muted },
                    { text: entry.issuer, color: colors.muted },
                  ]
                : []),
              ...(hasText(entry.credentialUrl)
                ? [
                    { text: "  |  ", color: colors.muted },
                    linkText("Credential", entry.credentialUrl),
                  ]
                : []),
            ],
            fontSize,
          },
          { text: entry.issuedDate, fontSize },
          index ? toPt(spacing.entryGap) : 0,
        ),
      );
    });
  }

  const margin = marginsOf(template.page);

  return {
    pageSize: "A4",
    // Exactly the template's margins: [left, top, right, bottom]
    pageMargins: [
      toPt(margin.left),
      toPt(margin.top),
      toPt(margin.right),
      toPt(margin.bottom),
    ],
    defaultStyle: {
      font: font.name,
      fontSize: toPt(baseFontSize),
      lineHeight: pdfLineHeight(lineHeight, font.lineBoxRatio),
      color: colors.text,
    },
    content,
  };
};

const BUILDERS = { classic: buildClassic };

/**
 * @param font  { name, lineBoxRatio } - a bare font name is also accepted
 */
export const buildResumeDocDefinition = ({ template, fields, font }) => {
  const build = BUILDERS[template.id] || buildClassic;
  const resolved = typeof font === "string" ? { name: font } : font || {};
  return build({ template, fields, font: resolved });
};

export default buildResumeDocDefinition;
