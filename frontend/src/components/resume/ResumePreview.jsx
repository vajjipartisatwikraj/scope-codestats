import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Box, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  PanTool as PanToolIcon,
  CenterFocusStrong as FitIcon,
} from "@mui/icons-material";
import { getTemplateComponent } from "./templates";

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

/**
 * Paper preview with zoom, a hand tool for panning, and automatic pagination up
 * to the template's page limit.
 *
 * Pagination works by measuring the template body once at its natural height in
 * an off-screen copy, then giving each page a window onto the same body offset
 * by one page of content. That keeps a single source of truth for the layout.
 */
// Templates may declare margins as a single number or per side
const toMargins = (margin) =>
  typeof margin === "number"
    ? { top: margin, right: margin, bottom: margin, left: margin }
    : { top: 0, right: 0, bottom: 0, left: 0, ...(margin || {}) };

const ResumePreview = ({ darkMode, template, fields, fontFamily }) => {
  const { width, height, maxPages } = template.page;
  const margins = toMargins(template.page.margin);
  const contentWidth = width - margins.left - margins.right;
  const contentHeight = height - margins.top - margins.bottom;

  const TemplateBody = getTemplateComponent(template.id);
  const body = (
    <TemplateBody template={template} fields={fields} fontFamily={fontFamily} />
  );

  const [zoom, setZoom] = useState(0.75);
  const [handTool, setHandTool] = useState(false);
  const [panning, setPanning] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const measureRef = useRef(null);
  const scrollRef = useRef(null);
  const panRef = useRef(null);

  // Recount pages whenever the content or geometry changes
  useLayoutEffect(() => {
    const measured = measureRef.current?.scrollHeight || 0;
    const needed = Math.max(1, Math.ceil(measured / contentHeight));
    setPageCount(Math.min(maxPages, needed));
  }, [fields, template, contentHeight, maxPages]);

  const changeZoom = (delta) =>
    setZoom((current) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((current + delta) * 100) / 100)),
    );

  // Fit the paper width into the visible area
  const fitToWidth = useCallback(() => {
    const available = scrollRef.current?.clientWidth;
    if (!available) return;
    const next = (available - 48) / width;
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100)));
  }, [width]);

  const handlePanStart = (event) => {
    if (!handTool || !scrollRef.current) return;
    event.preventDefault();
    panRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: scrollRef.current.scrollLeft,
      top: scrollRef.current.scrollTop,
    };
    setPanning(true);
  };

  const handlePanMove = (event) => {
    const start = panRef.current;
    if (!start || !scrollRef.current) return;
    scrollRef.current.scrollLeft = start.left - (event.clientX - start.x);
    scrollRef.current.scrollTop = start.top - (event.clientY - start.y);
  };

  const handlePanEnd = () => {
    if (!panRef.current) return;
    panRef.current = null;
    setPanning(false);
  };

  const toolbarColor = darkMode ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)";
  const pages = Array.from({ length: pageCount }, (_, index) => index);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1.5,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
          flexShrink: 0,
        }}
      >
        <Tooltip title="Zoom out">
          <span>
            <IconButton size="small" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Typography
          variant="caption"
          sx={{ width: 44, textAlign: "center", color: toolbarColor, fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(zoom * 100)}%
        </Typography>

        <Tooltip title="Zoom in">
          <span>
            <IconButton size="small" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Fit to width">
          <IconButton size="small" onClick={fitToWidth}>
            <FitIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

        <Tooltip title={handTool ? "Hand tool on" : "Hand tool: drag to move"}>
          <IconButton
            size="small"
            onClick={() => setHandTool((on) => !on)}
            sx={{
              color: handTool ? "#0088cc" : "inherit",
              bgcolor: handTool ? "rgba(0,136,204,0.12)" : "transparent",
            }}
          >
            <PanToolIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        <Typography variant="caption" sx={{ color: toolbarColor }}>
          {pageCount === 1 ? "1 page" : `${pageCount} pages`}
          {pageCount >= maxPages ? ` (max ${maxPages})` : ""}
        </Typography>
      </Box>

      {/* Scrollable paper area */}
      <Box
        ref={scrollRef}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        sx={{
          flexGrow: 1,
          overflow: "auto",
          // Anchors the off-screen measurer below so it cannot widen this scroll area
          position: "relative",
          bgcolor: darkMode ? "#151515" : "#eceff1",
          cursor: handTool ? (panning ? "grabbing" : "grab") : "default",
          // Panning must not select the resume text
          userSelect: handTool ? "none" : "auto",
          display: "flex",
          justifyContent: "center",
          p: 3,
        }}
      >
        {/* Scaled stack. The wrapper reserves the scaled size so scrollbars are
            accurate while the pages themselves stay at real pixel sizes. */}
        <Box
          sx={{
            width: width * zoom,
            flexShrink: 0,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            display: "flex",
            flexDirection: "column",
            gap: `${24 / zoom}px`,
          }}
        >
          {pages.map((pageIndex) => (
            <Box
              key={pageIndex}
              sx={{
                position: "relative",
                width,
                height,
                flexShrink: 0,
                bgcolor: "#ffffff",
                boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: margins.top,
                  left: margins.left,
                  width: contentWidth,
                  height: contentHeight,
                  overflow: "hidden",
                  // Children must wrap within the printable width, not stretch it
                  minWidth: 0,
                }}
              >
                <Box sx={{ transform: `translateY(${-pageIndex * contentHeight}px)` }}>
                  {body}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Off-screen measurer: same printable width, natural height */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            left: -99999,
            top: 0,
            width: contentWidth,
          }}
        >
          <Box ref={measureRef}>{body}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ResumePreview;
