import React from "react";
import { Box, Typography } from "@mui/material";
import SetupHeader from "../setup/SetupHeader";
import ProfileBadge from "../setup/ProfileBadge";
import SegmentedProgress from "./SegmentedProgress";
import SignalBars from "./SignalBars";
import useSurface from "../setup/useSurface";

/**
 * Fixed top bar of the section list: brand on the left, then where the student
 * is in the test, a segmented progress bar, the connection indicator and the
 * signed-in user's profile.
 */
const TestNavbar = ({ label, segments, progressLabel }) => {
  const { border, accent } = useSurface();

  return (
    <SetupHeader subtitle="Speech Judge">
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: { xs: 2, md: 3 }, minWidth: 0, ml: { md: 3 } }}>
        <Box aria-hidden sx={{ display: { xs: "none", md: "block" }, width: "1px", height: 34, bgcolor: border }} />

        <Typography
          sx={{
            display: { xs: "none", sm: "block" },
            color: accent,
            fontWeight: 600,
            fontSize: "0.78rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>

        <Box sx={{ flex: 1, display: { xs: "none", md: "flex" }, justifyContent: "center", minWidth: 0 }}>
          <SegmentedProgress segments={segments} label={progressLabel} />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
          <SignalBars />
          <ProfileBadge />
        </Box>
      </Box>
    </SetupHeader>
  );
};

export default TestNavbar;
