import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { buildFields } from "../../../utils/resume";
import { PaperPage, getTemplateComponent, pageGeometry } from "../templates";

/**
 * A live thumbnail of a resume: the real template, drawn at its real size inside an A4 frame and
 * scaled down with a CSS transform. Only the first page is shown.
 *
 * It renders lazily: nothing is drawn until the frame scrolls into view, because a list of
 * thumbnails would otherwise lay out several complete documents at once. It is a picture, not a
 * control: hidden from assistive technology, inert, and its links are plain text.
 *
 *   template     the template definition
 *   storedFields the resume's saved fields (omit for the template's blank placeholders)
 *   fontFamily   the CSS family of the resume's font
 */
export default function PaperThumbnail({ template, storedFields, fontFamily }) {
  const frameRef = useRef(null);
  const [scale, setScale] = useState(0);
  const [seen, setSeen] = useState(false);

  const geometry = useMemo(() => (template ? pageGeometry(template.page) : null), [template]);
  const fields = useMemo(() => buildFields(template, storedFields), [template, storedFields]);
  const Body = template ? getTemplateComponent(template.id) : null;

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
    if (!frame || !geometry) return undefined;
    const measure = () => setScale(frame.clientWidth / geometry.width);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [geometry]);

  return (
    <div
      ref={frameRef}
      className="rbl-thumb"
      style={geometry ? { aspectRatio: `${geometry.width} / ${geometry.height}` } : undefined}
      aria-hidden="true"
    >
      {Body && geometry && seen && scale > 0 ? (
        <div
          className="rbl-thumb__sheet"
          style={{ width: geometry.width, height: geometry.height, transform: `scale(${scale})` }}
          inert=""
        >
          <PaperPage geometry={geometry} pageIndex={0}>
            <Body template={template} fields={fields} fontFamily={fontFamily} links={false} />
          </PaperPage>
        </div>
      ) : (
        <span className="rbl-thumb__blank">
          <FileTextIcon size={32} weight="regular" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
