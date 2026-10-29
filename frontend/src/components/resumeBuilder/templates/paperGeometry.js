/**
 * Page geometry of a resume template, shared by the preview, the thumbnails and the export source.
 *
 * A template declares its page as { width, height, margin, maxPages } in CSS pixels at 96 DPI
 * (A4 is 794 by 1123). `margin` is either one number or { top, right, bottom, left }.
 */
export const toMargins = (margin) =>
  typeof margin === "number"
    ? { top: margin, right: margin, bottom: margin, left: margin }
    : { top: 0, right: 0, bottom: 0, left: 0, ...(margin || {}) };

export const pageGeometry = (page) => {
  const margins = toMargins(page.margin);
  return {
    width: page.width,
    height: page.height,
    maxPages: page.maxPages || 1,
    margins,
    // The printable area: what a page of content is cut from
    contentWidth: page.width - margins.left - margins.right,
    contentHeight: page.height - margins.top - margins.bottom,
  };
};
