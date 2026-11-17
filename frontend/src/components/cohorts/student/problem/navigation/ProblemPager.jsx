import React from 'react';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { isSolvedItem } from '../hooks/useProblemNavigation';
import './navigation.css';

/** With this many questions or fewer every one gets its own box */
const ALL_VISIBLE = 9;

/**
 * Which boxes to draw for `total` questions with `current` open: every number up to ALL_VISIBLE,
 * otherwise the first, the last, the open one with a neighbour on each side, and a gap marker in
 * place of the rest. Near either end five boxes stay together so the ends do not jump around.
 * A gap that hides one question shows that question instead. Returns indexes and 'gap' markers.
 */
export function pagerItems(total, current) {
  if (total <= ALL_VISIBLE) return Array.from({ length: total }, (_, index) => index);
  const keep = new Set([0, total - 1]);
  const at = current < 0 ? 0 : current;
  if (at <= 3) for (let i = 0; i <= 4; i += 1) keep.add(i);
  else if (at >= total - 4) for (let i = total - 5; i < total; i += 1) keep.add(i);
  else [at - 1, at, at + 1].forEach((i) => keep.add(i));

  const sorted = [...keep].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((index, position) => {
    const previous = sorted[position - 1];
    if (position > 0 && index - previous === 2) items.push(previous + 1);
    else if (position > 0 && index - previous > 2) items.push('gap');
    items.push(index);
  });
  return items;
}

/**
 * The questions of the module as a row of numbered square boxes, like a pagination bar, in the middle
 * of the top strip. The open question is the blue box, a solved one carries a check (an icon, not
 * colour alone), and choosing a box opens that question in this tab. A long module shows the first,
 * the last and the ones around the open question, with dots for the rest.
 *
 *   nav   the result of useProblemNavigation
 *   currentId   the open question's id
 */
export default function ProblemPager({ nav, currentId }) {
  const { questions } = nav;
  if (questions.length === 0) return null;
  const current = questions.findIndex((entry) => entry._id === currentId);

  return (
    <nav className="ps-pager" aria-label="Questions in this module">
      <ol className="ps-pager__list">
        {pagerItems(questions.length, current).map((item, position) => {
          if (item === 'gap') {
            return (
              <li key={`gap-${position}`} className="ps-pager__gap" aria-hidden="true">
                &hellip;
              </li>
            );
          }
          const question = questions[item];
          const solved = isSolvedItem(question);
          const open = item === current;
          return (
            <li key={question._id}>
              <button
                type="button"
                className="ps-pager__box"
                data-current={open ? 'true' : 'false'}
                data-solved={solved ? 'true' : 'false'}
                aria-current={open ? 'true' : undefined}
                aria-label={`Question ${item + 1}: ${question.title}${solved ? ', solved' : ''}`}
                title={question.title}
                onClick={() => nav.go(question)}
              >
                {item + 1}
                {solved ? <CheckIcon className="ps-pager__check" size={10} weight="bold" aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
