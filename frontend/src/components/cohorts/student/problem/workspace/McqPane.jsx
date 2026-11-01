import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import { Button, Notice } from '../../../../ui';
import Pane from '../shared/Pane';
import './workspace.css';

/**
 * The answer area of a multiple choice question: the options as a radio group, then Submit. Once the
 * answer is sent the right option is marked "Correct answer" and a wrong choice "Your answer", each
 * with an icon and a word as well as a colour. A question already answered correctly is locked.
 *
 *   question   the question (its options)
 *   mcq        the result of useMcq
 */
export default function McqPane({ question, mcq }) {
  const { selected, choose, submit, submitting, answered, correct, locked } = mcq;
  const correctOption = (question.options || []).find((option) => option.isCorrect);

  return (
    <Pane className="ps-mcq" label="Answer" lead={<h2 className="ps-pane__title">{locked ? 'You answered this correctly' : 'Select the correct answer'}</h2>}>
      <fieldset className="ps-options" disabled={answered}>
        <legend className="ui-sr">Options</legend>
        {(question.options || []).map((option) => {
          const chosen = selected === option._id;
          const state = answered && option.isCorrect ? 'correct' : answered && chosen ? 'wrong' : chosen ? 'chosen' : 'idle';
          return (
            <label key={option._id} className="ps-option" data-state={state}>
              <input type="radio" name="mcq-option" value={option._id} checked={chosen} onChange={() => choose(option._id)} />
              <span className="ps-option__mark" aria-hidden="true" />
              <span className="ps-option__text">{option.text}</span>
              {state === 'correct' ? (
                <span className="ps-option__verdict">
                  <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
                  Correct answer
                </span>
              ) : null}
              {state === 'wrong' ? (
                <span className="ps-option__verdict">
                  <XCircleIcon size={18} weight="fill" aria-hidden="true" />
                  Your answer
                </span>
              ) : null}
            </label>
          );
        })}
      </fieldset>

      {answered ? (
        <Notice tone={correct ? 'success' : 'danger'} title={correct ? 'Correct' : 'Incorrect'}>
          {correct ? 'Well done.' : `The correct answer is: ${correctOption?.text}`}
        </Notice>
      ) : null}

      {!locked ? (
        <div className="ps-mcq__actions">
          <Button variant="primary" onClick={submit} loading={submitting} disabled={answered || !selected}>
            {answered ? 'Submitted' : 'Submit answer'}
          </Button>
        </div>
      ) : null}
    </Pane>
  );
}
