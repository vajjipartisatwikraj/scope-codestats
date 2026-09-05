/**
 * Fonts a resume can be built with.
 *
 * Only fonts listed here are offered, because every one of them has to survive
 * all three surfaces identically: the on-screen preview, the exported PDF and
 * the exported Word file. A font that merely exists on the author's machine
 * would silently fall back to something else in the PDF, which is exactly the
 * mismatch this registry prevents.
 *
 * A font qualifies in one of two ways:
 *
 *   files        - TTFs served from frontend/public, embedded into the PDF.
 *                  Use this for fonts shipped with the platform. Drop new
 *                  families into frontend/public/resume-fonts/ and point here.
 *   pdfStandard  - one of the 14 standard PDF fonts. No file is needed: every
 *                  PDF reader already has them, and the equivalent is present
 *                  on virtually every operating system for the preview.
 *
 * pdfLineBoxRatio deserves an explanation. CSS `line-height: 1.3` means 1.3x
 * the font size, but pdfmake's `lineHeight` multiplies the font's *natural*
 * line box instead, which differs per family. Without correcting for it the
 * same resume paginates differently on screen and in the PDF - Product Sans
 * lines came out 21% taller and pushed content onto a second page. The exporter
 * divides the template's CSS line-height by this ratio so both agree.
 *
 * Measured empirically by filling an A4 page with single lines at
 * pdfmake lineHeight = 1 and dividing the usable height by the line count.
 * Re-measure when adding a family.
 *
 * See frontend/public/resume-fonts/README.md for how to add one.
 */
const RESUME_FONTS = [
  {
    id: "product-sans",
    name: "Product Sans",
    category: "Sans-serif",
    cssFamily: "'Product Sans', 'Century Gothic', Arial, sans-serif",
    pdfName: "ProductSans",
    pdfLineBoxRatio: 1.214,
    files: {
      normal: "/resume-fonts/ProductSans-Regular.ttf",
      bold: "/resume-fonts/ProductSans-Bold.ttf",
      italics: "/resume-fonts/ProductSans-Italic.ttf",
      bolditalics: "/resume-fonts/ProductSans-BoldItalic.ttf",
    },
  },
  {
    id: "nekst",
    name: "Nekst",
    category: "Sans-serif",
    cssFamily: "'Nekst', 'Century Gothic', Arial, sans-serif",
    pdfName: "Nekst",
    pdfLineBoxRatio: 1.002,
    files: {
      normal: "/fonts/Nekst-Regular.ttf",
      bold: "/fonts/Nekst-Bold.ttf",
      // Nekst has no italic face, so italics reuse the upright files
      italics: "/fonts/Nekst-Regular.ttf",
      bolditalics: "/fonts/Nekst-Bold.ttf",
    },
  },
  {
    id: "helvetica",
    name: "Arial / Helvetica",
    category: "Sans-serif",
    cssFamily: "Arial, Helvetica, 'Liberation Sans', sans-serif",
    pdfName: "Helvetica",
    pdfLineBoxRatio: 0.932,
    pdfStandard: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  },
  {
    id: "times",
    name: "Times New Roman",
    category: "Serif",
    cssFamily: "'Times New Roman', Times, 'Liberation Serif', serif",
    pdfName: "Times",
    pdfLineBoxRatio: 0.9,
    pdfStandard: {
      normal: "Times-Roman",
      bold: "Times-Bold",
      italics: "Times-Italic",
      bolditalics: "Times-BoldItalic",
    },
  },
];

const DEFAULT_RESUME_FONT_ID = "product-sans";

const fontsById = new Map(RESUME_FONTS.map((font) => [font.id, font]));

const RESUME_FONT_IDS = RESUME_FONTS.map((font) => font.id);

const getResumeFont = (fontId) =>
  fontsById.get(fontId) || fontsById.get(DEFAULT_RESUME_FONT_ID);

module.exports = {
  RESUME_FONTS,
  RESUME_FONT_IDS,
  DEFAULT_RESUME_FONT_ID,
  getResumeFont,
};
