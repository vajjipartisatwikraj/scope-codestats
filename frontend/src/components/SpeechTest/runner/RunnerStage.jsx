import React from "react";
import { Box, useTheme } from "@mui/material";
import { FOOTER_HEIGHT } from "./runnerTheme";

/**
 * The area between the fixed top bar and the app footer. It fills exactly the
 * rest of the viewport and never scrolls itself; anything taller than the screen scrolls inside
 * its own column. The background is the platform's page colour.
 */
const RunnerStage = ({ children, sx }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: {
          xs: `calc(100vh - 72px - ${FOOTER_HEIGHT.xs})`,
          sm: `calc(100vh - 72px - ${FOOTER_HEIGHT.sm})`,
        },
        overflow: "hidden",
        bgcolor: theme.palette.background.default,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default RunnerStage;
