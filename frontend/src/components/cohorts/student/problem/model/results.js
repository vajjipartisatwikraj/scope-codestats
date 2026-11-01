/**
 * Turns what the server answers to a run or a submit into the rows the console shows, and names the
 * verdict of a row. No React and no network.
 */

const lower = (value) => String(value || '').toLowerCase();

/**
 * One execution (the `execution` of a submit, or the answer of a run) as console rows.
 *
 *   execution   { success, error, execution: { status, time, memory }, results: [{ input, expected,
 *               got, status, error, hidden }], summary }
 *   submission  true for a submit (all test cases, hidden ones flagged, a summary), false for a run
 *
 * Returns { failed, message, results, summary }. `failed` is a compile or runtime failure of the
 * whole execution: every row then carries the same error text, no row passes, and `message` is the
 * raw text. The row shape is the one the console has always read:
 * { testCaseId, input, expectedOutput, actualOutput, passed, hidden, executionTime, memoryUsed,
 *   error, _isSubmission }.
 */
export function interpretExecution(execution, { submission }) {
  const result = execution || { success: false, error: 'The server returned no test results', results: [] };
  const rows = Array.isArray(result.results) ? result.results : [];
  const status = lower(result.execution?.status);
  const everyRowFailedWith = (word) => rows.length > 0 && rows.every((row) => row.status === 'error' && lower(row.error).includes(word));

  const compilation = !result.success || status.includes('compilation') || everyRowFailedWith('compilation');
  const runtime = status.includes('runtime') || everyRowFailedWith('runtime');

  const base = (row, index) => ({
    testCaseId: `test-case-${index}`,
    input: row.input || '',
    expectedOutput: row.expected || '',
    hidden: submission ? Boolean(row.hidden) : false,
    _isSubmission: submission,
  });

  if (compilation || runtime) {
    const message = submission ? result.error || result.execution?.status || rows[0]?.error || 'Unknown error' : result.error || result.execution?.status || 'Execution failed';
    const text = lower(message).includes('compilation') ? `Compilation Error:\n${message}` : message;
    return {
      failed: true,
      message,
      summary: null,
      results: rows.map((row, index) => ({ ...base(row, index), actualOutput: '', passed: false, executionTime: 0, memoryUsed: 0, error: text })),
    };
  }

  // The server reports one time (seconds) and one memory figure (KB) for the whole execution
  const executionTime = result.execution?.time ? Math.round(parseFloat(result.execution.time) * 1000) : 0;
  const memoryUsed = result.execution?.memory || 0;
  return {
    failed: false,
    message: '',
    summary: submission && result.summary ? result.summary : null,
    results: rows.map((row, index) => ({
      ...base(row, index),
      actualOutput: row.got || '',
      passed: row.status === 'passed',
      executionTime,
      memoryUsed,
      error: row.error || '',
    })),
  };
}

/** 'compile' | 'runtime' | null: which failure an error text describes */
export function kindOfText(text) {
  const value = lower(text);
  if (value.includes('compilation')) return 'compile';
  if (value.includes('runtime error')) return 'runtime';
  return null;
}

/** The failure that stops the whole run, read from the rows */
export const blockingErrorOf = (results) => kindOfText((results || []).find((row) => row.error)?.error);

/** The verdict of one row: a word, a tone and a key (badge plus icon plus word, never colour alone) */
export function verdictOfCase(row) {
  const error = lower(row.error);
  if (error.includes('compilation')) return { key: 'compile', label: 'Compile error', tone: 'danger' };
  if (error.includes('runtime')) return { key: 'runtime', label: 'Runtime error', tone: 'danger' };
  if (error.includes('time')) return { key: 'time', label: 'Time limit', tone: 'warning' };
  if (error.includes('memory')) return { key: 'memory', label: 'Memory limit', tone: 'warning' };
  if (row.passed) return { key: 'passed', label: 'Passed', tone: 'success' };
  return { key: 'failed', label: 'Failed', tone: 'danger' };
}

/** What the "Got" block of a row says: the output, or the failure in words */
export function gotTextOf(row, limits = {}) {
  const error = row.error || '';
  const text = lower(error);
  if (text.includes('compilation')) return error.startsWith('Compilation Error:') ? error : `Compilation error\n${error}`;
  if (text.includes('runtime')) return error.startsWith('Runtime Error') ? error : `Runtime error\n${error}`;
  if (text.includes('time limit')) return `Time limit exceeded\nExecution time: ${row.executionTime || 'N/A'} ms${limits.timeLimit ? `\nTime limit: ${limits.timeLimit} ms` : ''}`;
  if (text.includes('memory limit')) return `Memory limit exceeded\nMemory used: ${row.memoryUsed || 'N/A'} KB${limits.memoryLimit ? `\nMemory limit: ${limits.memoryLimit} MB` : ''}`;
  return row.actualOutput || 'No output';
}

/** True when the run or submit failed somewhere, judged by the server's summary for a submit */
export function hasFailures(results, summary, isSubmission) {
  if (isSubmission && summary) return (summary.failed || 0) > 0 || (summary.passed || 0) !== (summary.total || 0);
  return (results || []).some((row) => !row.passed || row.error);
}

/** Passed and total counts: from the server's summary for a submit, from the visible rows for a run */
export function countsOf(results, summary, isSubmission, question) {
  const visible = (results || []).filter((row) => !row.hidden);
  if (isSubmission && summary) return { passed: summary.passed, total: summary.total };
  return { passed: visible.filter((row) => row.passed).length, total: question?.testCases ? question.testCases.length : 0 };
}

/** The visible test cases of a question: what the console lists before anything is run */
export const visibleTestCases = (question) => (question?.testCases || []).filter((testCase) => !testCase.hidden);

/**
 * The input the judge feeds in for a run: the number of visible cases first, then each input
 * (the same format the server builds). Debug mode shows it raw.
 */
export function rawStdinOf(question) {
  const cases = visibleTestCases(question);
  if (cases.length === 0) return '';
  return `${cases.length}\n${cases.map((testCase) => testCase.input || '').join('\n')}`;
}

export const joinLines = (values) => values.join('\n').trim();
