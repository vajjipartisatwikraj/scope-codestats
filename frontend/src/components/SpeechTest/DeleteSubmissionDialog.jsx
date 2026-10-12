import React from "react";
import { Alert, Button, Typography, useTheme } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StyledDialog from "../common/StyledDialog";

/**
 * Confirmation before an admin deletes a student's test submission.
 * `entry` is a row from the results table; the dialog is closed when it is null.
 */
const DeleteSubmissionDialog = ({ entry, busy, onCancel, onConfirm }) => {
  const isDark = useTheme().palette.mode === "dark";
  const finished = entry?.status === "completed";

  return (
    <StyledDialog
      open={Boolean(entry)}
      onClose={() => !busy && onCancel()}
      darkMode={isDark}
      icon={<DeleteOutlineIcon />}
      accent="#d32f2f"
      title="Delete this submission?"
      subtitle={entry ? `${entry.user.name} · ${entry.user.rollNumber?.toUpperCase() || ""}` : ""}
      actions={
        <>
          <Button onClick={onCancel} disabled={busy} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onConfirm}
            disabled={busy}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {busy ? "Deleting…" : "Delete submission"}
          </Button>
        </>
      }
    >
      <Typography variant="body2">
        {finished
          ? "This removes the student's scores and their place on the leaderboard."
          : "This removes the student's progress in a test they have not finished."}{" "}
        They can take the test again from the start while it is still open. This cannot be undone.
      </Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        If the test window has already closed, the student will not be able to retake it.
      </Alert>
    </StyledDialog>
  );
};

export default DeleteSubmissionDialog;
