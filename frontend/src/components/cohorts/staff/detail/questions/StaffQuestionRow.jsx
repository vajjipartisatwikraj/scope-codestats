import React from 'react';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { IconButton, formatNumber } from '../../../../ui';
import { difficultyOf } from '../../../student/detail/model/questions';
import { acceptanceOf } from '../model/staffContent';

/**
 * One question for staff, in the student row's shape: the name and one plain line (Medium ·
 * Acceptance rate: 40% · Points: 150), with icon buttons at the right instead of Solve. View opens
 * the teacher's view of the question in a new tab; Edit and Delete are for admins.
 *
 *   question    { _id, title, difficultyLevel, marks, stats }
 *   viewPath    where View goes
 *   canEdit     show Edit and Delete
 *   onEdit(question), onDelete(question)
 */
export default function StaffQuestionRow({ question, viewPath, canEdit, onEdit, onDelete }) {
  const difficulty = difficultyOf(question);
  const acceptance = acceptanceOf(question);
  const points = Number(question.marks) || 10;

  return (
    <li className="cdqi cad-row">
      <div className="cdqi-main">
        <h3 className="cdqi-title">{question.title}</h3>
        <p className="cdqi-meta">
          {difficulty ? (
            <span className="cdqi-difficulty" data-tone={difficulty.tone}>
              {difficulty.label}
            </span>
          ) : null}
          <span>Acceptance rate: {acceptance === null ? '0' : acceptance}%</span>
          <span>Points: {formatNumber(points)}</span>
        </p>
      </div>

      <div className="cad-row__tools">
        <IconButton label={`View ${question.title}`} size="sm" tone="plain" href={viewPath} target="_blank" rel="noopener noreferrer">
          <EyeIcon size={20} weight="regular" aria-hidden="true" />
        </IconButton>
        {canEdit ? (
          <>
            <IconButton label={`Edit ${question.title}`} size="sm" tone="plain" onClick={() => onEdit(question)}>
              <PencilSimpleIcon size={20} weight="regular" aria-hidden="true" />
            </IconButton>
            <IconButton label={`Delete ${question.title}`} size="sm" tone="danger" onClick={() => onDelete(question)}>
              <TrashIcon size={20} weight="regular" aria-hidden="true" />
            </IconButton>
          </>
        ) : null}
      </div>
    </li>
  );
}
