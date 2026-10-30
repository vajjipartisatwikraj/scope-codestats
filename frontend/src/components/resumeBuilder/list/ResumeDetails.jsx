import React from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { Button, DetailPanel, formatDateTime } from "../../ui";
import PaperThumbnail from "./PaperThumbnail";
import { editorPath } from "./openEditor";

/**
 * The detail panel of a resume (the app's DetailPanel from ../../ui): a larger preview of the first
 * page, the template, when it was created and last edited, and the two actions: open the
 * editor (in a new tab, as always) and delete.
 *
 *   resume       the selected one, or null while the panel is closed
 *   template     its template (name and category) from the catalogue, when it is still offered
 *   onClose
 *   onDelete     asks to delete this resume (the page confirms)
 */
export default function ResumeDetails({ resume, template, onClose, onDelete }) {
  return (
    <DetailPanel
      open={Boolean(resume)}
      onClose={onClose}
      title={resume?.title}
      media={
        resume ? (
          <div className="rbl-detail__preview">
            <PaperThumbnail html={resume.html} />
          </div>
        ) : null
      }
      facts={
        resume
          ? [
              { label: "Template", value: template?.name || resume.templateName || resume.template },
              { label: "Last edited", value: resume.updatedAt ? formatDateTime(resume.updatedAt) : null },
              { label: "Created", value: resume.createdAt ? formatDateTime(resume.createdAt) : null },
            ]
          : []
      }
      footer={
        resume ? (
          <>
            <Button variant="danger" startIcon={<TrashIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => onDelete(resume)}>
              Delete
            </Button>
            <Button
              as="a"
              variant="primary"
              href={editorPath(resume._id)}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<ArrowSquareOutIcon size={18} weight="regular" aria-hidden="true" />}
            >
              Open editor<span className="ui-sr"> for {resume.title}, opens in a new tab</span>
            </Button>
          </>
        ) : null
      }
    />
  );
}
