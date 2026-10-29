import React from 'react';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';

/**
 * Stepper (design/screens.md section 10, "a stepper of pills"): the steps of a multi-step flow as a
 * row of pills. Done steps are accent-soft with a check icon, the current step is the spotlight
 * pill, upcoming steps are raised. It is a `nav` holding an ordered list; the current pill carries
 * aria-current="step" and a done pill says "completed" to a screen reader. Below 600px the row
 * collapses to one line, "Step 2 of 4: Details", and the list is not shown.
 *
 *   steps          [{ key, label }] in order
 *   current        the key of the current step
 *   completed      [keys] of the steps that are done (default none)
 *   onStepClick    called with a key. Only steps the student can go back to are buttons: the done
 *                  ones and the ones before the current step. The rest, and the current step, are
 *                  plain pills. Leave it out and every pill is plain.
 *   label          the accessible name of the nav (default "Progress")
 *   className      added to the nav
 *
 * The current pill is a small spotlight element, like the active tab of PillTabs; it does not count
 * as the screen's one spotlight tile.
 */
export function Stepper({ steps, current, completed = [], onStepClick, label = 'Progress', className }) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.key === current));
  const currentStep = steps[currentIndex];

  return (
    <nav className={className ? `ui-stepper ${className}` : 'ui-stepper'} aria-label={label}>
      <ol className="ui-stepper__list">
        {steps.map((step, index) => {
          const isCurrent = step.key === current;
          const isDone = !isCurrent && completed.includes(step.key);
          const state = isCurrent ? 'current' : isDone ? 'done' : 'upcoming';
          const clickable = Boolean(onStepClick) && !isCurrent && (isDone || index < currentIndex);
          const content = (
            <>
              <span className="ui-stepper__mark" aria-hidden="true">
                {isDone ? <CheckIcon size={16} weight="bold" /> : index + 1}
              </span>
              <span className="ui-stepper__label">{step.label}</span>
              {isDone ? <span className="ui-sr">, completed</span> : null}
            </>
          );
          return (
            <li key={step.key} className="ui-stepper__item">
              {clickable ? (
                <button type="button" className="ui-stepper__pill" data-state={state} data-clickable="true" onClick={() => onStepClick(step.key)}>
                  {content}
                </button>
              ) : (
                <span className="ui-stepper__pill" data-state={state} aria-current={isCurrent ? 'step' : undefined}>
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {currentStep ? (
        <p className="ui-stepper__compact" aria-hidden="true">
          Step {currentIndex + 1} of {steps.length}: {currentStep.label}
        </p>
      ) : null}
    </nav>
  );
}

export default Stepper;
