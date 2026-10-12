import React from "react";
import { Button } from "@mui/material";
import useSurface from "../setup/useSurface";

/** Toggle button for a question bookmark. Tinted in the mark's colour while on. */
const MarkButton = ({ active, color, disabled, startIcon, onClick, children }) => {
  const { border } = useSurface();

  return (
    <Button
      variant="outlined"
      disabled={disabled}
      startIcon={startIcon}
      onClick={onClick}
      aria-pressed={active}
      sx={{
        textTransform: "none",
        fontWeight: 700,
        fontSize: "0.88rem",
        borderRadius: "10px",
        px: 2,
        py: 0.8,
        color: active ? color : "text.primary",
        borderColor: active ? color : border,
        bgcolor: active ? `${color}1f` : "transparent",
        "&:hover": { borderColor: color, bgcolor: `${color}14` },
      }}
    >
      {children}
    </Button>
  );
};

export default MarkButton;
