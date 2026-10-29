import React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { Badge } from "../../ui";

/**
 * Shows what the microphone check heard, with a badge (icon and word) for the verdict and the
 * reasons when the audio was not clear. Also covers the "check unavailable" case, so a service
 * problem never reads as the student's fault. It is a polite live region: the result is read out
 * when it arrives.
 *
 * Props: result { available, clear, transcript, issues[] }
 */
const TranscriptPanel = ({ result }) => {
  const unavailable = result.available === false;
  const clear = !unavailable && result.clear;

  const badge = unavailable
    ? { label: "Check skipped", tone: "neutral", icon: <MinusCircleIcon size={14} weight="fill" aria-hidden="true" /> }
    : clear
    ? { label: "Clear audio", tone: "success", icon: <CheckCircleIcon size={14} weight="fill" aria-hidden="true" /> }
    : { label: "Unclear audio", tone: "warning", icon: <WarningCircleIcon size={14} weight="fill" aria-hidden="true" /> };

  return (
    <div className="sxs-transcript" role="status" aria-live="polite">
      <div className="sxs-transcript__head">
        <h3 className="sxs-transcript__title">{unavailable ? "Audio check" : "What we heard"}</h3>
        <Badge tone={badge.tone} icon={badge.icon}>
          {badge.label}
        </Badge>
      </div>

      {unavailable ? (
        <p className="sxs-transcript__text">
          The audio check is not available right now. Your microphone will still be used in the test, so you can continue.
        </p>
      ) : (
        <>
          <p className="sxs-transcript__quote">{result.transcript ? `\u201C${result.transcript}\u201D` : "No speech detected"}</p>
          {result.issues?.length > 0 ? (
            <ul className="sxs-transcript__issues">
              {result.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
};

export default TranscriptPanel;
