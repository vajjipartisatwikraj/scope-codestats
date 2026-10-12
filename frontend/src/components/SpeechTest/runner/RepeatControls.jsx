import React from "react";
import { Alert, Box } from "@mui/material";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import SetupButton from "../setup/SetupButton";
import { isSpeechSupported } from "../../../utils/browserSpeech";
import PromptText from "./PromptText";

/**
 * Listen-then-repeat prompt. The browser reads the sentence aloud and the text
 * is never shown. Recording is disabled by the parent while it plays.
 */
const RepeatControls = ({ speaking, disabled, onPlay }) => {
  if (!isSpeechSupported()) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        This browser cannot play spoken sentences. Please use a recent version of Chrome or Edge.
      </Alert>
    );
  }

  return (
    <Box>
      <PromptText>Listen carefully, then repeat the sentence exactly as you heard it.</PromptText>
      <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, flexWrap: "wrap" }}>
        <SetupButton
          loading={speaking}
          disabled={disabled}
          startIcon={<VolumeUpOutlinedIcon />}
          onClick={() => onPlay(0.95)}
          sx={{ fontWeight: 700 }}
        >
          {speaking ? "Playing…" : "Play sentence"}
        </SetupButton>
        <SetupButton variant="secondary" disabled={speaking || disabled} onClick={() => onPlay(0.7)} sx={{ fontWeight: 700 }}>
          Play slowly
        </SetupButton>
      </Box>
    </Box>
  );
};

export default RepeatControls;
