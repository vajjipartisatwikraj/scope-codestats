import React, { useEffect, useRef } from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CircleIcon } from '@phosphor-icons/react/dist/csr/Circle';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { IconButton, pluralize } from '../../../../ui';
import useDismiss from '../../../../Navbar/useDismiss';
import { isSolvedItem } from '../hooks/useProblemNavigation';
import './navigation.css';

const DIFFICULTIES = {
  easy: { label: 'Easy', tone: 'success' },
  medium: { label: 'Medium', tone: 'warning' },
  hard: { label: 'Hard', tone: 'danger' },
};

/**
 * The problem list: a panel that slides out beside the rail, always on the platform blue in both
 * themes, with every question of the module, the open one marked, a check on the solved ones (an icon
 * and a word, not colour alone), the difficulty and the points. A press outside or Escape closes it, and choosing a question closes it and opens
 * that question in this tab.
 *
 *   open, onClose   whether it is shown, and how to close it
 *   nav             the result of useProblemNavigation
 *   currentId       the open question's id
 */
export default function ProblemList({ open, onClose, nav, currentId }) {
  const rootRef = useRef(null);
  const closeRef = useRef(null);
  useDismiss(rootRef, open, onClose);

  // Opening moves focus into the panel
  useEffect(() => {
    if (open && closeRef.current) closeRef.current.focus();
  }, [open]);

  const choose = (question) => {
    onClose();
    nav.go(question);
  };

  return (
    <aside ref={rootRef} className="ps-list" data-open={open ? 'true' : 'false'} aria-label="Problem list" aria-hidden={!open}>
      <header className="ps-list__head">
        <div>
          <h2 className="ps-list__title">Problem list</h2>
          <p className="ps-list__count">{pluralize(nav.questions.length, 'problem')} in this module</p>
        </div>
        {/* Daylight palette: a white button with a dark icon on the blue, in both themes */}
        <span data-theme="daylight">
          <IconButton ref={closeRef} label="Close the problem list" size="sm" onClick={onClose} tabIndex={open ? 0 : -1}>
            <XIcon size={20} weight="regular" aria-hidden="true" />
          </IconButton>
        </span>
      </header>

      <div className="ps-list__body">
        {nav.questions.length === 0 ? (
          <p className="ps-list__empty" role="status">{nav.loading ? 'Loading the problems' : 'This module has no questions.'}</p>
        ) : (
          <ol className="ps-list__items">
            {nav.questions.map((question, index) => {
              const solved = isSolvedItem(question);
              const current = question._id === currentId;
              const difficulty = DIFFICULTIES[(question.difficultyLevel || question.difficulty || '').toLowerCase()];
              return (
                <li key={question._id}>
                  <button type="button" className="ps-list__item" data-current={current ? 'true' : 'false'} aria-current={current ? 'true' : undefined} onClick={() => choose(question)} tabIndex={open ? 0 : -1}>
                    <span className="ps-list__mark" data-solved={solved ? 'true' : 'false'}>
                      {solved ? <CheckCircleIcon size={22} weight="fill" aria-hidden="true" /> : <CircleIcon size={22} weight="regular" aria-hidden="true" />}
                      <span className="ui-sr">{solved ? 'Solved' : 'Not solved'}</span>
                    </span>
                    <span className="ps-list__text">
                      <span className="ps-list__name">
                        {index + 1}. {question.title}
                      </span>
                      <span className="ps-list__meta">
                        {difficulty ? <span>{difficulty.label}</span> : null}
                        {question.marks !== undefined ? <span>{question.marks} points</span> : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
