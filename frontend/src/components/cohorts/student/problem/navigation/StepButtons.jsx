import React from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { IconButton } from '../../../../ui';

/**
 * Previous and next question, as two icon buttons. A phone has no rail, so they sit beside the tabs
 * of the question.
 *
 *   nav   the result of useProblemNavigation
 */
export default function StepButtons({ nav }) {
  return (
    <div className="ps-steps">
      <IconButton label="Previous question" onClick={nav.goPrevious} disabled={!nav.hasPrevious}>
        <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
      </IconButton>
      <IconButton label="Next question" onClick={nav.goNext} disabled={!nav.hasNext}>
        <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
