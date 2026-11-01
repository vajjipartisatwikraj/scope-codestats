import React from 'react';
import { PillTabs } from '../../../../ui';
import Pane, { FoldButton } from '../shared/Pane';
import ProblemBody from './ProblemBody';
import ProblemHeader from './ProblemHeader';
import './statement.css';

/** The five views of a question; the statement is always on the left, the others open on the right */
export const SECTIONS = [
  { key: 'problem', label: 'Problem' },
  { key: 'editorial', label: 'Editorial' },
  { key: 'submissions', label: 'Submissions' },
  { key: 'report', label: 'Report' },
  { key: 'notes', label: 'Notes' },
];

/**
 * The left pane: the section switcher in its header (with the fold button), then the title, the
 * facts and the statement. Folded, it becomes a 48px strip with only the unfold button.
 *
 *   question, progress, exam, remainingMs   see ProblemHeader
 *   section, onSection    the open section and how to change it
 *   folded, onFold        fold to a strip (omit onFold on a phone)
 *   children              under the statement on a phone, where the other sections replace it
 *   replace               a node shown instead of the statement (a phone showing Editorial, Notes, ...)
 */
export default function DescriptionPane({ question, progress, exam, remainingMs, section, onSection, folded, onFold, replace }) {
  if (folded) {
    return (
      <aside className="ps-strip" aria-label="Problem description, folded">
        <FoldButton folded onToggle={onFold} name="the description" axis="x" />
      </aside>
    );
  }

  return (
    <Pane
      className="ps-description"
      label="Problem description"
      lead={<PillTabs items={SECTIONS} value={section} onChange={onSection} label="Sections of this question" size="sm" />}
      actions={onFold ? <FoldButton folded={false} onToggle={onFold} name="the description" axis="x" /> : null}
    >
      {replace || (
        <>
          <ProblemHeader question={question} progress={progress} exam={exam} remainingMs={remainingMs} />
          <ProblemBody question={question} />
        </>
      )}
    </Pane>
  );
}
