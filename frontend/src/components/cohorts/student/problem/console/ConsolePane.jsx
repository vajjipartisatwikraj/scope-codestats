import React, { useMemo } from 'react';
import { BugIcon } from '@phosphor-icons/react/dist/csr/Bug';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { Button, Notice, PillTabs } from '../../../../ui';
import { RocketAnimation } from '../../../../custom-components';
import Pane, { FoldButton } from '../shared/Pane';
import { blockingErrorOf, hasFailures, kindOfText } from '../model/results';
import { CustomRun, RawCompare } from './DebugViews';
import SqlBody from './SqlViews';
import { RunResults, SampleCases, SubmitSummary } from './TestCaseViews';
import { Judging } from './parts';
import useRocketGate from './useRocketGate';
import './console.css';

/** Compile and runtime failures stop the whole run: they get one notice instead of rows */
function FailureNotice({ kind, text }) {
  const compile = kind === 'compile';
  return (
    <div className="ps-stack">
      <Notice tone="danger" title={compile ? 'Compilation error' : kind === 'runtime' ? 'Runtime error' : 'The run did not finish'}>
        <pre className="ps-notice-code">{text}</pre>
      </Notice>
      {kind ? <p className="ps-muted">{compile ? 'Fix the compilation errors above, then run your code again.' : 'Your code hit a runtime error. The message above says where.'}</p> : null}
    </div>
  );
}

/** The "Test cases" tab of a test run: what is in progress, what the last run or submit gave, or the sample cases */
function TestRunBody({ question, runner, rocket }) {
  const { outcome, running, submitting, language } = runner;
  const hasRows = outcome.results.length > 0;
  if (rocket.playing) return <RocketAnimation state={rocket.state} onComplete={rocket.onComplete} />;
  if ((running || submitting) && !hasRows) {
    return <Judging>{submitting ? 'Running your code against every test case' : 'Running your code against the sample test cases'}</Judging>;
  }
  if (outcome.failed || hasRows) {
    const text = outcome.results.find((row) => row.error)?.error || outcome.message;
    const kind = outcome.failed ? kindOfText(text) : blockingErrorOf(outcome.results);
    if (outcome.failed || kind) return <FailureNotice kind={kind} text={text} />;
    return outcome.submission ? <SubmitSummary outcome={outcome} question={question} language={language} /> : <RunResults outcome={outcome} question={question} />;
  }
  return <SampleCases question={question} />;
}

/**
 * The console under the editor. Programming questions: the "Test cases" tab (the sample cases, the
 * rows of a run, the verdict of a submit) and, in debug mode, a "Custom input" tab. SQL questions:
 * the tables of a run or the verdict of a submit.
 *
 *   question   the question
 *   runner     the result of useCodeRunner
 *   folded, onFold   fold to the header
 *   context    the SQL question's schema and sample cases (SQL only)
 */
export default function ConsolePane({ question, runner, folded, onFold, context }) {
  const isSql = question.type === 'sql';
  const { outcome, inputTab, setInputTab, panelMode, changePanelMode, busy } = runner;
  const debug = panelMode === 'debug';

  // The rocket launches while a submit (or a SQL query) is judged and plays the result before it shows
  const hasOutcome = outcome.results.length > 0 || outcome.failed;
  const rocket = useRocketGate({
    launching: isSql ? Boolean(runner.sqlBusy) : runner.submitting,
    outcome: isSql ? runner.sqlResult : hasOutcome ? outcome.id : null,
    failed: isSql ? runner.sqlResult?.status !== 'PASSED' : outcome.failed || hasFailures(outcome.results, outcome.summary, outcome.submission),
  });

  const tabs = useMemo(
    () => [
      { key: 'cases', label: outcome.submission && outcome.results.length > 0 && !debug ? 'Result' : 'Test cases' },
      ...(debug ? [{ key: 'custom', label: 'Custom input' }] : []),
    ],
    [outcome, debug]
  );

  const lead = isSql ? (
    <h2 className="ps-pane__title">Test cases</h2>
  ) : (
    <PillTabs items={tabs} value={inputTab === 1 && debug ? 'custom' : 'cases'} onChange={(key) => setInputTab(key === 'custom' ? 1 : 0)} label="Console views" size="sm" />
  );

  const actions = (
    <>
      {isSql ? null : (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => changePanelMode(debug ? 'testrun' : 'debug')} startIcon={debug ? <PlayIcon size={16} weight="regular" aria-hidden="true" /> : <BugIcon size={16} weight="regular" aria-hidden="true" />}>
          {debug ? 'Test run' : 'Debug'}
        </Button>
      )}
      <FoldButton folded={folded} onToggle={onFold} name="the test cases" />
    </>
  );

  let body;
  if (isSql) body = <SqlBody busy={Boolean(runner.sqlBusy)} mode={runner.sqlBusy} result={runner.sqlResult} context={context} rocket={rocket} />;
  else if (debug) body = inputTab === 1 ? <CustomRun input={runner.customInput} onInput={runner.setCustomInput} output={runner.customOutput} running={runner.running} /> : <RawCompare question={question} outcome={outcome} />;
  else body = <TestRunBody question={question} runner={runner} rocket={rocket} />;

  return (
    <Pane className="ps-console" label="Test cases" lead={lead} actions={actions} folded={folded}>
      {body}
    </Pane>
  );
}
