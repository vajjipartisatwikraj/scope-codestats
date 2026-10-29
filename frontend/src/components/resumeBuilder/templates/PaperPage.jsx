import React from "react";
import "./resumePaper.css";

/**
 * One white A4 sheet showing one page of a resume.
 *
 * The template body is laid out once at its natural height; each page is a window onto that same
 * body, shifted up by one page of content per page. That keeps a single source of truth for the
 * layout, and the page count comes from measuring the body once.
 *
 *   geometry    from pageGeometry(template.page)
 *   pageIndex   0 for the first page
 *   className, style   added to the sheet (the preview adds its shadow)
 *   children    the template body
 */
export default function PaperPage({ geometry, pageIndex = 0, className, style, children }) {
  const { width, height, margins, contentWidth, contentHeight } = geometry;

  return (
    <div
      className={className ? `rbp-sheet ${className}` : "rbp-sheet"}
      style={{ width, height, ...style }}
    >
      <div
        className="rbp-window"
        style={{
          top: margins.top,
          left: margins.left,
          width: contentWidth,
          height: contentHeight,
        }}
      >
        <div style={{ transform: `translateY(${-pageIndex * contentHeight}px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
