import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import { runSqlQuery, submitSqlQuery, toSqlErrorMessage } from '../../../../../services/sqlQuestionApi';
import * as api from '../api/problemApi';
import { startingCode } from '../model/languages';
import { interpretExecution } from '../model/results';

/** A run or a submit cannot start within this time of the last one (the server has its own, longer limit) */
const COOLDOWN_MS = 3000;

/** What the console has to show: the rows of the last run or submit, and how it ended. `id` changes with every run. */
const NO_RESULTS = { id: 0, results: [], summary: null, failed: false, message: '', submission: false };

/**
 * Everything the student does with the code: the language and the code in the editor (each language
 * keeps its own draft), running the visible test cases, running with their own input, submitting,
 * and the same for a SQL query. It owns the results the console shows.
 *
 *   ids          { cohortId, moduleId, questionId }
 *   problem      the result of useProblem
 *   editorRef    the editor's handle; getCodeForSubmission() returns the code without fill-in-the-blank markers
 *
 * Run is Ctrl or Cmd + ' and Submit is Ctrl or Cmd + Enter (not while something is running, and not
 * for Submit on the custom input tab of a programming question).
 */
export default function useCodeRunner({ ids, problem, editorRef }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { question, submissions, sqlContext, loading, addSubmission, refreshSubmissions } = problem;
  const isSql = question?.type === 'sql';

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sqlBusy, setSqlBusy] = useState(null); // 'RUN' | 'SUBMIT' | null
  const [outcome, setOutcome] = useState(NO_RESULTS);
  const [sqlResult, setSqlResult] = useState(null);
  const [inputTab, setInputTab] = useState(0); // 0 test cases, 1 custom input
  const [panelMode, setPanelMode] = useState('testrun'); // 'testrun' | 'debug'
  const [customInput, setCustomInput] = useState('');
  const [customOutput, setCustomOutput] = useState(null);
  const drafts = useRef({});
  const lastExecution = useRef(0);
  const runCount = useRef(0);

  const busy = running || submitting || Boolean(sqlBusy);

  // A new question starts from the student's latest submission, or from the starter code
  useEffect(() => {
    if (loading || !question) return;
    const first = question.type === 'sql' ? 'sql' : question.defaultLanguage || 'cpp';
    drafts.current = {};
    setLanguage(first);
    setCode(startingCode(first, question, submissions, sqlContext));
    setOutcome(NO_RESULTS);
    setSqlResult(null);
    setCustomOutput(null);
    setInputTab(0);
    setPanelMode('testrun');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, question?._id]);

  const selectLanguage = useCallback(
    (next) => {
      if (next === language) return;
      drafts.current[language] = code;
      setLanguage(next);
      setCode(drafts.current[next] ?? startingCode(next, question, submissions, sqlContext));
    },
    [language, code, question, submissions, sqlContext]
  );

  const changePanelMode = useCallback((mode) => {
    setPanelMode(mode);
    // The custom input tab only exists in debug mode
    if (mode === 'testrun') setInputTab(0);
  }, []);

  const canExecuteNow = () => {
    const now = Date.now();
    if (now - lastExecution.current < COOLDOWN_MS) {
      toast.warn('Please wait before your next run or submit', { position: 'top-center', autoClose: 1800, hideProgressBar: true, toastId: 'exec-cooldown' });
      return false;
    }
    lastExecution.current = now;
    return true;
  };

  const sourceCode = () => (question?.fillInTheBlank && editorRef.current?.getCodeForSubmission ? editorRef.current.getCodeForSubmission() : code);

  const leaveIfUnpublished = (error) => {
    if (error.response?.status === 403 && error.response?.data?.error === 'COHORT_UNPUBLISHED') {
      toast.error('This cohort is not published yet');
      navigate('/cohorts');
      return true;
    }
    return false;
  };

  // ---- Programming ------------------------------------------------------------------------------

  /** Runs the visible cases (a run) or all of them (a submit). Returns null when it did not complete. */
  const executeTests = async (submission) => {
    if (!question.testCases || question.testCases.length === 0) {
      toast.error('No test cases available for this question');
      return null;
    }
    const source = sourceCode();
    setRunning(true);
    setOutcome(NO_RESULTS);
    try {
      if (submission) {
        const saved = await api.submitProgramming(token, ids, { code: source, language });
        const result = interpretExecution(saved.execution, { submission: true });
        setOutcome({ ...result, submission: true, id: ++runCount.current });
        return { saved };
      }
      const response = await api.runWithQuestion({ language, code: source, questionId: ids.questionId });
      setOutcome({ ...interpretExecution(response, { submission: false }), submission: false, id: ++runCount.current });
      return {};
    } catch (error) {
      console.error('Test execution error:', error);
      if (leaveIfUnpublished(error)) return null;
      // A run that did not reach the server, or a submit that was refused (the cooldown, for example), must not look like nothing happened
      toast.error(submission ? error.response?.data?.message || error.response?.data?.error || 'Submission failed' : error.message || 'Failed to run the code');
      return null;
    } finally {
      setRunning(false);
    }
  };

  const submitProgram = async () => {
    if (!canExecuteNow()) return;
    // A submit is always read on the test cases tab in test run mode, even when sent from debug mode
    changePanelMode('testrun');
    setInputTab(0);
    setSubmitting(true);
    try {
      const done = await executeTests(true);
      if (!done) return;
      const entry = done.saved?.submission;
      if (entry) addSubmission(entry);
      else toast.error('Failed to save submission');
    } finally {
      setSubmitting(false);
    }
  };

  const runCustom = async () => {
    if (!customInput.trim()) {
      toast.error('Please enter custom input');
      return;
    }
    const source = sourceCode();
    setRunning(true);
    setCustomOutput(null);
    try {
      const response = await api.runWithCustomInput({ language, code: source, input: customInput });
      if (response.success) {
        const { output, time, memory, status } = response.result;
        setCustomOutput({ output: output || '', error: null, time, memory, status });
      } else {
        // The run finished with an error: a compilation or runtime error
        const result = response.result || {};
        setCustomOutput({ output: '', error: result.error || result.status || 'Execution failed', time: result.time, memory: result.memory, status: result.status || 'Error' });
      }
    } catch (error) {
      console.error('Custom input execution error:', error);
      setCustomOutput({ output: '', error: error.message || 'Execution failed', time: null, memory: null, status: 'Error' });
    } finally {
      setRunning(false);
    }
  };

  // ---- SQL --------------------------------------------------------------------------------------

  /** A run is practice: graded on the visible cases, never recorded, never counted */
  const runSql = async () => {
    if (!code.trim()) {
      toast.error('Write a query before running');
      return;
    }
    setSqlBusy('RUN');
    setSqlResult(null);
    try {
      setSqlResult(await runSqlQuery(ids.cohortId, ids.moduleId, ids.questionId, code));
    } catch (error) {
      setSqlResult({ mode: 'RUN', status: 'ERROR', error: toSqlErrorMessage(error, 'Failed to run the query'), passed: 0, total: 0 });
    } finally {
      setSqlBusy(null);
    }
  };

  /** A submit is graded on visible and hidden cases and recorded. The answer is an aggregate. */
  const submitSql = async () => {
    if (!code.trim()) {
      toast.error('Write a query before submitting');
      return;
    }
    setSqlBusy('SUBMIT');
    setSqlResult(null);
    try {
      const response = await submitSqlQuery(ids.cohortId, ids.moduleId, ids.questionId, code);
      const saved = response.submission || {};
      const judged = saved.sqlResult || {};
      const summary = response.summary || {};
      setSqlResult({
        mode: 'SUBMIT',
        status: judged.judgeStatus || (response.isCorrect ? 'PASSED' : 'FAILED'),
        passed: summary.passed ?? judged.testCasesPassed ?? 0,
        total: summary.total ?? judged.testCasesTotal ?? 0,
        executionTimeMs: saved.executionTime ?? 0,
        score: saved.score ?? 0,
        isCorrect: Boolean(response.isCorrect),
        ...(judged.errorMessage ? { error: judged.errorMessage } : {}),
      });
      refreshSubmissions();
    } catch (error) {
      setSqlResult({ mode: 'SUBMIT', status: 'ERROR', error: toSqlErrorMessage(error, 'Failed to submit the query'), passed: 0, total: 0 });
    } finally {
      setSqlBusy(null);
    }
  };

  // ---- The two actions of the top bar -----------------------------------------------------------

  const run = async () => {
    if (!canExecuteNow()) return;
    if (isSql) await runSql();
    else if (inputTab === 1) await runCustom();
    else await executeTests(false);
  };

  const submit = async () => {
    if (isSql) {
      if (!canExecuteNow()) return;
      await submitSql();
    } else if (question?.type === 'programming') {
      await submitProgram();
    }
  };

  // The shortcuts are registered once and read the latest handlers
  const latest = useRef({});
  latest.current = { run, submit, busy, inputTab, type: question?.type };
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const { run: doRun, submit: doSubmit, busy: isBusy, inputTab: tab, type } = latest.current;
      if (type !== 'programming' && type !== 'sql') return;
      if (event.key === 'Enter') {
        event.preventDefault();
        // SQL has no custom input tab, so the tab guard only applies to programming
        if (!isBusy && (type === 'sql' || tab !== 1)) doSubmit();
      } else if (event.key === "'") {
        event.preventDefault();
        if (!isBusy) doRun();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return {
    language, selectLanguage, code, setCode,
    busy, running, submitting, sqlBusy,
    outcome, sqlResult,
    inputTab, setInputTab, panelMode, changePanelMode,
    customInput, setCustomInput, customOutput,
    run, submit,
  };
}
