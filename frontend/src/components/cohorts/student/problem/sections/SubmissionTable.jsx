import React from 'react';
import { Avatar, Badge, SortHeader, formatDateTime } from '../../../../ui';
import { formatMemory, formatTime } from '../../../../../utils/formatting';
import { languageName } from '../model/languages';
import { memoryOf, statusOf, timeOf } from '../model/submissions';

/**
 * A table of submissions. Status is a badge with a word; time and memory can be sorted; a row opens
 * the submission (the status button is the keyboard target, the whole row works for a pointer).
 *
 *   rows        the submissions to show
 *   showUser    add the Student column (the list of all students)
 *   mcq         an MCQ question: no language, time or memory
 *   sort        { field, direction } and onSort(field), for the Max time and Max memory columns
 *   onOpen      (submission) => void
 */
export default function SubmissionTable({ rows, showUser = false, mcq = false, sort, onSort, onOpen }) {
  const header = { key: sort.field, dir: sort.direction };
  return (
    <div className="ui-table-wrap">
      <table className="ui-table ps-submissions" data-density="compact">
        <caption className="ui-sr">{showUser ? 'Submissions of all students' : 'Your submissions'}</caption>
        <thead>
          <tr>
            {showUser ? <th scope="col">Student</th> : null}
            <th scope="col">Status</th>
            {mcq ? null : <th scope="col">Language</th>}
            <th scope="col" className="ui-num">
              Score
            </th>
            {mcq ? null : <SortHeader label="Max time" sortKey="time" sort={header} onSort={onSort} align="end" className="ui-num" />}
            {mcq ? null : <SortHeader label="Max memory" sortKey="memory" sort={header} onSort={onSort} align="end" className="ui-num" />}
            <th scope="col">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((submission, index) => {
            const status = statusOf(submission);
            return (
              <tr key={submission._id || index} onClick={() => onOpen(submission)} className="ps-submissions__row">
                {showUser ? (
                  <td>
                    <span className="ui-table__cell-main">
                      <Avatar name={submission.user?.name || 'Unknown'} src={submission.user?.avatar} size={28} />
                      <span className="ui-table__title">{submission.user?.name || 'Unknown'}</span>
                    </span>
                  </td>
                ) : null}
                <td>
                  <button type="button" className="ps-row-open" onClick={(event) => { event.stopPropagation(); onOpen(submission); }} aria-label={`Open the ${status.label.toLowerCase()} submission`}>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </button>
                </td>
                {mcq ? null : <td>{languageName(submission.language)}</td>}
                <td className="ui-num">{submission.score || 0}</td>
                {mcq ? null : <td className="ui-num">{formatTime(timeOf(submission))}</td>}
                {mcq ? null : <td className="ui-num">{formatMemory(memoryOf(submission))}</td>}
                <td>{formatDateTime(submission.submittedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
