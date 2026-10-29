import React from "react";
import { TimerIcon } from "@phosphor-icons/react/dist/csr/Timer";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { Avatar, Badge, IconButton } from "../../ui";
import { formatClock, formatScore } from "../shared";

/**
 * Small pieces a result row is made of, shared by the table and the phone list.
 */

/** The rank: the first three are numerals in tonal circles (no medals), the rest plain numerals. */
export function RankMark({ rank }) {
  const place = typeof rank === "number" && rank >= 1 && rank <= 3 ? rank : 0;
  return (
    <span className="sxl-rank" data-place={place || undefined}>
      <span className="ui-sr">Rank </span>
      {typeof rank === "number" ? rank : "\u2013"}
    </span>
  );
}

/** Picture, name and the badges that go with it ("You", and for staff "In progress"). */
export function StudentCell({ entry, mine, isAdmin, size = 40, meta }) {
  const inProgress = entry.status !== "completed";
  return (
    <div className="sxl-student">
      <Avatar name={entry.user.name} src={entry.user.profilePicture} size={size} />
      <div className="sxl-student__text">
        <span className="sxl-student__name">
          <span className="sxl-student__name-text">{entry.user.name || "Anonymous"}</span>
          {mine ? <Badge tone="info">You</Badge> : null}
          {isAdmin && inProgress ? (
            <Badge tone="warning" icon={<TimerIcon size={14} weight="bold" aria-hidden="true" />}>
              In progress
            </Badge>
          ) : null}
        </span>
        {meta ? <span className="sxl-student__meta">{meta}</span> : null}
      </div>
    </div>
  );
}

/** The final score, or a dash with a word while the attempt is not finished. */
export function ScoreText({ entry }) {
  const inProgress = entry.status !== "completed";
  if (inProgress) {
    return (
      <>
        <span aria-hidden="true">{"\u2013"}</span>
        <span className="ui-sr">Not finished</span>
      </>
    );
  }
  return formatScore(entry.finalScore);
}

/** Total time in sections as m:ss, or a dash. */
export const timeText = (entry) => (entry.totalTimeUsedSeconds ? formatClock(entry.totalTimeUsedSeconds) : "\u2013");

/** Staff only: removes the submission so the student can retake the test. */
export function DeleteButton({ entry, onDelete }) {
  return (
    <IconButton tone="danger" size="sm" label={`Delete submission of ${entry.user.name || "this student"}`} onClick={() => onDelete(entry)}>
      <TrashIcon size={20} aria-hidden="true" />
    </IconButton>
  );
}
