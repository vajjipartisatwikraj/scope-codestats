import React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CloudArrowUpIcon } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { CloudSlashIcon } from "@phosphor-icons/react/dist/csr/CloudSlash";
import "./answers.css";

const META = {
  saved: { label: "Answer saved", Icon: CheckCircleIcon, tone: "saved" },
  error: { label: "Not saved yet. Retrying…", Icon: CloudSlashIcon, tone: "error" },
};
const SAVING = { label: "Saving…", Icon: CloudArrowUpIcon, tone: "saving" };

/**
 * A small line under an answer saying whether it has reached the server: an icon and a word
 * (Answer saved / Saving… / Not saved yet), in a polite live region. It keeps its height while
 * hidden (no answer yet), so the page does not jump when the first save appears.
 */
const SaveStatusLine = ({ status, visible }) => {
  const { label, Icon, tone } = META[status] || SAVING;
  const shown = Boolean(visible && status);

  return (
    <p className="sxr-save" data-tone={tone} data-shown={shown ? "true" : "false"} aria-live="polite">
      {shown ? (
        <>
          <Icon size={16} weight={tone === "saved" ? "fill" : "regular"} aria-hidden="true" />
          <span>{label}</span>
        </>
      ) : null}
    </p>
  );
};

export default SaveStatusLine;
