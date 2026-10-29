import React from "react";
import { Alert, Box, Button, CircularProgress, Paper, Typography, useTheme } from "@mui/material";
import { chartTheme } from "./performanceFormat";

/** The card look of the admin dashboard (same surface and border as the other tabs). */
export const panelSx = (theme) => ({
  p: { xs: 2, md: 3 },
  borderRadius: 2,
  backgroundColor: theme.palette.mode === "dark" ? "#0A0A0A" : "white",
  border: theme.palette.mode === "dark" ? "1px solid #232323" : "1px solid rgba(0,0,0,0.1)",
  backgroundImage: "none",
});

/** Theme-aware colours for chart axes, grid and tooltip. */
export const useChartTheme = () => chartTheme(useTheme().palette.mode === "dark");

/** A titled card. */
export const Panel = ({ title, subtitle, actions, children, sx }) => {
  const theme = useTheme();
  return (
    <Paper sx={{ ...panelSx(theme), ...sx }}>
      {(title || actions) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Box>
            {title && <Typography variant="h6">{title}</Typography>}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions}
        </Box>
      )}
      {children}
    </Paper>
  );
};

/** One headline number. */
export const StatTile = ({ label, value, hint, color }) => {
  const theme = useTheme();
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%", backgroundColor: "transparent", borderColor: theme.palette.divider }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.25, color: color || "text.primary" }}>{value}</Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Paper>
  );
};

/** Fixed-height box for a chart, with a message instead when there is nothing to draw. */
export const ChartBox = ({ height = 280, empty, children }) => (
  <Box sx={{ width: "100%", height }}>
    {empty ? (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {empty}
        </Typography>
      </Box>
    ) : (
      children
    )}
  </Box>
);

export const LoadingBlock = ({ label = "Loading..." }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, py: 8 }}>
    <CircularProgress size={28} />
    <Typography variant="body2">{label}</Typography>
  </Box>
);

export const LoadError = ({ message, onRetry }) => (
  <Alert
    severity="error"
    action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : null}
    sx={{ my: 2 }}
  >
    {message}
  </Alert>
);
