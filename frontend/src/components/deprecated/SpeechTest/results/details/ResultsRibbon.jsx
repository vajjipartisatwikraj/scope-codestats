import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import Reveal from "../../setup/Reveal";
import Collapsible, { DURATION, EASE } from "./Collapsible";
import RibbonItem from "./RibbonItem";
import RibbonBackButton from "./RibbonBackButton";
import { formatClock, formatDateTime, formatShortDateTime, typeLabel } from "../../speechTestMeta";

const transition = (...properties) => ({
  transition: properties.map((p) => `${p} ${DURATION} ${EASE}`).join(", "),
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
});

/**
 * Blue band across the full width under the top bar. A round back arrow at its
 * left returns to the section list.
 *
 * Open: the test name with when it ran and was submitted on the left, and the
 * section's type, time limit, time taken and answered count on the right.
 * `collapsed` (set while the page is scrolled) folds it to a navbar-sized strip:
 * only the "Speech test" name stays on the left and only the "Section type" on
 * the right, each keeping its small caption, and everything else fades out as
 * the band shrinks.
 */
const ResultsRibbon = ({ report, collapsed = false, onBack }) => {
  const { accent } = useSurface();
  const { test, section } = report;

  const stats = [
    ["Section type", typeLabel(section.type)],
    ["Duration", `${section.timeLimitMinutes} min`],
    ["Time taken", formatClock(section.timeUsedSeconds)],
    ["Answered", `${section.answeredCount} of ${section.questionCount}`],
  ];

  return (
    <Box
      component="section"
      aria-label="Test details"
      sx={{ position: "relative", bgcolor: accent, color: "#fff", width: "100%" }}
    >
      {/* At the ribbon's left, in line with the logo in the bar above (same side padding),
          and centred vertically. The full-height wrapper keeps it centred while the ribbon
          changes height; it lets clicks through everywhere except on the button itself. */}
      <Box
        sx={{
          position: "absolute",
          zIndex: 1,
          top: 0,
          bottom: 0,
          left: { xs: 16, md: 48 },
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <Reveal y={0} delay={0.05} sx={{ display: "flex", pointerEvents: "auto" }}>
          <RibbonBackButton onClick={onBack} />
        </Reveal>
      </Box>

      <Box
        sx={{
          maxWidth: 1240,
          mx: "auto",
          boxSizing: "border-box",
          px: { xs: 2, md: 6 },
          // On phones the arrow sits above the content, so make room for it.
          pt: collapsed ? 1.25 : { xs: 7, md: 3 },
          pb: collapsed ? 1.25 : { xs: 2.5, md: 3 },
          // 48px normally (lining up with the cards below). On screens narrow enough for the
          // arrow to reach the text, it grows so the text always starts at least 102px from the edge.
          pl: {
            xs: collapsed ? 9 : 2,
            md: "max(48px, calc(102px - max(0px, (100vw - 1240px) / 2)))",
          },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: { xs: collapsed ? "row" : "column", md: "row" },
          gap: { xs: collapsed ? 2 : 2.5, md: 5 },
          ...transition("padding"),
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 2.25,
            alignSelf: { xs: collapsed ? "center" : "stretch", md: "center" },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
          <Reveal y={8} delay={0.12}>
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.72)",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                pb: 0.4,
              }}
            >
              Speech test
            </Typography>

            <Typography
              component="h1"
              noWrap
              sx={{
                fontWeight: 700,
                fontSize: collapsed ? "1rem" : "1.6rem",
                lineHeight: 1.25,
                ...transition("font-size"),
              }}
            >
              {test.title}
            </Typography>
          </Reveal>

          <Collapsible open={!collapsed}>
            <Reveal
              y={8}
              delay={0.22}
              sx={{ pt: 1.75, display: "flex", flexWrap: "wrap", columnGap: 4, rowGap: 1.25 }}
            >
              <RibbonItem label="Available">
                {formatShortDateTime(test.startTime)} to {formatShortDateTime(test.endTime)}
              </RibbonItem>
              <RibbonItem label="Submitted">{formatDateTime(section.submittedAt)}</RibbonItem>
            </Reveal>
          </Collapsible>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: { xs: "wrap", md: "nowrap" },
            columnGap: { xs: 3, md: 0 },
            rowGap: 2,
            flexShrink: 0,
          }}
        >
          {stats.map(([label, value], i) => {
            const first = i === 0;
            const item = (
              <Box
                sx={
                  first
                    ? undefined
                    : { ml: { md: 3 }, pl: { md: 3 }, borderLeft: { md: "1px solid rgba(255, 255, 255, 0.28)" } }
                }
              >
                {/* The figures settle in one after another, left to right. */}
                <Reveal y={8} delay={0.2 + i * 0.07}>
                  <RibbonItem label={label} large compact={collapsed}>
                    {value}
                  </RibbonItem>
                </Reveal>
              </Box>
            );

            // The section type stays; the other figures fold away sideways.
            return first ? (
              <React.Fragment key={label}>{item}</React.Fragment>
            ) : (
              <Collapsible key={label} axis="x" open={!collapsed}>
                {item}
              </Collapsible>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default ResultsRibbon;
