import React from "react";
import { Button, CircularProgress } from "@mui/material";
import useSurface from "./useSurface";

/**
 * The two button styles used across the pre-test screens: a filled platform
 * blue `primary` and an outlined `secondary`. `loading` shows a spinner and
 * disables the button.
 */
const SetupButton = ({ variant = "primary", loading = false, disabled = false, startIcon, sx, children, ...rest }) => {
  const { accent, border } = useSurface();
  const primary = variant === "primary";

  return (
    <Button
      variant={primary ? "contained" : "outlined"}
      disableElevation
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.92rem",
        borderRadius: "10px",
        px: 3.5,
        py: 0.9,
        ...(primary
          ? { bgcolor: accent, "&:hover": { bgcolor: "#046bb8" } }
          : { color: "text.primary", borderColor: border, "&:hover": { borderColor: accent } }),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default SetupButton;
