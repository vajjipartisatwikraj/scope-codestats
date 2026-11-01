import React from 'react';
import { SpeedometerIcon } from '@phosphor-icons/react/dist/csr/Speedometer';
import { ListChecksIcon } from '@phosphor-icons/react/dist/csr/ListChecks';
import { Badge, Disclosure, Notice } from '../../../../ui';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import { RocketAnimation } from '../../../../custom-components';
import { Figure, Judging } from './parts';
import ResultTable from './ResultTable';

/**
 * The views of a SQL question's console. A run shows a table per sample test case (the expected rows
 * and the student's rows). A submit is graded on hidden cases too and the engine answers with counts
 * only, so it shows a verdict and figures.
 */

const CASE_BADGES = {
  PASSED: { tone: 'success', label: 'Passed', Icon: CheckCircleIcon },
  FAILED: { tone: 'danger', label: 'Failed', Icon: XCircleIcon },
  ERROR: { tone: 'danger', label: 'Error', Icon: XCircleIcon },
};

/** Before a run: the tables the query can use, or a line on what to do */
export function SqlIdle({ context }) {
  if (!context?.schemaSql) return <p className="ps-muted">Write your query and press Run to test it against the sample data.</p>;
  return (
    <div className="ps-block">
      <p className="ps-block__label">Tables available to your query</p>
      <pre className="ps-block__code">{context.schemaSql}</pre>
    </div>
  );
}

function SqlSubmitSummary({ result }) {
  const passed = Number(result.passed) || 0;
  const total = Number(result.total) || 0;
  // The server decides; the counts only stand in when the verdict carries no flag (a transport error)
  const accepted = typeof result.isCorrect === 'boolean' ? result.isCorrect : total > 0 && passed === total;
  return (
    <div className="ps-stack">
      <Notice tone={accepted ? 'success' : 'danger'} title={accepted ? 'Accepted' : 'Wrong answer'}>
        {passed} of {total} test cases passed.
      </Notice>
      <div className="ps-figures">
        <Figure icon={<SpeedometerIcon size={20} weight="regular" />} label="Runtime" value={`${Number(result.executionTimeMs) || 0} ms`} />
        <Figure icon={<ListChecksIcon size={20} weight="regular" />} label="Test cases" value={`${passed} of ${total} passed`} tone={accepted ? 'success' : 'warning'} />
      </div>
    </div>
  );
}

/** After a run or a submit: the error if any, then the verdict (submit) or a table per sample case (run) */
export function SqlOutcome({ result, context }) {
  const submit = result.mode === 'SUBMIT';
  // The engine attaches `expected` only to a failing case; the published rows of every sample case come with the question
  const expectedById = new Map((context?.testcases || []).map((testCase) => [testCase.id, testCase.expected]));
  return (
    <div className="ps-stack">
      {result.error ? (
        <Notice tone={result.status === 'TIMEOUT' ? 'warning' : 'danger'} title={result.status === 'TIMEOUT' ? 'The query timed out' : 'The query failed'}>
          <pre className="ps-notice-code">{result.error}</pre>
        </Notice>
      ) : null}
      {submit ? <SqlSubmitSummary result={result} /> : null}
      {!submit
        ? (result.testcases || []).map((testCase, index) => {
            const badge = CASE_BADGES[testCase.status];
            const expected = testCase.expected ?? expectedById.get(testCase.id) ?? null;
            return (
              <Disclosure
                key={testCase.id || index}
                variant="raised"
                level={3}
                title={`Case ${index + 1}`}
                defaultOpen={testCase.status !== 'PASSED'}
                badge={
                  <>
                    {badge ? (
                      <Badge tone={badge.tone} icon={<badge.Icon size={14} weight="fill" aria-hidden="true" />}>
                        {badge.label}
                      </Badge>
                    ) : null}
                    {typeof testCase.executionTimeMs === 'number' ? <span className="ps-muted"> {testCase.executionTimeMs} ms</span> : null}
                  </>
                }
              >
                <p className="ps-block__label">Expected output</p>
                <ResultTable columns={expected?.columns} rows={expected?.rows} caption={`Expected output of case ${index + 1}`} emptyLabel="The expected output is not available for this case" />
                <p className="ps-block__label ps-block__label--spaced">Your output</p>
                <ResultTable columns={testCase.actual?.columns} rows={testCase.actual?.rows} caption={`Your output for case ${index + 1}`} emptyLabel="No columns returned" />
              </Disclosure>
            );
          })
        : null}
    </div>
  );
}

/** The whole SQL console body */
export default function SqlBody({ busy, mode, result, context, rocket }) {
  if (rocket?.playing) return <RocketAnimation state={rocket.state} onComplete={rocket.onComplete} labels={{ running: mode === 'SUBMIT' ? 'Grading against every test case' : 'Running against the sample test cases' }} />;
  if (busy) return <Judging>{mode === 'SUBMIT' ? 'Grading your query against every test case' : 'Running your query against the sample test cases'}</Judging>;
  if (!result) return <SqlIdle context={context} />;
  return <SqlOutcome result={result} context={context} />;
}
