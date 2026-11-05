import React from 'react';
import { Button, Notice, formatNumber } from '../../ui';
import { jobSummary, needsAttention, processedOf } from '../model/bankLibrary';

/**
 * ImportBanner: the strip at the top of the staff cohort page for an import that is running or that
 * stopped before it was finished. A finished import shows nothing here (the page reloads its modules
 * and a toast says how it went).
 *
 *   job         the cohort's latest import (useCohortImports), or null
 *   dismissed   the id and status the person has already dismissed
 *   onView()    opens the import drawer on the progress
 *   onRetry()   retries an import that stopped
 *   onDismiss(job)
 *   className   added to the strip (the page gives it the spacing it needs)
 */
export default function ImportBanner({ job, dismissed, onView, onRetry, onDismiss, className }) {
  if (!job) return null;
  if (!job.active && !needsAttention(job)) return null;
  if (dismissed === `${job.id}:${job.status}`) return null;

  if (job.active) {
    const processed = processedOf(job.progress);
    return (
      <Notice
        className={className}
        tone="info"
        title={`Importing ${job.bankName}`}
        action={
          <Button variant="ghost" size="sm" onClick={onView}>
            View progress
          </Button>
        }
      >
        {formatNumber(processed)} of {formatNumber(job.progress.total)} questions ({job.progress.percent}%). You can keep working; it carries on in the background.
      </Notice>
    );
  }

  const partial = job.status === 'partial';
  return (
    <Notice
      className={className}
      tone="warning"
      title={partial ? `Imported ${job.bankName} with problems` : `The import of ${job.bankName} stopped`}
      action={
        <>
          {partial ? null : (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onView}>
            Details
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDismiss(job)}>
            Dismiss
          </Button>
        </>
      }
    >
      {jobSummary(job)}.{partial ? '' : ' Retry carries on where it stopped.'}
    </Notice>
  );
}
