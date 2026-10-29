import React, { useState } from 'react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Badge, IconButton, Tip, formatNumber } from '../ui';
import { categoryLabel, levelLabel } from './courseModel';

/**
 * The courses as a table (900px and wider) or as a list of rows (phones).
 *
 * Props
 *   courses             the courses of this page
 *   mobile              true below 900px: render rows instead of the table
 *   sort, onSort(key)   { key, dir } and the click handler of the sortable headers
 *   onOpen(course)      a row or its title was pressed: open the drawer
 *   onDelete(course)    the delete button of a row
 */

const LEVEL_TONE = { Beginner: 'success', Intermediate: 'info', Advanced: 'warning', 'All Levels': 'neutral' };

export function LevelBadge({ level }) {
  return <Badge tone={LEVEL_TONE[level] || 'neutral'}>{levelLabel(level)}</Badge>;
}

/** The course picture, or a tonal mark when there is none (or it will not load) */
function Thumb({ src }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="cm-thumb" aria-hidden="true">
      {src && !failed ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <GraduationCapIcon size={20} weight="regular" />}
    </span>
  );
}

/** The second line under a title: who teaches it, what it is about and how long it takes */
const metaOf = (course) => [course.instructor, categoryLabel(course.category), course.duration].filter(Boolean).join(' \u00b7 ');

function SortHeader({ label, sortKey, sort, onSort, align }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" data-sortable="true" aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="ui-table__sort" data-align={align} onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span aria-hidden="true" className="cm-sort-icon">
          {active ? sort.dir === 'desc' ? <CaretDownIcon size={12} weight="fill" /> : <CaretUpIcon size={12} weight="fill" /> : <CaretDownIcon size={12} weight="bold" />}
        </span>
      </button>
    </th>
  );
}

function CourseName({ course, onOpen }) {
  return (
    <span className="cm-name">
      <button type="button" className="cm-open" onClick={(event) => { event.stopPropagation(); onOpen(course); }}>
        {course.title}
      </button>
      {course.isActive === false ? <Badge tone="warning">Inactive</Badge> : null}
    </span>
  );
}

function ExternalLink({ course }) {
  if (!course.courseLink) return null;
  return (
    <Tip text="Open the course">
      <a
        className="ui-icon-button cm-external"
        data-size="sm"
        data-tone="plain"
        href={course.courseLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${course.title} in a new tab`}
        onClick={(event) => event.stopPropagation()}
      >
        <ArrowSquareOutIcon size={20} weight="regular" aria-hidden="true" />
      </a>
    </Tip>
  );
}

export default function CourseTable({ courses, mobile, sort, onSort, onOpen, onDelete }) {
  if (mobile) {
    return (
      <ul className="ui-list">
        {courses.map((course) => (
          <li key={course._id} className="ui-list__row" data-clickable="true" onClick={() => onOpen(course)}>
            <div className="ui-table__cell-main">
              <Thumb src={course.image} />
              <div className="ui-table__cell-text">
                <CourseName course={course} onOpen={onOpen} />
                <span className="ui-table__meta">{metaOf(course)}</span>
              </div>
            </div>
            <div className="cm-row-end">
              <LevelBadge level={course.level} />
              <span className="ui-table__meta">{formatNumber(course.students || 0)} students</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table cm-table" data-density="compact">
        <caption className="ui-sr">Courses. Select a course name to edit it.</caption>
        <thead>
          <tr>
            <SortHeader label="Course" sortKey="title" sort={sort} onSort={onSort} />
            <SortHeader label="Level" sortKey="level" sort={sort} onSort={onSort} />
            <th scope="col">Duration</th>
            <SortHeader label="Students" sortKey="students" sort={sort} onSort={onSort} align="end" />
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course._id} className="cm-row" onClick={() => onOpen(course)}>
              <td className="cm-cell-course">
                <div className="ui-table__cell-main">
                  <Thumb src={course.image} />
                  <div className="ui-table__cell-text">
                    <CourseName course={course} onOpen={onOpen} />
                    <span className="ui-table__meta">{[course.instructor, categoryLabel(course.category)].filter(Boolean).join(' \u00b7 ')}</span>
                  </div>
                </div>
              </td>
              <td>
                <LevelBadge level={course.level} />
              </td>
              <td className="ui-muted">{course.duration || '\u2013'}</td>
              <td className="ui-num">{formatNumber(course.students || 0)}</td>
              <td onClick={(event) => event.stopPropagation()}>
                <div className="ui-table__actions">
                  <ExternalLink course={course} />
                  <IconButton label={`Edit ${course.title}`} size="sm" tone="plain" onClick={() => onOpen(course)}>
                    <PencilSimpleIcon size={20} weight="regular" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${course.title}`} size="sm" tone="danger" onClick={() => onDelete(course)}>
                    <TrashIcon size={20} weight="regular" aria-hidden="true" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
