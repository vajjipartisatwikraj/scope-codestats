import React from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import StyledDialog from "../../common/StyledDialog";
import { BRAND } from "../speechTestMeta";

/**
 * Confirmation shown before a section is submitted, either on purpose
 * ("submit") or because the student tried to leave ("leave").
 */
export const SubmitDialog = ({ kind, isDark, answered, total, onCancel, onConfirm }) => {
  const leaving = kind === "leave";
  const missing = total - answered;

  return (
    <StyledDialog
      open={kind !== null}
      onClose={onCancel}
      darkMode={isDark}
      icon={<SendIcon />}
      title={leaving ? "Leave this section?" : "Submit this section?"}
      subtitle={
        leaving
          ? "Leaving means submitting it. The timer cannot be paused."
          : `${answered} of ${total} questions answered`
      }
      actions={
        <>
          <Button onClick={onCancel} sx={{ textTransform: "none" }}>
            Keep working
          </Button>
          <Button
            variant="contained"
            onClick={onConfirm}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: BRAND }}
          >
            Yes, submit section
          </Button>
        </>
      }
    >
      <Typography variant="body2">
        {leaving
          ? "Are you sure you want to submit this section? Your answers will be sent for scoring and you will not be able to change them."
          : "Once submitted you cannot change your answers. Unanswered questions score zero."}
      </Typography>
      {missing > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {missing} question{missing === 1 ? " is" : "s are"} still unanswered.
        </Alert>
      )}
    </StyledDialog>
  );
};

/** Full-screen veil while answers are being flushed and the section submitted. */
export const SubmittingOverlay = () => (
  <Box
    sx={{
      position: "fixed",
      inset: 0,
      zIndex: 1400,
      bgcolor: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 2,
      color: "#fff",
    }}
  >
    <CircularProgress color="inherit" />
    <Typography>Saving and submitting your section…</Typography>
  </Box>
);
