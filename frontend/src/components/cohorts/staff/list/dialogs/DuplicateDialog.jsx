import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { Dialog } from '../../../../ui';
import './dialogs.css';

/**
 * The progress of a duplicate. Nothing can be pressed while it runs. A duplicate is a new draft that
 * uses the same modules and questions as the original, so no content is copied.
 *
 *   progress   null when closed, else { cohort, step }
 */
export default function DuplicateDialog({ progress }) {
  const done = progress?.step === 'Duplicated';
  return (
    <Dialog open={Boolean(progress)} onClose={() => {}} busy size="sm" title="Duplicating cohort" description={progress ? `\u201c${progress.cohort.title}\u201d` : ''}>
      <div className="cmd cmd--center" role="status">
        {done ? <CheckCircleIcon size={40} weight="fill" aria-hidden="true" className="cmd-done" /> : <SpinnerGapIcon size={40} weight="bold" aria-hidden="true" data-spin="true" className="cmd-spin" />}
        <p className="cmd-step">{progress?.step}</p>
        <p className="cmd-note">The new cohort uses the same modules and questions as the original. Nothing is copied, only references.</p>
      </div>
    </Dialog>
  );
}
