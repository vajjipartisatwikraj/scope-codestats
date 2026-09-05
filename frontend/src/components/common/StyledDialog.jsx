import React from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

/**
 * Shared dialog shell: rounded panel, blurred backdrop, an accent icon tile
 * beside the title, a subtitle, a close button, and separated header/footer.
 *
 * Pass `accent` to tint the header and icon (red for destructive actions).
 * Anything MUI-specific that is not covered here goes through `dialogProps`.
 */
const StyledDialog = ({
  open,
  onClose,
  darkMode = false,
  icon,
  title,
  subtitle,
  accent = "#0088cc",
  actions,
  maxWidth = "sm",
  fullScreen = false,
  contentSx = {},
  dialogProps = {},
  children,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth={maxWidth}
    fullWidth
    fullScreen={fullScreen}
    slotProps={{
      backdrop: {
        sx: { backdropFilter: "blur(6px)", bgcolor: "rgba(0,0,0,0.55)" },
      },
    }}
    PaperProps={{
      sx: {
        borderRadius: fullScreen ? 0 : "20px",
        bgcolor: darkMode ? "#121212" : "#ffffff",
        border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
        boxShadow: darkMode
          ? "0 24px 60px rgba(0,0,0,0.7)"
          : "0 24px 60px rgba(0,0,0,0.18)",
        backgroundImage: "none",
        overflow: "hidden",
      },
    }}
    {...dialogProps}
  >
    {/* Header band with a subtle accent wash */}
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        p: 3,
        pb: 2.5,
        background: `linear-gradient(135deg, ${accent}22 0%, transparent 70%)`,
        borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        flexShrink: 0,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${accent}26`,
            color: accent,
            "& svg": { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "1.15rem",
            color: darkMode ? "#ffffff" : "#000000",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ mt: 0.25, color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      <IconButton
        onClick={onClose}
        size="small"
        aria-label="Close"
        sx={{ color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>

    <DialogContent sx={{ p: 3, ...contentSx }}>{children}</DialogContent>

    {actions && (
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
          flexShrink: 0,
          borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        {actions}
      </DialogActions>
    )}
  </Dialog>
);

export default StyledDialog;
