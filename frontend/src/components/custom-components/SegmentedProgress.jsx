import React from 'react';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { FlagIcon } from '@phosphor-icons/react/dist/csr/Flag';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/csr/LockSimple';
import './shared.css';
import './SegmentedProgress.css';
import { cx } from './chartUtils';

/**
 * SegmentedProgress: a row of pill segments, one per step of a longer task (the sections of a
 * test, the stages of a form). The state of each segment differs by more than colour:
 *
 *   done      solid green fill (a check in the 'md' size)
 *   current   solid accent fill, a little taller than the rest
 *   todo      an empty track
 *   review    a soft amber fill with an amber outline (a flag in the 'md' size)
 *   later     a dashed outline with no fill (a lock in the 'md' size). Not reachable yet.
 *
 * Every state also has a word in the accessible text, so a screen reader hears "Section 2:
 * current" for each segment, and the row itself says "<label>: <n> of <total> done".
 *
 * Props
 *   segments        [{ key, state, label }]   `label` names the step ("Reading aloud")
 *   label           the name of the whole row ("Test progress")
 *   size ('sm')     'sm' (8px bars) | 'md' (24px pills with an icon inside)
 *   stateLabels     override the spoken words:
 *                   { done: 'Done', current: 'Current', todo: 'Not started', review: 'Marked for review', later: 'Later' }
 *   animate (true)  the segments appear one after another once (never with reduced motion)
 *   className, style   passed to the root element
 *
 * CSS variables: --sp-done --sp-current --sp-track --sp-review --sp-review-soft --sp-later
 */

const DEFAULT_WORDS = {
  done: 'Done',
  current: 'Current',
  todo: 'Not started',
  review: 'Marked for review',
  later: 'Later',
};

const STATES = ['done', 'current', 'todo', 'review', 'later'];

const ICONS = { done: CheckIcon, review: FlagIcon, later: LockSimpleIcon };

export default function SegmentedProgress({
  segments = [],
  label,
  size = 'sm',
  stateLabels,
  animate = true,
  className,
  style,
}) {
  const words = { ...DEFAULT_WORDS, ...stateLabels };
  const list = Array.isArray(segments) ? segments : [];
  const done = list.filter((segment) => segment.state === 'done').length;
  const summary = `${label ? `${label}: ` : ''}${done} of ${list.length} done`;

  return (
    <ol
      className={cx('cc sp', className)}
      style={{ '--n': Math.max(1, list.length), ...style }}
      aria-label={summary}
      data-size={size}
      data-animate={animate ? 'true' : 'false'}
    >
      {list.map((segment, index) => {
        const state = STATES.includes(segment.state) ? segment.state : 'todo';
        const Icon = size === 'md' ? ICONS[state] : null;
        const name = segment.label || `Step ${index + 1}`;
        return (
          <li
            key={segment.key !== undefined ? segment.key : index}
            className="sp__segment"
            data-state={state}
            style={{ '--i': index }}
            title={`${name}: ${words[state]}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {Icon ? <Icon size={14} weight="bold" aria-hidden="true" /> : null}
            <span className="cc-sr-only">{`${name}: ${words[state]}`}</span>
          </li>
        );
      })}
    </ol>
  );
}
