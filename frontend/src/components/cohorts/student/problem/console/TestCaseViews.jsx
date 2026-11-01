import React from 'react';
import { Disclosure, EmptyState, Notice } from '../../../../ui';
import { formatMemory } from '../../../../../utils/formatting';
import { SpeedometerIcon } from '@phosphor-icons/react/dist/csr/Speedometer';
import { CpuIcon } from '@phosphor-icons/react/dist/csr/Cpu';
import { ListChecksIcon } from '@phosphor-icons/react/dist/csr/ListChecks';
import { countsOf, gotTextOf, hasFailures, verdictOfCase, visibleTestCases } from '../model/results';
import { scoringTiersOf } from '../model/scoring';
import { CodeBlock, Figure, VerdictBadge } from './parts';

/**
 * The views of the "Test cases" tab in a test run: the cases before anything runs, the rows after a
 * run, and the verdict after a submit.
 */

/** The visible test cases, before anything is run */
export function SampleCases({ question }) {
  const cases = visibleTestCases(question);
  if (cases.length === 0) return <EmptyState compact title="No sample test cases" text="This question shows no sample cases. Submit to check your code against all of them." />;
  return (
    <div className="ps-stack">
      {cases.map((testCase, index) => (
        <Disclosure key={index} variant="raised" level={3} title={`Case ${index + 1}`} defaultOpen={index === 0}>
          <div className="ps-pair">
            <CodeBlock label="Input" empty="No input">
              {testCase.input}
            </CodeBlock>
            <CodeBlock label="Expected output" empty="No expected output">
              {testCase.output}
            </CodeBlock>
          </div>
        </Disclosure>
      ))}
    </div>
  );
}

/** The runtime, memory and test case figures of an execution */
function PerformanceFigures({ results, passed, total }) {
  const time = results[0]?.executionTime || 0;
  const memory = Math.max(0, ...results.map((row) => row.memoryUsed || row.memory || 0));
  return (
    <div className="ps-figures">
      <Figure icon={<SpeedometerIcon size={20} weight="regular" />} label="Runtime" value={`${time} ms`} />
      <Figure icon={<CpuIcon size={20} weight="regular" />} label="Memory" value={formatMemory(memory)} />
      <Figure icon={<ListChecksIcon size={20} weight="regular" />} label="Test cases" value={`${passed} of ${total} passed`} tone={passed === total ? 'success' : 'warning'} />
    </div>
  );
}

/** The rows of a test run: a verdict per case, expandable to the input, the expected output and what the code printed */
export function RunResults({ outcome, question }) {
  const rows = outcome.results.filter((row) => !row.hidden);
  const { passed, total } = countsOf(outcome.results, outcome.summary, false, question);
  const limits = { timeLimit: question?.constraints?.timeLimit, memoryLimit: question?.constraints?.memoryLimit };
  return (
    <div className="ps-stack">
      <PerformanceFigures results={rows} passed={passed} total={total} />
      {rows.map((row, index) => {
        const verdict = verdictOfCase(row);
        return (
          <Disclosure
            key={`${outcome.id}-${index}`}
            variant="raised"
            level={3}
            title={`Case ${index + 1}`}
            badge={<VerdictBadge verdict={verdict} />}
            defaultOpen={verdict.key !== 'passed' || index === 0}
          >
            <CodeBlock label="Input" empty="No input">
              {row.input}
            </CodeBlock>
            <div className="ps-pair">
              <CodeBlock label="Expected output" empty="No expected output">
                {row.expectedOutput}
              </CodeBlock>
              <CodeBlock label="Your output" tone={row.passed ? 'success' : 'danger'}>
                {gotTextOf(row, limits)}
              </CodeBlock>
            </div>
          </Disclosure>
        );
      })}
    </div>
  );
}

/** The scoring tiers of a question: which one the solution reached and what the others need */
function ScoringTiers({ plan, marks }) {
  const STATE_LABEL = { earned: 'Your tier', faster: 'Not reached', slower: 'Slower tier' };
  return (
    <section className="ps-tiers" aria-label="Scoring tiers">
      <h3 className="ps-subtitle">Scoring tiers</h3>
      <p className="ps-tiers__points">
        Points earned: <strong>{plan.points}</strong>
        {marks ? ` of ${marks}` : ''}
      </p>
      <ul className="ps-tiers__list">
        {plan.tiers.map((tier, index) => (
          <li key={index} data-state={tier.state}>
            <span>Tier {index + 1}: {tier.maxTime} ms or less</span>
            <span className="ps-tiers__state">{STATE_LABEL[tier.state]}</span>
            <strong>{tier.points} pts</strong>
          </li>
        ))}
        {plan.fallback ? (
          <li data-state={plan.fallback.earned ? 'earned' : 'slower'}>
            <span>Slower than every tier</span>
            <span className="ps-tiers__state">{plan.fallback.earned ? 'Your tier' : 'Not used'}</span>
            <strong>{plan.fallback.points} pts</strong>
          </li>
        ) : null}
      </ul>
      {plan.hint ? <p className="ps-tiers__hint">{plan.hint}</p> : null}
    </section>
  );
}

/**
 * The verdict of a submit. The server runs every test case, hidden ones included, and answers with
 * counts, so there are no rows to open: a verdict, the figures, and the scoring tiers when it passed.
 */
export function SubmitSummary({ outcome, question, language }) {
  const { passed, total } = countsOf(outcome.results, outcome.summary, true, question);
  const failed = hasFailures(outcome.results, outcome.summary, true);
  const time = outcome.results[0]?.executionTime || 0;
  const plan = !failed ? scoringTiersOf(question, language, time) : null;
  return (
    <div className="ps-stack">
      <Notice tone={failed ? 'danger' : 'success'} title={failed ? 'Wrong answer' : 'Accepted'}>
        {passed} of {total} test cases passed.
      </Notice>
      <PerformanceFigures results={outcome.results} passed={passed} total={total} />
      {plan ? <ScoringTiers plan={plan} marks={question.marks} /> : null}
    </div>
  );
}
