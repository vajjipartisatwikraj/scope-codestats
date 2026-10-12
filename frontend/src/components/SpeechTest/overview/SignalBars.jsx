import React from "react";
import { Box } from "@mui/material";
import useSurface from "../setup/useSurface";
import useOnlineStatus from "../useOnlineStatus";

const OFFLINE_RED = "#e5484d";

/**
 * Connection indicator: four green bars while the browser is online; a single
 * red bar when the connection is lost. It only reflects whether the internet
 * is connected, not how fast it is.
 */
const SignalBars = () => {
  const { border } = useSurface();
  const online = useOnlineStatus();

  return (
    <Box
      role="img"
      aria-label={online ? "Internet connected" : "No internet connection"}
      title={online ? "Connected" : "No internet connection"}
      sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 18 }}
    >
      {[0, 1, 2, 3].map((bar) => (
        <Box
          key={bar}
          sx={{
            width: 4,
            height: 6 + bar * 4,
            borderRadius: 1,
            bgcolor: online ? "#4caf50" : bar === 0 ? OFFLINE_RED : border,
            transition: "background-color 0.3s",
          }}
        />
      ))}
    </Box>
  );
};

export default SignalBars;
