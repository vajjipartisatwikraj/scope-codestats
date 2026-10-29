import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { Badge, PillTabs, pluralize } from "../../ui";
import { PaperPage, getTemplateComponent, pageGeometry } from "../templates";

const ZOOM_ITEMS = [
  { key: "fit", label: "Fit" },
  { key: "0.75", label: "75%" },
  { key: "1", label: "100%" },
  { key: "1.25", label: "125%" },
];
const FIT_MIN = 0.4;
const FIT_MAX = 1.25;
const PAGE_GAP = 24; // between two sheets, in paper pixels
const SCROLL_PADDING = 24; // each side of the scroll area, in screen pixels

/**
 * The live preview: the paper sheet(s) on a canvas-coloured backdrop, a segmented zoom control
 * (Fit, 75%, 100%, 125%) and a page counter.
 *
 * Pagination measures the template body once at its natural height in an off-screen copy, then
 * gives each page a window onto the same body offset by one page of content. That keeps a single
 * source of truth for the layout. The sheets are drawn at their real size and scaled with a CSS
 * transform; a stage of the scaled size makes the scrollbars honest.
 *
 *   template, fields, fontFamily   what to draw
 */
export default function PreviewPane({ template, fields, fontFamily }) {
  const geometry = useMemo(() => pageGeometry(template.page), [template]);
  const { width, height, maxPages, contentWidth, contentHeight } = geometry;

  const Body = getTemplateComponent(template.id);
  const body = useMemo(
    () => <Body template={template} fields={fields} fontFamily={fontFamily} />,
    [Body, template, fields, fontFamily],
  );

  const [zoomKey, setZoomKey] = useState("fit");
  const [fitZoom, setFitZoom] = useState(0.75);
  const [measured, setMeasured] = useState(0);
  const scrollRef = useRef(null);
  const measureRef = useRef(null);

  // "Fit" is the zoom at which the sheet's width fills the scroll area
  useEffect(() => {
    const area = scrollRef.current;
    if (!area) return undefined;
    const fit = () => {
      const available = area.clientWidth - SCROLL_PADDING * 2;
      if (available <= 0) return; // hidden behind the other tab; keep the last fit
      const next = Math.round((available / width) * 100) / 100;
      setFitZoom(Math.min(FIT_MAX, Math.max(FIT_MIN, next)));
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [width]);

  // The natural height of the document, re-read whenever the content or a loading font changes it
  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return undefined;
    const read = () => setMeasured(node.scrollHeight);
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [contentWidth]);

  const needed = Math.max(1, Math.ceil(measured / contentHeight));
  const pageCount = Math.min(maxPages, needed);
  const overflow = needed > maxPages;
  const pages = Array.from({ length: pageCount }, (_, index) => index);

  const zoom = zoomKey === "fit" ? fitZoom : Number(zoomKey);
  const stackHeight = pageCount * height + (pageCount - 1) * PAGE_GAP;

  return (
    <div className="rbe-preview">
      <div className="rbe-preview__bar">
        <PillTabs
          size="sm"
          role="radiogroup"
          label="Zoom"
          items={ZOOM_ITEMS}
          value={zoomKey}
          onChange={setZoomKey}
        />
        <div className="rbe-preview__pages" aria-live="polite">
          <span className="rbe-preview__count">{pluralize(pageCount, "page")}</span>
          <span className="rbe-preview__limit">up to {maxPages}</span>
          {overflow ? (
            <Badge tone="warning" icon={<WarningCircleIcon size={14} weight="fill" aria-hidden="true" />}>
              Over the {maxPages} page limit
            </Badge>
          ) : null}
        </div>
      </div>

      {/* A scrollable region, so it takes keyboard focus. The sheets mirror the form, so they are
          hidden from assistive technology and this line stands in for them. */}
      <div
        className="rbe-preview__scroll"
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Resume preview"
      >
        <span className="ui-sr">
          Live preview of your resume, {pluralize(pageCount, "page")}. The text matches the form.
        </span>
        <div className="rbe-stage" style={{ width: width * zoom, height: stackHeight * zoom }}>
          <div
            className="rbe-stack"
            aria-hidden="true"
            style={{ width, gap: PAGE_GAP, transform: `scale(${zoom})` }}
          >
            {pages.map((pageIndex) => (
              <PaperPage key={pageIndex} className="rbe-sheet" geometry={geometry} pageIndex={pageIndex}>
                {body}
              </PaperPage>
            ))}
          </div>
        </div>
      </div>

      {/* Off-screen measurer: the printable width, the natural height */}
      <div className="rbe-measure" aria-hidden="true" inert="">
        <div ref={measureRef} style={{ width: contentWidth }}>
          {body}
        </div>
      </div>
    </div>
  );
}
