import React from 'react';
import { toast } from 'react-toastify';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
import { CpuIcon } from '@phosphor-icons/react/dist/csr/Cpu';
import { TimerIcon } from '@phosphor-icons/react/dist/csr/Timer';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import { Avatar, Badge, Disclosure, IconButton, Notice, formatDateTime } from '../../../../ui';
import { formatMemory, formatTime } from '../../../../../utils/formatting';
import { Figure } from '../console/parts';
import { languageName } from '../model/languages';
import { isAccepted, memoryOf, pickedOption, profileIdentifier, statusOf, timeOf } from '../model/submissions';
import CodeViewer from '../workspace/editor/CodeViewer';

/** The result of one test case of a submission, as a small tile */
function CaseTile({ testCase, index }) {
  return (
    <li className="ps-case-tile">
      <div className="ps-case-tile__head">
        <span>Case {index + 1}</span>
        <Badge tone={testCase.passed ? 'success' : 'danger'} icon={testCase.passed ? <CheckCircleIcon size={14} weight="fill" aria-hidden="true" /> : <XCircleIcon size={14} weight="fill" aria-hidden="true" />}>
          {testCase.passed ? 'Passed' : 'Failed'}
        </Badge>
      </div>
      {testCase.executionTime ? <p className="ps-muted">Time: {formatTime(testCase.executionTime)}</p> : null}
      {testCase.memoryUsed ? <p className="ps-muted">Memory: {formatMemory(testCase.memoryUsed)}</p> : null}
      {testCase.error ? <p className="ps-case-tile__error">Error: {testCase.error}</p> : null}
    </li>
  );
}

/**
 * One submission in full: who sent it (a link to their public profile), how it ended, its figures,
 * the code (read only, with a copy button) or the option chosen in a multiple choice question, and
 * the result of each test case.
 *
 *   submission     the submission
 *   mcq            a multiple choice question
 *   options        the question's options (to name the chosen one)
 */
export default function SubmissionDetail({ submission, mcq, options }) {
  const status = statusOf(submission);
  const isMcq = mcq || submission.submissionType === 'mcq';
  const picked = isMcq ? pickedOption(submission, options) : null;
  const correct = submission.isCorrect || isAccepted(submission);
  const person = submission.user && typeof submission.user === 'object' ? submission.user : null;
  const cases = submission.testCaseResults || [];
  const passed = submission.testCaseSummary ? `${submission.testCaseSummary.passed}/${submission.testCaseSummary.total}` : `${cases.filter((entry) => entry.passed).length}/${cases.length}`;

  const openProfile = () => {
    const who = profileIdentifier(person);
    if (who) window.open(`/public-profile/${encodeURIComponent(who)}`, '_blank', 'noopener');
  };

  return (
    <div className="ps-stack">
      <div className="ps-detail__top">
        <Badge tone={status.tone}>{status.label}</Badge>
        {person ? (
          <button type="button" className="ps-person" onClick={openProfile}>
            <Avatar name={person.name || 'Unknown'} src={person.avatar} size={28} />
            <span>{person.name || 'Unknown'}</span>
          </button>
        ) : null}
      </div>

      <div className="ps-figures">
        <Figure icon={<CheckCircleIcon size={20} weight="regular" />} label="Score" value={submission.score || 0} />
        {isMcq ? null : <Figure icon={<TimerIcon size={20} weight="regular" />} label="Time" value={formatTime(timeOf(submission))} />}
        {isMcq ? null : <Figure icon={<CpuIcon size={20} weight="regular" />} label="Memory" value={formatMemory(memoryOf(submission))} />}
      </div>

      {isMcq ? (
        <>
          {picked ? (
            <div className="ps-block">
              <p className="ps-block__label">Selected answer</p>
              <p className="ps-picked">
                <strong>{picked.letter}.</strong> {picked.text}
              </p>
            </div>
          ) : null}
          <Notice tone={correct ? 'success' : 'danger'} title={correct ? 'Correct answer' : 'Wrong answer'}>
            {submission.submittedAt ? `Submitted ${formatDateTime(submission.submittedAt)}` : null}
          </Notice>
        </>
      ) : (
        <section className="ps-code-view" aria-label="Submitted code">
          <header className="ps-code-view__head">
            <Badge tone="neutral">{languageName(submission.language)}</Badge>
            <IconButton
              label="Copy the code"
              size="sm"
              tone="plain"
              onClick={() => navigator.clipboard.writeText(submission.code || '').then(() => toast.info('Code copied to clipboard'))}
            >
              <CopyIcon size={20} weight="regular" aria-hidden="true" />
            </IconButton>
          </header>
          <div className="ps-code-view__editor">
            <CodeViewer code={submission.code} language={submission.language} />
          </div>
        </section>
      )}

      {!isMcq && cases.length > 0 ? (
        <Disclosure variant="raised" level={3} title="Test case results" badge={`${passed} passed`}>
          <ul className="ps-case-grid">
            {cases.map((testCase, index) => (
              <CaseTile key={index} testCase={testCase} index={index} />
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </div>
  );
}
