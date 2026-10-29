import React, { useEffect, useRef } from "react";
import { HourglassIcon } from "@phosphor-icons/react/dist/csr/Hourglass";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneRight";
import { Button, Dialog, Notice } from "../../ui";
import "./runner.css";

/**
 * Confirmation shown before a section is submitted, either on purpose ("submit") or because the
 * student tried to leave ("leave"). Focus starts on "Keep working", the safe choice.
 */
export const SubmitDialog = ({ kind, answered, total, onCancel, onConfirm }) => {
  const leaving = kind === "leave";
  const missing = total - answered;
  const keepRef = useRef(null);

  return (
    <Dialog
      open={kind !== null}
      onClose={onCancel}
      size="sm"
      initialFocusRef={keepRef}
      title={leaving ? "Leave this section?" : "Submit this section?"}
      description={
        leaving
          ? "Leaving means submitting it. The timer cannot be paused."
          : `${answered} of ${total} questions answered.`
      }
      actions={
        <>
          <Button ref={keepRef} onClick={onCancel}>
            Keep working
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            startIcon={<PaperPlaneRightIcon size={18} weight="regular" aria-hidden="true" />}
          >
            Submit section
          </Button>
        </>
      }
    >
      <p className="sxr-dialog-text">
        {leaving
          ? "Are you sure you want to submit this section? Your answers will be sent for scoring and you will not be able to change them."
          : "Once submitted you cannot change your answers. Unanswered questions score zero."}
      </p>
      {missing > 0 && (
        <div className="sxr-prompt-gap">
          <Notice tone="warning">
            {missing} question{missing === 1 ? " is" : "s are"} still unanswered.
          </Notice>
        </div>
      )}
    </Dialog>
  );
};

/**
 * Full-screen veil while answers are being flushed and the section submitted. It behaves as a
 * modal: focus moves into it and Tab goes nowhere, so nothing behind it can be used. The status
 * line is announced politely.
 */
export const SubmittingOverlay = () => {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, []);

  return (
    <div className="sxr-veil">
      <div
        ref={panelRef}
        className="sxr-veil__panel"
        role="alertdialog"
        aria-modal="true"
        aria-label="Submitting your section"
        aria-describedby="sxr-veil-text"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Tab") event.preventDefault();
        }}
      >
        <HourglassIcon className="sxr-veil__icon sx-pulse" size={32} weight="regular" aria-hidden="true" />
        <p id="sxr-veil-text" className="sxr-veil__text" role="status">
          Saving and submitting your section…
        </p>
        <p className="sxr-veil__sub">Keep this page open. It takes a few seconds.</p>
      </div>
    </div>
  );
};
