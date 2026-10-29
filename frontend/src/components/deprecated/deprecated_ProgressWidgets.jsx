import React from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { getInnerGlassStyle } from "../Dashboard/dashboardUtils";
import { chartTheme } from "../Dashboard/progress/progressFormat";

/** A titled card that holds one chart. */
export const ChartCard = ({ title, subtitle, darkMode, children, height = 280, minWidth }) => (
  <Box
    sx={{
      ...getInnerGlassStyle(darkMode),
      p: { xs: 2, sm: 2.5 },
      minWidth: minWidth || 0,
      // The glass style lifts cards on hover; a chart should hold still under the cursor.
      "&:hover": { transform: "none" },
    }}
  >
    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</Typography>
    {subtitle && (
      <Typography variant="caption" sx={{ color: chartTheme(darkMode).text, display: "block", mb: 1 }}>
        {subtitle}
      </Typography>
    )}
    <Box sx={{ width: "100%", height, mt: subtitle ? 0 : 1 }}>{children}</Box>
  </Box>
);

/** One headline number. */
export const KpiTile = ({ label, value, hint, color, darkMode }) => (
  <Box sx={{ ...getInnerGlassStyle(darkMode), p: 2, "&:hover": { transform: "none" } }}>
    <Typography
      variant="caption"
      sx={{ color: chartTheme(darkMode).text, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.2, color: color || "inherit" }}>
      {value}
    </Typography>
    {hint && (
      <Typography variant="caption" sx={{ color: chartTheme(darkMode).text }}>
        {hint}
      </Typography>
    )}
  </Box>
);

/** Row of KPI tiles that wraps on small screens. */
export const KpiRow = ({ children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, mb: 2.5 }}>
    {children}
  </Box>
);

/** Charts laid out two across on wide screens. */
export const ChartGrid = ({ children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2.5 }}>
    {children}
  </Box>
);

/** Shown inside a chart card when there is nothing to draw. */
export const EmptyChart = ({ message, darkMode }) => (
  <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2 }}>
    <Typography variant="body2" sx={{ color: chartTheme(darkMode).text }}>
      {message}
    </Typography>
  </Box>
);

export const LoadingBlock = ({ label = "Loading..." }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, py: 8 }}>
    <CircularProgress size={28} />
    <Typography variant="body2">{label}</Typography>
  </Box>
);

/** A request that failed outright (network, server). */
export const LoadError = ({ message, onRetry }) => (
  <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : null} sx={{ my: 2 }}>
    {message}
  </Alert>
);
