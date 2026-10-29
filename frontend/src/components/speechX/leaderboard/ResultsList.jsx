import React from "react";
import { formatScore, typeLabel } from "../shared";
import { DeleteButton, RankMark, ScoreText, StudentCell, timeText } from "./Cells";
import { sectionScoreOf } from "./resultsModel";

/**
 * The results as a list (below 900px): each student is one row with the rank, picture and name, the
 * final score and the time, and under it the score of every section. Staff get a delete button.
 *
 * Props: rows, sections, isAdmin, currentUserId, onDelete, refreshing
 */
export default function ResultsList({ rows, sections, isAdmin, currentUserId, onDelete, refreshing }) {
  return (
    <ul className="ui-list sxl-list" data-refreshing={refreshing ? "true" : "false"}>
      {rows.map((entry) => {
        const mine = Boolean(currentUserId) && entry.user._id === currentUserId;
        const meta = [entry.user.rollNumber ? entry.user.rollNumber.toUpperCase() : null, entry.user.department, entry.user.section ? `Section ${entry.user.section}` : null, entry.user.graduatingYear]
          .filter(Boolean)
          .join(" \u00b7 ");
        return (
          <li key={entry.user._id} className="sxl-item" data-own={mine ? "true" : "false"}>
            <div className="sxl-item__head">
              <RankMark rank={entry.rank} />
              <StudentCell entry={entry} mine={mine} isAdmin={isAdmin} meta={meta || undefined} />
              <div className="sxl-item__figures">
                <p className="sxl-item__score">
                  <span className="ui-sr">Score </span>
                  <ScoreText entry={entry} />
                </p>
                <p className="sxl-item__time">
                  <span className="ui-sr">Time </span>
                  {timeText(entry)}
                </p>
              </div>
              {isAdmin ? <DeleteButton entry={entry} onDelete={onDelete} /> : null}
            </div>

            {sections.length > 0 ? (
              <dl className="sxl-item__sections">
                {sections.map((section, index) => (
                  <div key={section._id} title={typeLabel(section.type)}>
                    <dt>{section.title}</dt>
                    <dd>{formatScore(sectionScoreOf(entry, section, index))}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
