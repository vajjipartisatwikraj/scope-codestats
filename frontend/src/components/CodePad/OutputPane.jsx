import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { TerminalWindowIcon } from '@phosphor-icons/react/dist/csr/TerminalWindow';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import Tip from './Tip';

/**
 * Verdicts (design/screens.md section 9): a badge with an icon AND a word, never colour alone.
 */
const VERDICTS = {
  running: { tone: 'info', label: 'Running', Icon: SpinnerGapIcon, spin: true },
  success: { tone: 'success', label: 'Ran successfully', Icon: CheckCircleIcon },
  compile: { tone: 'danger', label: 'Compile error', Icon: XCircleIcon },
  runtime: { tone: 'warning', label: 'Runtime error', Icon: WarningIcon },
};

export function Verdict({ status }) {
  const verdict = VERDICTS[status];
  if (!verdict) return null;
  const { Icon } = verdict;
  return (
    <span className="cp-badge" data-tone={verdict.tone}>
      <Icon size={14} weight="fill" aria-hidden="true" data-spin={verdict.spin ? 'true' : undefined} />
      {verdict.label}
    </span>
  );
}

/**
 * The output pane: what the program printed, and the state of the run.
 *
 *   status        'idle' | 'running' | 'success' | 'compile' | 'runtime'
 *   output        the text to show
 *   notice        a sentence about the page itself (shown apart from the program's output)
 *   copied        true for a moment after the output was copied
 *   onCopy, onRun the actions
 */
export default function OutputPane({ status, output, notice, copied, onCopy, onRun }) {
  const hasOutput = output.trim() !== '';

  let body;
  if (status === 'running') {
    body = (
      <div className="cp-running" role="status" aria-label="Running your code">
        <span className="cp-skeleton" style={{ width: '38%' }} />
        <span className="cp-skeleton" style={{ width: '64%' }} />
        <span className="cp-skeleton" style={{ width: '46%' }} />
      </div>
    );
  } else if (hasOutput) {
    body = <pre className="cp-output">{output}</pre>;
  } else {
    body = (
      <div className="cp-empty">
        <span className="cp-empty__mark" aria-hidden="true">
          <TerminalWindowIcon size={28} weight="regular" />
        </span>
        <h3 className="cp-empty__title">Nothing has run yet</h3>
        <p className="cp-empty__text">Run your program and what it prints will show up here, with any errors.</p>
        <button type="button" className="cp-ghost" onClick={onRun}>
          <PlayIcon size={18} weight="fill" aria-hidden="true" />
          Run the code
        </button>
      </div>
    );
  }

  return (
    <section className="cp-pane" aria-labelledby="cp-output-title">
      <header className="cp-pane__header">
        <h2 className="cp-pane__title" id="cp-output-title">
          <TerminalWindowIcon size={20} weight="regular" aria-hidden="true" />
          <span>Output</span>
        </h2>
        <div className="cp-pane__actions">
          <span aria-live="polite">
            <Verdict status={status} />
          </span>
          {hasOutput && status !== 'running' ? (
            <Tip text={copied ? 'Copied' : 'Copy the output'}>
              <button type="button" className="cp-icon-button" onClick={onCopy} aria-label={copied ? 'Output copied' : 'Copy the output'} data-done={copied ? 'true' : 'false'}>
                {copied ? <CheckIcon size={20} weight="bold" aria-hidden="true" /> : <CopyIcon size={20} weight="regular" aria-hidden="true" />}
              </button>
            </Tip>
          ) : null}
        </div>
      </header>

      <div className="cp-console">
        {notice ? (
          <p className="cp-notice" role="status">
            <InfoIcon size={20} weight="regular" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        ) : null}
        {body}
      </div>
    </section>
  );
}
