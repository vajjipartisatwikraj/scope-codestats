/**
 * Direct PDF export, built with pdfmake.
 *
 * Why not print-to-PDF: the browser's print dialog owns the page margins and
 * silently replaces the template's, so the output never matched the preview.
 * Here the margins are written into the PDF itself, so the file is exact and
 * downloads in one click with no dialog.
 *
 * Text stays real text (no rasterisation), which resume screeners need.
 *
 * pdfmake is imported lazily so its font payload stays out of the main bundle.
 * The layout itself lives in resumeDocDefinition.js.
 */
import { buildResumeDocDefinition } from "./resumeDocDefinition";

const FONT_FETCH_TIMEOUT_MS = 10000;

/**
 * Metrics for the standard PDF fonts, keyed by the name registered with
 * pdfmake. The paths are spelled out rather than built from a variable so the
 * bundler can statically resolve each chunk.
 */
const STANDARD_FONT_LOADERS = {
  Helvetica: () => import("pdfmake/build/standard-fonts/Helvetica"),
  Times: () => import("pdfmake/build/standard-fonts/Times"),
  Courier: () => import("pdfmake/build/standard-fonts/Courier"),
};

let pdfMakePromise = null;
const registeredFonts = new Set();

const loadPdfMake = () => {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]).then(([pdfMakeModule, vfsModule]) => {
      const pdfMake = pdfMakeModule.default || pdfMakeModule;
      const vfs = vfsModule.default || vfsModule;
      // pdfmake 0.3 registers embedded fonts through this call
      if (typeof pdfMake.addVirtualFileSystem === "function") {
        pdfMake.addVirtualFileSystem(vfs);
      } else {
        pdfMake.vfs = vfs;
      }
      return pdfMake;
    });
  }
  return pdfMakePromise;
};

// btoa needs a binary string, and a whole font blown through apply() at once
// overflows the argument limit, so it is fed in chunks.
const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

/**
 * Makes the user's chosen font available to pdfmake, so the PDF matches the
 * preview instead of silently falling back to pdfmake's built-in Roboto.
 *
 * Returns the registered font name, or null when it cannot be loaded, in which
 * case the caller keeps Roboto rather than failing the export.
 */
const registerResumeFont = async (pdfMake, font) => {
  const pdfName = font?.pdfName;
  if (!pdfName) return null;
  if (registeredFonts.has(pdfName)) return pdfName;

  // Standard PDF fonts are not embedded, but pdfmake still needs their metrics
  // (the .afm files) in its virtual file system to measure text. In the browser
  // those ship as separate modules that have to be loaded explicitly.
  if (font.pdfStandard) {
    const loadContainer = STANDARD_FONT_LOADERS[pdfName];
    if (!loadContainer) return null;

    try {
      const module = await loadContainer();
      const container = module.default || module;

      if (typeof pdfMake.addFontContainer === "function") {
        pdfMake.addFontContainer(container);
      } else {
        pdfMake.addVirtualFileSystem(container.vfs);
      }

      pdfMake.addFonts({ [pdfName]: font.pdfStandard });
      registeredFonts.add(pdfName);
      return pdfName;
    } catch (err) {
      console.warn(`Could not load metrics for ${pdfName}:`, err.message);
      return null;
    }
  }

  if (!font.files) return null;

  // A stalled request must not leave the export spinning forever
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), FONT_FETCH_TIMEOUT_MS);

  try {
    const entries = Object.entries(font.files);
    const loaded = await Promise.all(
      entries.map(async ([style, url]) => {
        const response = await fetch(url, { signal: abort.signal });
        if (!response.ok) throw new Error(`Missing font file: ${url}`);
        return [style, url.split("/").pop(), toBase64(await response.arrayBuffer())];
      }),
    );

    const vfs = {};
    const styles = {};
    loaded.forEach(([style, fileName, base64]) => {
      vfs[fileName] = base64;
      styles[style] = fileName;
    });

    if (typeof pdfMake.addVirtualFileSystem === "function") {
      pdfMake.addVirtualFileSystem(vfs);
    } else {
      pdfMake.vfs = { ...(pdfMake.vfs || {}), ...vfs };
    }

    pdfMake.addFonts({ [pdfName]: styles });
    registeredFonts.add(pdfName);
    return pdfName;
  } catch (err) {
    // Typography is not worth failing an export over
    console.warn("Falling back to the default PDF font:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const safeFileName = (title) =>
  String(title || "resume")
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "resume";

/** Generates and downloads the resume as a PDF. */
export const downloadResumePdf = async ({ template, fields, font, title }) => {
  if (!template) throw new Error("Nothing to export");

  const pdfMake = await loadPdfMake();

  // Use the font the user picked, falling back to pdfmake's own
  const pdfFontName = (await registerResumeFont(pdfMake, font)) || "Roboto";

  // pdfmake 0.3's download() is async and takes no callback: it must be
  // awaited, or the caller never learns that the export finished.
  await pdfMake
    .createPdf(
      buildResumeDocDefinition({
        template,
        fields,
        font: { name: pdfFontName, lineBoxRatio: font?.pdfLineBoxRatio },
      }),
    )
    .download(`${safeFileName(title)}.pdf`);
};
