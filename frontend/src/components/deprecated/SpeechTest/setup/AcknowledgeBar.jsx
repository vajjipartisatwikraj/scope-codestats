import React from "react";
import { Box, Button, Checkbox, CircularProgress, FormControlLabel } from "@mui/material";
import useSurface from "./useSurface";

/**
 * "I have read this" checkbox paired with the button that moves on. The button
 * stays disabled until the box is ticked and `disabled` is false.
 */
const AcknowledgeBar = ({ checked, onChange, label, actionLabel, onAction, disabled = false, loading = false }) => {
  const { card, border, accent } = useSurface();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        px: 2,
        py: 0.75,
        bgcolor: card,
        border: `1px solid ${border}`,
        borderRadius: "14px",
      }}
    >
      <FormControlLabel
        sx={{ m: 0 }}
        control={
          <Checkbox
            size="small"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            sx={{ color: border, "&.Mui-checked": { color: accent } }}
          />
        }
        label={label}
        slotProps={{ typography: { variant: "body2" } }}
      />

      <Button
        variant="contained"
        disableElevation
        onClick={onAction}
        disabled={disabled || !checked || loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.88rem",
          borderRadius: "9px",
          px: 3,
          py: 0.6,
          bgcolor: accent,
          "&:hover": { bgcolor: "#046bb8" },
        }}
      >
        {actionLabel}
      </Button>
    </Box>
  );
};

export default AcknowledgeBar;
