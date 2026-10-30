import { fileNameOf } from "./resumeDetails";

/**
 * Getting a resume out of the editor. The resume is one HTML document (made by the server), so both
 * ways are short:
 *
 *   downloadHtml   saves that document as a .html file
 *   printResume    opens the browser's print dialog for it. "Save as PDF" in that dialog gives the PDF, with
 *                  the page size and margins the template asks for (@page in its CSS).
 */

export const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF", hint: "Opens the print dialog. Choose Save as PDF." },
  { id: "html", label: "HTML file", hint: "One file with the layout and styles inside." },
];

export function downloadHtml(html, title) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileNameOf(title)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Prints the resume from a hidden frame of its own, so it works even when the preview is on another
 * tab. The frame can run no scripts (the HTML comes from the server, escaped, and is never run).
 * Resolves when the print dialog has been opened.
 */
export function printResume(html, title) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.setAttribute("aria-hidden", "true");
    frame.title = "Resume to print";
    Object.assign(frame.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "794px",
      height: "1123px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });

    const cleanup = () => window.setTimeout(() => frame.remove(), 1000);

    frame.onload = async () => {
      try {
        const printWindow = frame.contentWindow;
        // Web fonts must be in before the pages are laid out
        if (printWindow.document.fonts && printWindow.document.fonts.ready) {
          await Promise.race([printWindow.document.fonts.ready, new Promise((done) => window.setTimeout(done, 2500))]);
        }
        printWindow.document.title = fileNameOf(title);
        printWindow.focus();
        printWindow.addEventListener("afterprint", cleanup, { once: true });
        printWindow.print();
        // If the browser never reports afterprint, the frame is removed anyway
        window.setTimeout(cleanup, 120000);
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
