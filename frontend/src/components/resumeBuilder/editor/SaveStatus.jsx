import React, { useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { PencilSimpleLineIcon } from "@phosphor-icons/react/dist/csr/PencilSimpleLine";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { Tip, formatDateTime, relativeTime } from "../../ui";

/**
 * The save state in words, never by colour alone: "Unsaved changes" (with a pencil), "Saving" (a
 * spinner) or "Saved 3 minutes ago" (a check; the exact time is in the tooltip). The relative time
 * is refreshed every 30 seconds. A hidden live region announces only the changes of state (see
 * `announcement`), not the clock.
 *
 *   dirty, saving, updatedAt   the state
 *   announcement               the sentence the polite live region speaks
 */
export default function SaveStatus({ dirty, saving, updatedAt, announcement }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((count) => count + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  let content = null;
  if (saving) {
    content = (
      <>
        <SpinnerGapIcon size={16} weight="bold" aria-hidden="true" data-spin="true" />
        Saving
      </>
    );
  } else if (dirty) {
    content = (
      <>
        <PencilSimpleLineIcon size={16} weight="regular" aria-hidden="true" />
        Unsaved changes
      </>
    );
  } else if (updatedAt) {
    content = (
      <Tip text={formatDateTime(updatedAt)}>
        <span className="rbe-status__inner">
          <CheckCircleIcon size={16} weight="fill" aria-hidden="true" />
          Saved {relativeTime(updatedAt)}
        </span>
      </Tip>
    );
  }

  return (
    <>
      <p className="rbe-status" data-state={saving ? "saving" : dirty ? "dirty" : "saved"}>
        {content}
      </p>
      <span className="ui-sr" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
