import React, { useEffect, useRef, useState } from "react";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";

// An A4 sheet at 96 dpi: the width the templates are laid out for
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

/**
 * A thumbnail of a resume: its own HTML document, drawn at its real size inside an A4 frame and scaled
 * down with a CSS transform. Only the first page shows.
 *
 * It renders lazily: nothing is drawn until the frame scrolls into view, because a list of thumbnails
 * would otherwise load several complete documents at once. It is a picture, not a control: hidden from
 * assistive technology, inert, and its links cannot be followed. The frame can run no scripts.
 *
 *   html   the finished resume document (a resume's saved `html`, or a template's `previewHtml`)
 */
export default function PaperThumbnail({ html }) {
  const frameRef = useRef(null);
  const [scale, setScale] = useState(0);
  const [seen, setSeen] = useState(false);

  // Draw only once the frame has been on screen
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || seen) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [seen]);

  // The sheet is scaled to the width of the frame, whatever width the grid gives it
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const measure = () => setScale(frame.clientWidth / PAGE_WIDTH);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="rbl-thumb"
      style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
      aria-hidden="true"
    >
      {html && seen && scale > 0 ? (
        <div
          className="rbl-thumb__sheet"
          style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${scale})` }}
          inert=""
        >
          <iframe
            title="Resume thumbnail"
            sandbox="allow-same-origin"
            srcDoc={html}
            scrolling="no"
            tabIndex={-1}
            style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, border: 0, background: "#fff" }}
          />
        </div>
      ) : (
        <span className="rbl-thumb__blank">
          <FileTextIcon size={32} weight="regular" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
