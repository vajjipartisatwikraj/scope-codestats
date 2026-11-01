import React from 'react';
import { formatNumber } from '../../../../ui';
import { ProgressBar } from '../../../../custom-components';
import { DIFFICULTIES, difficultyBreakdown } from '../model/questions';

/**
 * How many questions the student has solved at each difficulty in the open module: one bar for each
 * difficulty the module has questions at. The word (Easy, Medium, Hard) names the bar and the figure
 * is printed, so colour is only a second cue. It counts every question of the module, whatever the
 * filters say. Nothing is shown for a module without questions.
 *
 *   questions    the module's questions
 *   byQuestion   the student's progress by question
 */
export default function DifficultyStats({ questions, byQuestion }) {
  const breakdown = difficultyBreakdown(questions, byQuestion);
  const shown = DIFFICULTIES.filter((difficulty) => breakdown[difficulty.key].total > 0);
  if (shown.length === 0) return null;

  return (
    <div className="cdq-stats" role="group" aria-label="Solved by difficulty">
      {shown.map((difficulty) => {
        const { total, solved } = breakdown[difficulty.key];
        return <ProgressBar key={difficulty.key} size="sm" tone={difficulty.tone} label={difficulty.label} value={(solved / total) * 100} valueLabel={`${formatNumber(solved)} of ${formatNumber(total)}`} />;
      })}
    </div>
  );
}
