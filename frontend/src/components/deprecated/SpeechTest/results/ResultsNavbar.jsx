import React from "react";
import { Box, Typography } from "@mui/material";
import SetupHeader from "../setup/SetupHeader";
import ProfileBadge from "../setup/ProfileBadge";
import SignalBars from "../overview/SignalBars";

/**
 * Fixed top bar of the results page: brand on the left; on the right the page
 * title with a "Result ready" tag, the connection indicator and the signed-in
 * user's profile. Going back is done from the arrow in the blue ribbon below.
 */
const ResultsNavbar = ({ title }) => (
  <SetupHeader subtitle="Speech Judge">
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 2, minWidth: 0, justifyContent: "flex-end" }}>
      <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.95rem", display: { xs: "none", sm: "block" } }}>
        {title} results
      </Typography>
      <Box
        component="span"
        sx={{
          px: 1.25,
          py: 0.3,
          borderRadius: "999px",
          fontSize: "0.74rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
          color: "#4caf50",
          bgcolor: "rgba(76, 175, 80, 0.12)",
          border: "1px solid rgba(76, 175, 80, 0.35)",
        }}
      >
        Result ready
      </Box>
      <SignalBars />
      <ProfileBadge />
    </Box>
  </SetupHeader>
);

export default ResultsNavbar;
