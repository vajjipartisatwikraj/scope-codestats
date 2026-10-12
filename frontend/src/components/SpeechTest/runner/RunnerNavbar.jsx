import React from "react";
import { Box, Typography } from "@mui/material";
import SetupHeader from "../setup/SetupHeader";
import ProfileBadge from "../setup/ProfileBadge";
import useSurface from "../setup/useSurface";
import SegmentedProgress from "../overview/SegmentedProgress";
import SignalBars from "../overview/SignalBars";
import TimerPill from "./TimerPill";

/**
 * Fixed top bar of the question screen: brand, where the student is in the test
 * (with the section title), one progress segment per question, the connection
 * indicator and the time left.
 *
 * The brand is not a link here, so the only ways out of a running section are
 * the submit and leave dialogs.
 */
const RunnerNavbar = ({ label, title, segments, progressLabel, remainingMs }) => {
  const { border, accent } = useSurface();

  return (
    <SetupHeader subtitle="Speech Judge" locked>
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: { xs: 2, md: 3 }, minWidth: 0, ml: { md: 3 } }}>
        <Box aria-hidden sx={{ display: { xs: "none", md: "block" }, width: "1px", height: 34, bgcolor: border }} />

        <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
          <Typography
            sx={{
              color: accent,
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}
          >
            {label}
          </Typography>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3 }}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, display: { xs: "none", md: "flex" }, justifyContent: "center", minWidth: 0 }}>
          <SegmentedProgress segments={segments} label={progressLabel} />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
          <Box sx={{ display: { xs: "none", sm: "flex" } }}>
            <SignalBars />
          </Box>
          <TimerPill remainingMs={remainingMs} />
          <ProfileBadge interactive={false} />
        </Box>
      </Box>
    </SetupHeader>
  );
};

export default RunnerNavbar;
