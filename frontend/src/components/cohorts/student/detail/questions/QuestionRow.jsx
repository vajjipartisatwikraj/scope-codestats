import React from 'react';
import { Button, formatNumber } from '../../../../ui';
import { ACTION_LABELS, acceptanceRate, difficultyOf, questionStatus } from '../model/questions';

/**
 * One question as a box of its own: the name, a single line of plain text (Medium · Acceptance rate:
 * 90% · Points: 300) and, at the right, one button that opens it. The button is the same one in every
 * state and only its word changes: Solve, Attempted or Solved. The difficulty word is coloured (green,
 * amber, red) but the word is what tells it, and nothing else is a chip.
 *
 * A question opens in a new tab, except during an exam, where it opens in this tab: a new tab would
 * drop fullscreen and be recorded as an exit the student did not choose. The button's name says which.
 * Acceptance rate is left out while nobody has submitted, and points when the question has none.
 *
 *   question    { _id, title, difficultyLevel, marks, stats }
 *   byQuestion  the student's progress by question
 *   sameTab     the question opens in this tab (an exam session)
 *   onOpen      (question) => void
 */
export default function QuestionRow({ question, byQuestion, sameTab, onOpen }) {
  const status = questionStatus(question, byQuestion);
  const difficulty = difficultyOf(question);
  const acceptance = acceptanceRate(question);
  const points = Number(question.marks);
  const label = ACTION_LABELS[status];

  return (
    <li className="cdqi" data-status={status}>
      <div className="cdqi-main">
        <h3 className="cdqi-title">{question.title}</h3>
        <p className="cdqi-meta">
          {difficulty ? (
            <span className="cdqi-difficulty" data-tone={difficulty.tone}>
              {difficulty.label}
            </span>
          ) : null}
          {acceptance !== null ? <span>Acceptance rate: {acceptance}%</span> : null}
          {points > 0 ? <span>Points: {formatNumber(points)}</span> : null}
        </p>
      </div>

      <Button className="cdqi-action" size="sm" data-state={status} onClick={() => onOpen(question)} aria-label={`${label}: ${question.title}${sameTab ? '' : ' (opens in a new tab)'}`}>
        {label}
      </Button>
    </li>
  );
}
