import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise';
import { Badge, formatNumber } from '../../../../ui';
import ExamTimer from '../shared/ExamTimer';

const DIFFICULTY = {
  easy: { label: 'Easy', tone: 'success' },
  medium: { label: 'Medium', tone: 'warning' },
  hard: { label: 'Hard', tone: 'danger' },
};

/**
 * The top of the statement: the title, where the student stands (Solved or Attempted, as a badge
 * with an icon), the exam clock when there is one, and one line of plain facts: Medium · Accuracy:
 * 40% · Submissions: 12 · Points: 150. A figure the server did not send is left out.
 *
 *   question    { title, difficultyLevel, marks, stats }
 *   progress    'solved' | 'attempted' | null
 *   exam, remainingMs   the exam window and the time left, or null to leave the clock out
 */
export default function ProblemHeader({ question, progress, exam, remainingMs }) {
  const difficulty = DIFFICULTY[question.difficultyLevel];
  const accuracy = question.stats && typeof question.stats.acceptanceRate === 'number' ? Math.round(question.stats.acceptanceRate) : null;
  const submissions = question.stats && typeof question.stats.totalSubmissions === 'number' ? question.stats.totalSubmissions : null;
  const points = typeof question.marks === 'number' ? question.marks : null;

  return (
    <header className="ps-problem-header">
      <div className="ps-problem-header__row">
        <h1 className="ps-problem-header__title">{question.title}</h1>
        <div className="ps-problem-header__badges">
          <ExamTimer exam={exam} remainingMs={remainingMs} />
          {progress === 'solved' ? (
            <Badge tone="success" icon={<CheckCircleIcon size={14} weight="fill" aria-hidden="true" />}>
              Solved
            </Badge>
          ) : null}
          {progress === 'attempted' ? (
            <Badge tone="warning" icon={<ClockCounterClockwiseIcon size={14} weight="regular" aria-hidden="true" />}>
              Attempted
            </Badge>
          ) : null}
        </div>
      </div>
      <p className="ps-meta">
        {difficulty ? (
          <span className="ps-meta__difficulty" data-tone={difficulty.tone}>
            {difficulty.label}
          </span>
        ) : null}
        {accuracy !== null ? <span>Accuracy: <strong>{accuracy}%</strong></span> : null}
        {submissions !== null ? <span>Submissions: <strong>{formatNumber(submissions)}</strong></span> : null}
        {points !== null ? <span>Points: <strong>{formatNumber(points)}</strong></span> : null}
      </p>
    </header>
  );
}
