import React from "react";
import { ConfirmDialog, Notice } from "../../ui";

/**
 * Confirmation before staff delete a student's test submission. `entry` is a row from the results
 * table; the dialog is closed when it is null. The danger button repeats the verb of the title,
 * and focus starts on Cancel.
 */
const DeleteSubmissionDialog = ({ entry, busy, onCancel, onConfirm }) => {
  const finished = entry?.status === "completed";
  const roll = entry?.user?.rollNumber ? entry.user.rollNumber.toUpperCase() : "";
  const who = entry ? `${entry.user.name || "This student"}${roll ? ` (${roll})` : ""}. ` : "";

  return (
    <ConfirmDialog
      open={Boolean(entry)}
      onClose={() => !busy && onCancel()}
      busy={busy}
      danger
      title="Delete this submission?"
      description={`${who}${
        finished
          ? "This removes the student's scores and their place on the leaderboard."
          : "This removes the student's progress in a test they have not finished."
      } They can take the test again from the start while it is still open. This cannot be undone.`}
      confirmLabel={busy ? "Deleting\u2026" : "Delete submission"}
      onConfirm={onConfirm}
    >
      <Notice tone="info">If the test window has already closed, the student will not be able to retake it.</Notice>
    </ConfirmDialog>
  );
};

export default DeleteSubmissionDialog;
