/**
 * Word export.
 *
 * Produced from the same rendered DOM as the preview, so what you see is what
 * you get, and the text stays real text rather than an image.
 *
 * The file must not reference any external resource: Word tries to fetch them
 * when opening and reports "Problems During Load" when it cannot. Browser
 * extensions inject stylesheets into the page, so every style is inlined here
 * instead of linking anything.
 *
 * PDF lives in resumePdf.js - it is generated directly with pdfmake so the
 * page margins come from the template instead of the browser's print dialog.
 */

const PX_PER_INCH = 96;

const toInches = (px) => `${(Number(px || 0) / PX_PER_INCH).toFixed(2)}in`;

const marginsOf = (page) => {
  const margin = page?.margin;
  if (typeof margin === "number") {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  return { top: 0, right: 0, bottom: 0, left: 0, ...(margin || {}) };
};

// Properties worth carrying into Word. `display` is deliberately excluded so
// flex containers do not survive; the remap below places them instead.
const INLINE_PROPERTIES = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "color",
  "text-align",
  "text-decoration",
  "text-transform",
  "line-height",
  "letter-spacing",
  "white-space",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-bottom-width",
  "border-bottom-style",
  "border-bottom-color",
  "list-style-type",
  "list-style-position",
];

/**
 * Deep-clones the resume and freezes the browser's computed styles onto every
 * element as inline attributes, so the result renders without a stylesheet.
 */
const cloneWithInlineStyles = (source) => {
  const clone = source.cloneNode(true);

  const sourceNodes = [source, ...source.querySelectorAll("*")];
  const cloneNodes = [clone, ...clone.querySelectorAll("*")];

  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target) return;

    const computed = window.getComputedStyle(node);
    const declarations = INLINE_PROPERTIES.map((property) => {
      const value = computed.getPropertyValue(property);
      return value ? `${property}:${value}` : "";
    }).filter(Boolean);

    target.setAttribute("style", declarations.join(";"));
  });

  return clone;
};

/**
 * Word only honours page margins through its own section idiom: a *named*
 * `@page` rule with mso properties, plus a wrapper div that references it.
 * A plain `@page { margin }` is ignored and Word falls back to one inch.
 */
const WORD_SECTION = "WordSection1";

const wordCss = (page) => {
  const margin = marginsOf(page);

  return `
    @page ${WORD_SECTION} {
      size: 21cm 29.7cm;
      margin: ${toInches(margin.top)} ${toInches(margin.right)} ${toInches(margin.bottom)} ${toInches(margin.left)};
      mso-page-orientation: portrait;
      mso-header-margin: 0in;
      mso-footer-margin: 0in;
    }
    div.${WORD_SECTION} { page: ${WORD_SECTION}; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    table { border-collapse: collapse; mso-cellspacing: 0; }
    td { padding: 0; }
    ul { margin-top: 2px; margin-bottom: 2px; }
    li { margin-bottom: 1px; page-break-inside: avoid; }
    a { text-decoration: underline; }
  `;
};

/**
 * Rewrites the cloned resume into markup Word lays out predictably.
 *
 * Word's HTML engine does not implement `display: table` on divs, so the
 * "heading left, date right" rows are converted into real tables. Flex `gap`
 * does not exist either, so spacing between contact items becomes explicit
 * margins.
 */
const remapForWord = (root) => {
  root.querySelectorAll('[data-resume-row="split"]').forEach((row) => {
    const left = row.querySelector('[data-resume-cell="left"]');
    const right = row.querySelector('[data-resume-cell="right"]');

    const table = document.createElement("table");
    table.setAttribute("width", "100%");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("border", "0");
    table.setAttribute("style", "width:100%;border-collapse:collapse;margin:0;");

    const body = document.createElement("tbody");
    const tr = document.createElement("tr");

    const leftCell = document.createElement("td");
    leftCell.setAttribute("align", "left");
    leftCell.setAttribute("valign", "top");
    leftCell.setAttribute("style", `${left?.getAttribute("style") || ""};padding:0;`);
    while (left?.firstChild) leftCell.appendChild(left.firstChild);
    tr.appendChild(leftCell);

    if (right) {
      const rightCell = document.createElement("td");
      rightCell.setAttribute("align", "right");
      rightCell.setAttribute("valign", "top");
      rightCell.setAttribute(
        "style",
        `${right.getAttribute("style") || ""};padding:0;white-space:nowrap;`,
      );
      while (right.firstChild) rightCell.appendChild(right.firstChild);
      tr.appendChild(rightCell);
    }

    body.appendChild(tr);
    table.appendChild(body);
    row.replaceWith(table);
  });

  root.querySelectorAll('[data-resume-row="inline"]').forEach((row) => {
    row.setAttribute(
      "style",
      `${row.getAttribute("style") || ""};display:block;text-align:center;`,
    );
    Array.from(row.children).forEach((child) => {
      // Inline styles win over the stylesheet, so the gap has to be set here
      child.setAttribute(
        "style",
        `${child.getAttribute("style") || ""};display:inline;margin-left:3px;margin-right:3px;`,
      );
    });
  });

  return root;
};

const safeFileName = (title) =>
  String(title || "resume")
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "resume";

/**
 * Downloads the resume as a Word-openable document. Everything is inlined, so
 * the file has no external dependencies.
 */
export const exportResumeAsWord = ({ node, title, page }) => {
  if (!node) throw new Error("Nothing to export");

  const inlined = remapForWord(cloneWithInlineStyles(node));

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${safeFileName(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
${wordCss(page)}
</style>
</head>
<body>
<div class="${WORD_SECTION}">${inlined.innerHTML}</div>
</body>
</html>`;

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(title)}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF", hint: "Ready to send, exact template margins" },
  { id: "word", label: "Word (.doc)", hint: "Editable, layout may shift slightly" },
];
