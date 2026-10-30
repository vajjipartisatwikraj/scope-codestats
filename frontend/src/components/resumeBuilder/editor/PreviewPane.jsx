import React, { useCallback, useEffect, useRef, useState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { Badge, PillTabs, pluralize } from "../../ui";

const ZOOM_ITEMS = [
  { key: "fit", label: "Fit" },
  { key: "0.75", label: "75%" },
  { key: "1", label: "100%" },
  { key: "1.25", label: "125%" },
  { key: "1.5", label: "150%" },
];

// An A4 sheet at 96 dpi, and the printed margin of 12mm top and bottom the templates use
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_MARGIN = 91;
const FIT_MIN = 0.4;
const FIT_MAX = 1.25;
const ADVISED_PAGES = 2;

/**
 * The live preview: the resume's own HTML in a frame the width of an A4 sheet, on a canvas-coloured
 * backdrop, with a segmented zoom control (Fit, 75%, 100%, 125%) and a page count.
 *
 * The frame can run no scripts and the HTML is escaped by the server, so what a student types can
 * never act as code. The frame is as tall as the document, so it does not scroll inside; the backdrop
 * does. It is scaled with a CSS transform, and a stage of the scaled size keeps the scrollbars honest.
 *
 *   html        the finished resume document
 *   updating    a newer preview is on its way
 */
export default function PreviewPane({ html, updating }) {
  const [zoomKey, setZoomKey] = useState("fit");
  const [fitZoom, setFitZoom] = useState(0.75);
  const [height, setHeight] = useState(PAGE_HEIGHT);
  const scrollRef = useRef(null);
  const frameRef = useRef(null);

  // "Fit" is the zoom at which the sheet's width fills the scroll area
  useEffect(() => {
    const area = scrollRef.current;
    if (!area) return undefined;
    const fit = () => {
      // The scroll area's own padding differs by screen size (24px on a desktop, 12px on a phone)
      const style = window.getComputedStyle(area);
      const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const available = area.clientWidth - padding;
      if (available <= 0) return; // hidden behind the other tab; keep the last fit
      const next = Math.round((available / PAGE_WIDTH) * 100) / 100;
      setFitZoom(Math.min(FIT_MAX, Math.max(FIT_MIN, next)));
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  // The frame is as tall as the document inside it. Fonts arrive after the load, so it is read again.
  const measure = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame && frame.contentDocument;
    if (!doc || !doc.documentElement) return;
    setHeight(Math.max(PAGE_HEIGHT, doc.documentElement.scrollHeight));
  }, []);

  const onLoad = useCallback(() => {
    measure();
    const frame = frameRef.current;
    const fonts = frame && frame.contentDocument && frame.contentDocument.fonts;
    if (fonts && fonts.ready) fonts.ready.then(measure).catch(() => {});
    window.setTimeout(measure, 600);
  }, [measure]);

  const pages = Math.max(1, Math.ceil((height - PAGE_MARGIN) / (PAGE_HEIGHT - PAGE_MARGIN)));
  const zoom = zoomKey === "fit" ? fitZoom : Number(zoomKey);

  return (
    <div className="rbe-preview">
      <div className="rbe-preview__bar">
        <PillTabs size="sm" role="radiogroup" label="Zoom" items={ZOOM_ITEMS} value={zoomKey} onChange={setZoomKey} />
        <div className="rbe-preview__pages" aria-live="polite">
          <span className="rbe-preview__count">{pluralize(pages, "page")}</span>
          <span className="rbe-preview__limit">{updating ? "Updating" : `${ADVISED_PAGES} pages or fewer is best`}</span>
          {pages > ADVISED_PAGES ? (
            <Badge tone="warning" icon={<WarningCircleIcon size={14} weight="fill" aria-hidden="true" />}>
              Longer than {ADVISED_PAGES} pages
            </Badge>
          ) : null}
        </div>
      </div>

      {/* A scrollable region, so it takes keyboard focus. The frame mirrors the form, so a line of
          text stands in for it for assistive technology. */}
      <div className="rbe-preview__scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Resume preview">
        <span className="ui-sr">Live preview of your resume, {pluralize(pages, "page")}. The text matches the form.</span>
        <div className="rbe-stage" style={{ width: PAGE_WIDTH * zoom, height: height * zoom }}>
          <div className="rbe-sheet" style={{ width: PAGE_WIDTH, height, transform: `scale(${zoom})` }} data-updating={updating ? "true" : "false"}>
            {html ? (
              <iframe
                ref={frameRef}
                className="rbe-frame"
                title="Resume preview"
                sandbox="allow-same-origin"
                srcDoc={html}
                scrolling="no"
                aria-hidden="true"
                tabIndex={-1}
                style={{ width: PAGE_WIDTH, height }}
                onLoad={onLoad}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
