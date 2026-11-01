import React from 'react';
import { CpuIcon } from '@phosphor-icons/react/dist/csr/Cpu';
import { TimerIcon } from '@phosphor-icons/react/dist/csr/Timer';
import { Badge, TextField } from '../../../../ui';
import { formatMemory } from '../../../../../utils/formatting';
import { joinLines, rawStdinOf, visibleTestCases } from '../model/results';
import { CodeBlock, Figure, Judging } from './parts';

/**
 * The views of debug mode: the raw input the judge feeds in, the expected output next to what the
 * code printed, and a run with the student's own input.
 */

/** The raw input, one shade per test case: the first line is the number of cases */
function RawInput({ text, cases }) {
  const lines = text.split('\n');
  const perCase = Math.max(1, Math.round((lines.length - 1) / (cases || 1)));
  return lines.map((line, index) => (
    <span key={index} className="ps-line" data-shade={index === 0 ? 'head' : Math.floor((index - 1) / perCase) % 2 === 0 ? 'a' : 'b'}>
      {line || '\u00A0'}
    </span>
  ));
}

/** Output line by line: a line is marked when it matches the same line of the other output or differs */
function DiffLines({ text, other, compare }) {
  const against = other.split('\n');
  return text.split('\n').map((line, index) => {
    const state = !compare ? 'none' : line.trim() === (against[index] ?? '').trim() ? 'match' : 'differ';
    return (
      <span key={index} className="ps-line" data-state={state}>
        {state !== 'none' ? <span className="ui-sr">{state === 'match' ? 'Matches: ' : 'Differs: '}</span> : null}
        {line || '\u00A0'}
      </span>
    );
  });
}

/** Debug, first tab: the raw input, the expected output and what the code printed, lined up */
export function RawCompare({ question, outcome }) {
  const expected = joinLines(visibleTestCases(question).map((testCase) => testCase.output));
  const printed = joinLines(outcome.results.filter((row) => !row.hidden).map((row) => row.actualOutput || ''));
  const input = rawStdinOf(question);
  const ran = Boolean(printed);
  return (
    <div className="ps-stack">
      <div className="ps-block">
        <p className="ps-block__label">Input</p>
        <pre className="ps-block__code" data-empty={input ? 'false' : 'true'}>
          {input ? <RawInput text={input} cases={visibleTestCases(question).length} /> : 'No input'}
        </pre>
      </div>
      <div className="ps-pair">
        <div className="ps-block">
          <p className="ps-block__label">Expected output</p>
          <pre className="ps-block__code" data-empty={expected ? 'false' : 'true'}>
            {expected ? <DiffLines text={expected} other={printed} compare={ran} /> : 'No expected output'}
          </pre>
        </div>
        <div className="ps-block">
          <p className="ps-block__label">Your output</p>
          <pre className="ps-block__code" data-empty={ran ? 'false' : 'true'}>
            {ran ? <DiffLines text={printed} other={expected} compare /> : 'Run your code to see the output'}
          </pre>
        </div>
      </div>
    </div>
  );
}

/** Debug, second tab: the student's own input, and the raw output of a run */
export function CustomRun({ input, onInput, output, running }) {
  return (
    <div className="ps-stack">
      <TextField
        multiline
        rows={4}
        label="Input"
        hint="Add the number of test cases (T) as the first line of your input."
        placeholder="Enter your input here"
        value={input}
        onChange={(event) => onInput(event.target.value)}
        className="ps-custom-input"
        spellCheck={false}
      />
      {running ? <Judging>Running your code</Judging> : null}
      {!running && output ? (
        <div className="ps-block">
          <p className="ps-block__label">Output</p>
          <pre className="ps-block__code" data-tone={output.error ? 'danger' : 'neutral'} data-empty={!output.error && !output.output ? 'true' : 'false'}>
            {output.error ? output.error : output.output || 'No output'}
          </pre>
          {!output.error && (output.time || output.memory) ? (
            <div className="ps-figures">
              {output.time ? <Figure icon={<TimerIcon size={20} weight="regular" />} label="Time" value={`${output.time} s`} /> : null}
              {output.memory ? <Figure icon={<CpuIcon size={20} weight="regular" />} label="Memory" value={formatMemory(output.memory)} /> : null}
              <Badge tone={output.status === 'Accepted' ? 'success' : 'neutral'}>{output.status || 'Completed'}</Badge>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
