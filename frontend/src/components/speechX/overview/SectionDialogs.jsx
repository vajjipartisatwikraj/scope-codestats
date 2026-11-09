import React, { useRef } from "react";
import { Button, ConfirmDialog, Dialog, Notice } from "../../ui";
import { isTextOnly } from "../shared";

/** Confirmation before a section's timer starts. `section` is null when closed. */
export const StartSectionDialog = ({ section, onClose, onConfirm }) => {
  const laterRef = useRef(null);
  const questions = section ? `${section.questionCount} question${section.questionCount === 1 ? "" : "s"}` : "";

  return (
    <Dialog
      open={Boolean(section)}
      onClose={onClose}
      size="sm"
      title={section ? `Start "${section.title}"?` : ""}
      description="The section timer starts the moment you continue."
      initialFocusRef={laterRef}
      actions={
        <>
          <Button ref={laterRef} onClick={onClose}>
            Not yet
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Start section
          </Button>
        </>
      }
    >
      {section ? (
        <div className="sxv-dialog">
          <p className="sxv-dialog__text">
            You will have <strong>{section.timeLimitMinutes} minutes</strong> for <strong>{questions}</strong>. When time runs out, your
            answers are submitted automatically.
          </p>
          <Notice tone="warning">
            {isTextOnly(section.type) ? "Do" : "Allow microphone access, and do"} not close the tab or press back while the section is
            running. If you try to leave, you will be asked whether to submit the section.
          </Notice>
        </div>
      ) : null}
    </Dialog>
  );
};

/**
 * Confirmation before the test is ended and the final score is fixed. When some sections have no
 * score yet, it says what happens to them: sections that are open, waiting for a score or failed
 * stay unscored, and sections never started are submitted with 0.
 *
 * Props: open, busy, total, scored, unfinished (open, waiting or failed), notStarted, onClose, onConfirm
 */
export const EndTestDialog = ({ open, busy, total, scored, unfinished, notStarted, onClose, onConfirm }) => {
  const incomplete = unfinished + notStarted > 0;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <ConfirmDialog
      open={open}
      onClose={() => !busy && onClose()}
      busy={busy}
      danger={incomplete}
      title="End the test?"
      description={
        incomplete
          ? `${scored} of ${total} sections have scores. Ending the test combines them into one score out of 100 and places you on the leaderboard. Your final score is fixed once you end, and sections without a score count as 0.`
          : `All ${total} section${total === 1 ? "" : "s"} have scores. Ending the test combines them into one score out of 100 and places you on the leaderboard. Your final score is fixed once you end.`
      }
      confirmLabel={busy ? "Ending\u2026" : "End test"}
      onConfirm={onConfirm}
    >
      {incomplete ? (
        <Notice tone="warning">
          <ul className="sxv-dialog__list">
            {unfinished > 0 ? (
              <li>
                {plural(unfinished, "section")} still open, waiting for a score or failed. {unfinished === 1 ? "It" : "They"} will stay unscored and
                get no score.
              </li>
            ) : null}
            {notStarted > 0 ? (
              <li>
                {plural(notStarted, "section")} not attempted. {notStarted === 1 ? "It" : "They"} will be submitted with a score of 0.
              </li>
            ) : null}
          </ul>
        </Notice>
      ) : null}
    </ConfirmDialog>
  );
};