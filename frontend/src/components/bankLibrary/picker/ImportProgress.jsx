import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { Badge, Notice, formatNumber } from '../../ui';
import { ProgressBar } from '../../custom-components';
import { countOf, jobStatusInfo, processedOf, stepStatusInfo } from '../model/bankLibrary';
import './picker.css';

const JOB_ICON = {
  queued: null,
  running: <SpinnerGapIcon size={14} weight="bold" aria-hidden="true" data-spin="true" />,
  done: <CheckCircleIcon size={14} weight="fill" aria-hidden="true" />,
  partial: <WarningCircleIcon size={14} weight="fill" aria-hidden="true" />,
  failed: <WarningCircleIcon size={14} weight="fill" aria-hidden="true" />,
  interrupted: <WarningCircleIcon size={14} weight="fill" aria-hidden="true" />,
  cancelled: null,
};

const BAR_TONE = { done: 'success', partial: 'warning', failed: 'danger', interrupted: 'warning', cancelled: 'neutral' };
const FAILURES_SHOWN = 3;

/** What one step (a topic going into a module) did: its numbers, and why any question failed */
function StepRow({ step }) {
  const info = stepStatusInfo(step.status);
  const parts = [`${formatNumber(step.imported)} of ${formatNumber(step.total)} imported`];
  if (step.skipped > 0) parts.push(`${formatNumber(step.skipped)} already there`);
  if (step.failed > 0) parts.push(`${formatNumber(step.failed)} failed`);

  return (
    <li className="blp-step-row">
      <div className="blp-step-row__main">
        <span className="blp-step-row__name">{step.topicName}</span>
        <Badge tone={info.tone}>{info.label}</Badge>
      </div>
      <p className="blp-step-row__meta">{step.status === 'skipped' ? 'This topic has no questions, so no module is made.' : parts.join(' \u00b7 ')}</p>
      {step.error ? <p className="blp-step-row__meta">{step.error}</p> : null}
      {step.failures.length > 0 ? (
        <ul className="blp-failures" aria-label={`Questions of ${step.topicName} that could not be imported`}>
          {step.failures.slice(0, FAILURES_SHOWN).map((failure) => (
            <li key={failure.questionId}>
              {failure.title || failure.questionId}: {failure.reason}
            </li>
          ))}
          {step.failed > FAILURES_SHOWN ? <li>and {formatNumber(step.failed - FAILURES_SHOWN)} more</li> : null}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * ImportProgress: how an import is going, from the job the server keeps (the page asks for it again
 * every couple of seconds while it runs). The bar, the three numbers, then one row per topic.
 *
 *   job   the import as the API describes it
 */
export default function ImportProgress({ job }) {
  const info = jobStatusInfo(job.status);
  const total = job.progress.total;
  const processed = processedOf(job.progress);

  return (
    <div className="blp-progress">
      <div className="blp-progress__head">
        <Badge tone={info.tone} icon={JOB_ICON[job.status] || undefined}>
          {info.label}
        </Badge>
        <p className="blp-progress__bank">{job.bankName}</p>
      </div>

      <ProgressBar
        value={processed}
        max={total || 1}
        label="Questions processed"
        valueLabel={`${formatNumber(processed)} of ${formatNumber(total)}`}
        tone={BAR_TONE[job.status] || 'accent'}
      />

      <dl className="blp-counts">
        <div className="blp-count">
          <dt>Imported</dt>
          <dd>{formatNumber(job.progress.imported)}</dd>
        </div>
        <div className="blp-count">
          <dt>Already there</dt>
          <dd>{formatNumber(job.progress.skipped)}</dd>
        </div>
        <div className="blp-count">
          <dt>Could not import</dt>
          <dd>{formatNumber(job.progress.failed)}</dd>
        </div>
      </dl>

      {job.error ? (
        <Notice tone="danger" title="The import stopped">
          {job.error}
        </Notice>
      ) : null}
      {job.status === 'partial' ? (
        <Notice tone="warning" title="Some questions could not be imported">
          {countOf(job.progress.failed, 'question')} below did not come in. Everything else did. Fix the question in the bank library and import it again, or add it by hand.
        </Notice>
      ) : null}
      {job.status === 'cancelled' ? (
        <Notice tone="info">The import was cancelled. What came in before is kept. Retry to carry on where it stopped.</Notice>
      ) : null}

      <ul className="blp-steps" aria-label="Topics">
        {job.steps.map((step) => (
          <StepRow key={step.topicId} step={step} />
        ))}
      </ul>
    </div>
  );
}
