import React from "react";
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";

// Card wrapper that reveals an edit icon in the top-right corner on hover.
// Clicking it swaps the read-only children for `editContent` in place, with an
// Update button that stays disabled until something actually changes.
const EditableSection = ({
  title,
  darkMode = false,
  editing = false,
  dirty = false,
  saving = false,
  onEdit,
  onCancel,
  onSave,
  editContent,
  children,
  sx = {},
}) => (
  <Box
    sx={{
      position: "relative",
      "&:hover .section-edit-btn": { opacity: 1 },
      ...sx,
    }}
  >
    {!editing && (
      <Tooltip title={title ? `Edit ${title}` : "Edit"}>
        <IconButton
          className="section-edit-btn"
          size="small"
          aria-label={title ? `Edit ${title}` : "Edit"}
          onClick={onEdit}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            color: "#0088cc",
            bgcolor: darkMode ? "rgba(0,136,204,0.15)" : "rgba(0,136,204,0.08)",
            // Always visible on touch screens, hover reveal on desktop
            opacity: { xs: 1, md: 0 },
            transition: "opacity 0.2s ease",
            "&:hover": {
              bgcolor: darkMode ? "rgba(0,136,204,0.3)" : "rgba(0,136,204,0.18)",
            },
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}

    {title && (
      <Typography
        variant="h6"
        sx={{ mb: 2, pr: 5, color: darkMode ? "#ffffff" : "#000000" }}
      >
        {title}
      </Typography>
    )}

    {editing ? (
      <>
        {editContent}
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            disabled={!dirty || saving}
            onClick={onSave}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              bgcolor: "#0088cc",
              "&:hover": { bgcolor: "#006699" },
              textTransform: "none",
            }}
          >
            {saving ? "Updating..." : "Update"}
          </Button>
          <Button
            size="small"
            onClick={onCancel}
            disabled={saving}
            sx={{
              textTransform: "none",
              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            }}
          >
            Cancel
          </Button>
        </Box>
      </>
    ) : (
      children
    )}
  </Box>
);

export default EditableSection;
