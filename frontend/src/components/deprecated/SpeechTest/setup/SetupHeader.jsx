import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import useSurface from "./useSurface";

/**
 * Top bar of the pre-test screens: platform logo and the name of the flow on
 * the left, the step indicator (passed as children) on the right. The logo
 * returns to the test list.
 */
const HEADER_HEIGHT = 72;

const SetupHeader = ({ subtitle, to = "/speech-tests", locked = false, children }) => {
  const { card, border, isDark } = useSurface();

  return (
    <>
    {/* The bar is fixed to the viewport. (position: sticky would not work here:
        the app shell wraps the page in overflow containers.) This spacer keeps
        the page content from sliding underneath it. */}
    <Box aria-hidden sx={{ height: HEADER_HEIGHT, flexShrink: 0 }} />
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        height: HEADER_HEIGHT,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: { xs: 2, md: 6 },
        bgcolor: card,
        borderBottom: `1px solid ${border}`,
      }}
    >
      <Box
        // `locked` turns the brand into plain text, so it cannot be used to walk
        // away from a running section.
        {...(locked ? {} : { component: RouterLink, to, "aria-label": "Back to speech tests" })}
        sx={{ display: "flex", alignItems: "center", gap: 1.25, textDecoration: "none", color: "inherit" }}
      >
        <Box component="img" src="/scope-blac.png" alt="" sx={{ width: 38, height: 38, objectFit: "contain" }} />
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "1.3rem",
              lineHeight: 1.1,
              letterSpacing: "0.4px",
              color: isDark ? "#fff" : "#101010",
            }}
          >
            C{"<>"}destats
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {children}
    </Box>
    </>
  );
};

export default SetupHeader;
