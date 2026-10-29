import React, { useEffect, useRef, useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { SortHeader } from "../../ui";
import { formatScore, typeLabel } from "../shared";
import { DeleteButton, RankMark, ScoreText, StudentCell, timeText } from "./Cells";
import { sectionScoreOf } from "./resultsModel";

/**
 * The results as a real table (900px and wider): rank, student, roll number, department, section,
 * year, one column per section of the test, time and score. Rank and student stay in view while
 * the table scrolls sideways, which it does whenever the sections do not fit. Every header is a
 * sortable button (ui SortHeader); the sorted one carries aria-sort. The signed-in student's row
 * is marked "You". Staff get a delete button on each row.
 *
 * Props: rows (this page), sections (meta.sections), sort, onSort, isAdmin, currentUserId, onDelete, refreshing
 */
export default function ResultsTable({ rows, sections, sort, onSort, isAdmin, currentUserId, onDelete, refreshing }) {
  const scroller = useRef(null);
  const [more, setMore] = useState(false);

  // A hint that there is more to the right, while there is
  useEffect(() => {
    const node = scroller.current;
    if (!node) return undefined;
    const update = () => setMore(node.scrollWidth - node.clientWidth - node.scrollLeft > 4);
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (observer) observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      if (observer) observer.disconnect();
    };
  }, [rows.length, sections.length]);

  return (
    <div className="sxl-table" data-refreshing={refreshing ? "true" : "false"}>
      <div className="ui-table-wrap" ref={scroller} role="region" aria-label="Results table, scrolls sideways" tabIndex={0}>
        <table className="ui-table sxl-table__grid">
          <caption className="ui-sr">
            Test results. Sorted by {sort.key.startsWith("section:") ? "a section" : sort.key}, {sort.dir === "asc" ? "lowest" : "highest"} first.
          </caption>
          <thead>
            <tr>
              <SortHeader label="Rank" sortKey="rank" sort={sort} onSort={onSort} className="sxl-sticky sxl-c-rank" />
              <SortHeader label="Student" sortKey="name" sort={sort} onSort={onSort} className="sxl-sticky sxl-c-student" />
              <SortHeader label="Roll no" sortKey="roll" sort={sort} onSort={onSort} />
              <SortHeader label="Dept" sortKey="department" sort={sort} onSort={onSort} />
              <SortHeader label="Section" sortKey="section" sort={sort} onSort={onSort} />
              <SortHeader label="Year" sortKey="year" sort={sort} onSort={onSort} />
              {sections.map((section) => (
                <SortHeader key={section._id} label={section.title} sortKey={`section:${section._id}`} sort={sort} onSort={onSort} align="end" />
              ))}
              <SortHeader label="Time" sortKey="time" sort={sort} onSort={onSort} align="end" />
              <SortHeader label="Score" sortKey="score" sort={sort} onSort={onSort} align="end" />
              {isAdmin ? (
                <th scope="col">
                  <span className="ui-sr">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const mine = Boolean(currentUserId) && entry.user._id === currentUserId;
              return (
                <tr key={entry.user._id} data-selected={mine ? "true" : undefined}>
                  <td className="sxl-sticky sxl-c-rank">
                    <RankMark rank={entry.rank} />
                  </td>
                  <td className="sxl-sticky sxl-c-student">
                    <StudentCell entry={entry} mine={mine} isAdmin={isAdmin} />
                  </td>
                  <td className="sxl-nowrap">{entry.user.rollNumber ? entry.user.rollNumber.toUpperCase() : "\u2013"}</td>
                  <td className="sxl-nowrap">{entry.user.department || "\u2013"}</td>
                  <td className="sxl-nowrap">{entry.user.section || "\u2013"}</td>
                  <td className="sxl-nowrap">{entry.user.graduatingYear || "\u2013"}</td>
                  {sections.map((section, index) => (
                    <td key={section._id} className="ui-num sxl-num" title={typeLabel(section.type)}>
                      {formatScore(sectionScoreOf(entry, section, index))}
                    </td>
                  ))}
                  <td className="ui-num sxl-num">{timeText(entry)}</td>
                  <td className="ui-num sxl-num sxl-num--strong">
                    <ScoreText entry={entry} />
                  </td>
                  {isAdmin ? (
                    <td>
                      <div className="ui-table__actions">
                        <DeleteButton entry={entry} onDelete={onDelete} />
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {more ? (
        <p className="sxl-table__hint">
          Scroll sideways for the sections <CaretRightIcon size={12} weight="bold" aria-hidden="true" />
        </p>
      ) : null}
    </div>
  );
}
