import React from "react";
import { Box } from "@mui/material";
import SignalBars from "../overview/SignalBars";
import ProfileBadge from "./ProfileBadge";

/**
 * The connection indicator and the signed-in user's profile, as they appear at
 * the right end of every speech-test top bar. Pass `interactive={false}` where
 * pressing the profile must not leave the page.
 */
const HeaderTools = ({ interactive = true }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
    <SignalBars />
    <ProfileBadge interactive={interactive} />
  </Box>
);

export default HeaderTools;
