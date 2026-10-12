import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import StyledDialog from "../../common/StyledDialog";
import SetupButton from "../setup/SetupButton";
import useSurface from "../setup/useSurface";
import { isTextOnly } from "../speechTestMeta";

/** Confirmation before a section's timer starts. `section` is null when closed. */
export const StartSectionDialog = ({ section, onClose, onConfirm }) => {
  const { isDark } = useSurface();

  return (
    <StyledDialog
      open={Boolean(section)}
      onClose={onClose}
      darkMode={isDark}
      icon={<PlayArrowRoundedIcon />}
      title={section ? `Start "${section.title}"?` : ""}
      subtitle="The section timer starts the moment you continue."
      actions={
        <>
          <SetupButton variant="secondary" onClick={onClose}>
            Not yet
          </SetupButton>
          <SetupButton onClick={onConfirm}>Start section</SetupButton>
        </>
      }
    >
      {section && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="body2">
            You will have <strong>{section.timeLimitMinutes} minutes</strong> for{" "}
            <strong>{section.questionCount}</strong> question{section.questionCount === 1 ? "" : "s"}. When time runs
            out, your answers are submitted automatically.
          </Typography>
          <Alert severity="warning">
            {isTextOnly(section.type) ? "" : "Allow microphone access, and "}
            {isTextOnly(section.type) ? "Do" : "do"} not close the tab or press back while the section is running. If
            you try to leave, you will be asked whether to submit the section.
          </Alert>
        </Box>
      )}
    </StyledDialog>
  );
};

/** Confirmation before the test is ended and the final score is fixed. */
export const EndTestDialog = ({ open, busy, total, onClose, onConfirm }) => {
  const { isDark } = useSurface();

  return (
    <StyledDialog
      open={open}
      onClose={() => !busy && onClose()}
      darkMode={isDark}
      icon={<FlagOutlinedIcon />}
      title="End the test?"
      subtitle="Your final score is fixed once you end."
      actions={
        <>
          <SetupButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </SetupButton>
          <SetupButton onClick={onConfirm} loading={busy}>
            {busy ? "Ending…" : "End test"}
          </SetupButton>
        </>
      }
    >
      <Typography variant="body2">
        All {total} section{total === 1 ? "" : "s"} have scores. Ending the test combines them into one score out of 100
        and places you on the leaderboard.
      </Typography>
    </StyledDialog>
  );
};
