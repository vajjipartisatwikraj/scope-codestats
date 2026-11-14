import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, Dialog, EmptyState, SearchField, formatNumber, pluralize } from "../../ui";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { mentorsText } from "./progressModel";

const SHOWN = 200;

const STATUS = {
  completed: { label: "Finished", tone: "success" },
  in_progress: { label: "In progress", tone: "warning" },
  not_started: { label: "Not started", tone: "neutral" },
};

const lower = (value) => String(value || "").toLowerCase();
const blank = <span className="sxp-none">&ndash;</span>;

/** The student: picture, name and, under it, their mentor */
const StudentCell = ({ row }) => (
  <div className="sxp-student">
    <Avatar name={row.name} size={36} />
    <span className="sxp-student__text">
      <span className="sxp-student__name">{row.name}</span>
      {row.mentors.length > 0 ? <span className="sxp-student__meta">Mentor: {mentorsText(row.mentors)}</span> : null}
    </span>
  </div>
);

/**
 * The students behind a tile of the progress page, in a dialog, as a table: name (with their mentor
 * under it), roll number, class (the department), section, year and mobile number. A Status column
 * is added when the list mixes states (All students) and a Score column when anyone has a score.
 * A search narrows the list; a very long list shows its first 200 until the search narrows it. On a
 * phone each student is a row of a list with the same facts.
 *
 *   list     { title, description, rows } from listsOf(), or null while the dialog is closed
 *   onClose()
 */
const StudentsDialog = ({ list, onClose }) => {
  const [query, setQuery] = useState("");
  const wide = useMediaQuery("(min-width: 700px)");

  useEffect(() => {
    setQuery("");
  }, [list]);

  const term = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!list) return [];
    if (!term) return list.rows;
    return list.rows.filter((row) => [row.name, row.rollNumber, row.email, row.department, row.section, row.mobile, mentorsText(row.mentors)].some((value) => lower(value).includes(term)));
  }, [list, term]);

  const rows = matches.slice(0, SHOWN);
  const showStatus = Boolean(list) && new Set(list.rows.map((row) => row.status)).size > 1;
  const showScore = Boolean(list) && list.rows.some((row) => row.score !== null);

  let content;
  if (matches.length === 0) {
    content = <EmptyState compact title="No students match" text={`Nobody here matches \u201c${query.trim()}\u201d.`} />;
  } else if (wide) {
    content = (
      <div className="ui-table-wrap">
        <table className="ui-band-table sxp-table">
          <caption className="ui-sr">{list.title}</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Roll no</th>
              <th scope="col">Class</th>
              <th scope="col">Sec</th>
              <th scope="col">Year</th>
              <th scope="col">Mobile number</th>
              {showStatus ? <th scope="col">Status</th> : null}
              {showScore ? (
                <th scope="col" className="ui-num">
                  Score
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <StudentCell row={row} />
                </td>
                <td className="sxp-num">{row.rollNumber || blank}</td>
                <td>{row.department ? <Badge>{row.department}</Badge> : blank}</td>
                <td>{row.section || blank}</td>
                <td className="sxp-num">{row.year || blank}</td>
                <td className="sxp-num">{row.mobile || blank}</td>
                {showStatus ? (
                  <td>
                    <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
                  </td>
                ) : null}
                {showScore ? <td className="ui-num">{row.score === null ? blank : row.score}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    content = (
      <ul className="sxp-people" aria-label={list.title}>
        {rows.map((row) => (
          <li key={row.id} className="sxp-person">
            <Avatar name={row.name} size={40} />
            <span className="sxp-person__text">
              <span className="sxp-person__name">{row.name}</span>
              <span className="sxp-person__meta">{[row.rollNumber, row.department, row.section ? `Sec ${row.section}` : null, row.year].filter(Boolean).join(" \u00b7 ")}</span>
              {row.mobile ? <span className="sxp-person__meta">{row.mobile}</span> : null}
              {row.mentors.length > 0 ? <span className="sxp-person__meta">Mentor: {mentorsText(row.mentors)}</span> : null}
            </span>
            <span className="sxp-person__end">
              {showStatus ? <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge> : null}
              {row.score !== null ? <span className="sxp-person__score">{row.score}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Dialog
      open={Boolean(list)}
      onClose={onClose}
      size="xl"
      title={list ? `${list.title} \u00b7 ${formatNumber(list.rows.length)}` : "Students"}
      description={list?.description}
      actions={<Button onClick={onClose}>Close</Button>}
    >
      {list && list.rows.length > 0 ? (
        <div className="sxp-dialog-body">
          <SearchField value={query} onChange={setQuery} placeholder="Search name, roll number, mobile or mentor" label="Search these students" />
          {content}
          {matches.length > SHOWN ? <p className="sxp-more">Showing the first {SHOWN} of {pluralize(matches.length, "student")}. Search to narrow the list.</p> : null}
        </div>
      ) : (
        <EmptyState compact title="Nobody here" text="No students are on this list." />
      )}
    </Dialog>
  );
};

export default StudentsDialog;
