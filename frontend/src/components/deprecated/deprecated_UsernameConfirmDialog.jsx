import React from "react";
import { Button, CircularProgress, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import StyledDialog from "../common/StyledDialog";

/**
 * Asks before a platform username is removed or replaced by a different account, because
 * both permanently delete the progress history stored for the old account.
 *
 * @param {object|null} request null closes the dialog; otherwise
 *   { action: "remove" | "change", platformName, username, newUsername, hasHistory }
 */
const UsernameConfirmDialog = ({ request, darkMode, busy, onCancel, onConfirm }) => {
  if (!request) return null;
  const { action, platformName, username, newUsername, hasHistory } = request;
  const removing = action === "remove";

  const consequence = hasHistory
    ? `Your ${platformName} stats and all the history stored for "${username}" (progress, score and rank on ${platformName}) will be permanently deleted. This cannot be undone.`
    : `Your ${platformName} stats for "${username}" will be cleared.`;

  return (
    <StyledDialog
      open
      onClose={busy ? undefined : onCancel}
      darkMode={darkMode}
      accent="#d32f2f"
      icon={removing ? <DeleteOutlineIcon /> : <SwapHorizIcon />}
      title={removing ? `Remove ${platformName} username?` : `Change ${platformName} username?`}
      subtitle={removing ? username : `${username} → ${newUsername}`}
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onCancel} disabled={busy} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={onConfirm}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            {removing ? "Remove username" : "Change and delete history"}
          </Button>
        </>
      }
    >
      <Typography variant="body2" sx={{ mb: 1 }}>
        {removing
          ? `This unlinks "${username}" from your profile.`
          : `You are switching to a different account, "${newUsername}". Progress is tracked per account, so the new one starts from zero history.`}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {consequence}
      </Typography>
      {hasHistory && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Your total score and your overall and department rank history are kept.
        </Typography>
      )}
    </StyledDialog>
  );
};

export default UsernameConfirmDialog;
