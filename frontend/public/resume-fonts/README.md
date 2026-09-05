# Resume fonts

Font files offered to users in the resume builder's font picker.

Anything in this folder is served at `/resume-fonts/...`, which is where the PDF
export fetches it from before embedding it into the file.

## Why fonts must live here

A resume has to look the same in three places: the preview, the exported PDF and
the exported Word file. Naming a font that only exists on the author's machine
does not work, because the PDF generator cannot embed a font it has no file for
and silently substitutes another one. So the picker only offers fonts that are
either bundled here or are one of the standard PDF fonts.

## Adding a family

1. Drop the TTFs into a folder named after the family:

   ```
   public/resume-fonts/Inter/Inter-Regular.ttf
   public/resume-fonts/Inter/Inter-Bold.ttf
   public/resume-fonts/Inter/Inter-Italic.ttf
   public/resume-fonts/Inter/Inter-BoldItalic.ttf
   ```

2. Register it in `backend/resumeFonts/index.js`:

   ```js
   {
     id: "inter",
     name: "Inter",
     category: "Sans-serif",
     note: "Modern, highly legible at small sizes.",
     cssFamily: "'Inter', Arial, sans-serif",
     pdfName: "Inter",
     files: {
       normal: "/resume-fonts/Inter/Inter-Regular.ttf",
       bold: "/resume-fonts/Inter/Inter-Bold.ttf",
       italics: "/resume-fonts/Inter/Inter-Italic.ttf",
       bolditalics: "/resume-fonts/Inter/Inter-BoldItalic.ttf",
     },
   }
   ```

3. Declare an `@font-face` for it in `frontend/src/fonts.css` so the preview can
   render it too:

   ```css
   @font-face {
     font-family: 'Inter';
     src: url('/resume-fonts/Inter/Inter-Regular.ttf') format('truetype');
     font-weight: 400;
     font-style: normal;
   }
   ```

That is all: the picker, the preview and both exports read from the registry.

## Requirements

- **TTF only.** The PDF generator embeds TrueType outlines; WOFF and WOFF2 are
  not supported.
- **All four styles.** `normal`, `bold`, `italics` and `bolditalics` must each
  point at a file. If the family has no italic, point italics at the upright
  file, as Nekst does.
- **Check the licence.** The font must permit embedding and redistribution,
  since the files are served publicly and written into every exported PDF.
  Fonts under the SIL Open Font License or Apache 2.0 are safe. Confirm the
  rights before adding anything proprietary.

## Fonts currently offered

- **Product Sans** lives here, all twelve styles. The picker uses Regular,
  Bold, Italic and BoldItalic; the rest are available to the preview through the
  `@font-face` rules in `frontend/src/fonts.css`.
- **Nekst** is referenced from `/fonts/`, where the platform already ships it,
  rather than being duplicated here.
- **Arial / Helvetica** and **Times New Roman** need no files. They are standard
  PDF fonts, so every reader supplies them and every OS has an equivalent. Their
  metrics come from `pdfmake/build/standard-fonts`, loaded on demand.
