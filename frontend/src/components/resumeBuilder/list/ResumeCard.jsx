import React from "react";
import { relativeTime } from "../../ui";
import PaperThumbnail from "./PaperThumbnail";

/**
 * One resume in the list, with only what identifies it: a live thumbnail of the paper, the name and
 * when it was last edited. The whole card is a button; pressing it opens the detail panel
 * (ResumeDetails) with the template, the dates and the actions (open the editor, delete).
 *
 *   resume          the saved resume (its saved HTML is the thumbnail)
 *   onOpen          called with the resume
 */
export default function ResumeCard({ resume, onOpen }) {
  return (
    <button type="button" className="ui-card rbl-card" onClick={() => onOpen(resume)} aria-haspopup="dialog">
      <span className="rbl-card__thumb">
        <PaperThumbnail html={resume.html} />
      </span>

      <span className="rbl-card__body">
        <span className="rbl-card__title">{resume.title}</span>
        <span className="rbl-card__edited">Edited {relativeTime(resume.updatedAt)}</span>
      </span>
    </button>
  );
}
