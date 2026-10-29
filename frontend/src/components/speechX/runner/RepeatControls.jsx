import React from "react";
import { SpeakerHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { SpeakerLowIcon } from "@phosphor-icons/react/dist/csr/SpeakerLow";
import { Button, Notice } from "../../ui";
import { isSpeechSupported } from "../../../utils/browserSpeech";
import PromptText from "./PromptText";
import "./runner.css";

/**
 * Listen-then-repeat prompt. The browser reads the sentence aloud and the text is never shown.
 * Recording is disabled by the parent while it plays.
 */
const RepeatControls = ({ speaking, disabled, onPlay }) => {
  if (!isSpeechSupported()) {
    return (
      <div className="sxr-prompt-gap">
        <Notice tone="danger" title="This browser cannot play spoken sentences">
          Please use a recent version of Chrome or Edge.
        </Notice>
      </div>
    );
  }

  return (
    <div>
      <PromptText>Listen carefully, then repeat the sentence exactly as you heard it.</PromptText>
      <div className="sxr-actions">
        <Button
          loading={speaking}
          disabled={disabled}
          startIcon={<SpeakerHighIcon size={18} weight="regular" aria-hidden="true" />}
          onClick={() => onPlay(0.95)}
        >
          {speaking ? "Playing…" : "Play sentence"}
        </Button>
        <Button
          disabled={speaking || disabled}
          startIcon={<SpeakerLowIcon size={18} weight="regular" aria-hidden="true" />}
          onClick={() => onPlay(0.7)}
        >
          Play slowly
        </Button>
      </div>
    </div>
  );
};

export default RepeatControls;
