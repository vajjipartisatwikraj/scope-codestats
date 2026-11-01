import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, PillTabs, Skeleton } from '../../../ui';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import useAutoHideScrollbars from '../../../../hooks/useAutoHideScrollbars';
import useExamGuard from '../../../../hooks/useExamGuard';
import useMediaQuery from '../../../../hooks/useMediaQuery';
import { isExamSessionSearch, withExamSession } from '../../../../utils/examSession';
import { EXAM_BAR_HEIGHT } from '../../../cohort/ExamSessionBar';
import useSplit from '../../../CodePad/useSplit';
import useCodeRunner from './hooks/useCodeRunner';
import { useAllSubmissions, useEditorial } from './hooks/useLazyData';
import useMcq from './hooks/useMcq';
import useProblem from './hooks/useProblem';
import useProblemNavigation from './hooks/useProblemNavigation';
import ProblemList from './navigation/ProblemList';
import ProblemRail from './navigation/ProblemRail';
import ProblemTopBar from './navigation/ProblemTopBar';
import StepButtons from './navigation/StepButtons';
import EditorialSection from './sections/EditorialSection';
import NotesSection from './sections/NotesSection';
import ReportSection from './sections/ReportSection';
import SubmissionsSection from './sections/SubmissionsSection';
import Gutter from './shared/Gutter';
import DescriptionPane from './statement/DescriptionPane';
import CodeWorkspace from './workspace/CodeWorkspace';
import McqPane from './workspace/McqPane';
import './problem.css';

/** The view of a phone, where the panes take turns */
const PHONE_VIEWS = {
  coding: [
    { key: 'problem', label: 'Problem' },
    { key: 'code', label: 'Code' },
    { key: 'console', label: 'Test cases' },
  ],
  mcq: [
    { key: 'problem', label: 'Problem' },
    { key: 'answer', label: 'Answer' },
  ],
};

function PageSkeleton({ wide }) {
  return (
    <div className="psp-body" data-layout="wide" aria-busy="true" style={{ gridTemplateColumns: wide ? 'minmax(0, 1fr) 8px minmax(0, 1fr)' : 'minmax(0, 1fr)' }}>
      <Skeleton height="100%" radius={18} />
      {wide ? <span aria-hidden="true" /> : null}
      {wide ? <Skeleton height="100%" radius={18} /> : null}
    </div>
  );
}

/**
 * The problem screen (route /cohorts/:cohortId/modules/:moduleId/questions/:questionId): the
 * statement at the left, the editor and the test cases at the right, the problem rail and a top
 * strip with Run and Submit. It follows design/screens.md section 9.
 *
 *   - From 900px a full-height split: the statement and the right side with a draggable gutter, and
 *     the editor over the test cases with another. Any pane folds to its header.
 *   - Below 900px the panes take turns as tabs (Problem, Code, Test cases); Run and Submit switch to
 *     the test cases.
 *   - The section switcher (Problem, Editorial, Submissions, Report, Notes) is in the statement's
 *     header. The statement stays at the left; the other sections open at the right, while the
 *     editor stays mounted behind them so nothing typed is lost.
 *   - An exam tab (?exam=1) sits under the shell's countdown bar and stays in this tab.
 *
 * Everything the page does with the server is in api/problemApi.js and hooks/; nothing here changes
 * what the server receives.
 */
export default function ProblemPage() {
  // Scrollbars (the statement, the console, the lists) show only while something is being scrolled
  useAutoHideScrollbars();
  const { cohortId, moduleId, questionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeName, darkMode, toggleTheme } = useTheme();
  const wide = useMediaQuery('(min-width: 900px)');
  const examSession = isExamSessionSearch(location.search);
  const staff = user?.userType === 'admin' || user?.userType === 'teacher';
  const ids = useMemo(() => ({ cohortId, moduleId, questionId }), [cohortId, moduleId, questionId]);

  // The page that is open when an exam closes: ask the server and leave when the window shuts. An
  // exam tab has the shell's guard, and staff are never guarded.
  const { exam, remainingMs } = useExamGuard({ cohortId, enabled: !staff && !examSession });

  const editorRef = useRef(null);
  const problem = useProblem({ ...ids, examSession });
  const runner = useCodeRunner({ ids, problem, editorRef });
  const mcq = useMcq({ ids, problem });
  const nav = useProblemNavigation({ ...ids, examSession, refreshKey: problem.solved });
  const editorial = useEditorial(ids);
  const allUsers = useAllSubmissions(ids);

  const { question, loading } = problem;
  const isMcq = question?.type === 'mcq';
  const coding = question?.type === 'programming' || question?.type === 'sql';

  const [section, setSection] = useState('problem');
  const [phoneView, setPhoneView] = useState('problem');
  const [descFolded, setDescFolded] = useState(false);
  const [fold, setFold] = useState(null); // 'editor' | 'test' | null
  const [listOpen, setListOpen] = useState(false);
  const opened = useRef({});
  const columns = useSplit({ axis: 'x', initial: 0.5, min: 0.2, max: 0.8, label: 'Resize the statement and the editor' });

  // Another question starts on its statement; its lazy sections have not been opened yet
  useEffect(() => {
    setSection('problem');
    setPhoneView('problem');
    opened.current = {};
  }, [questionId]);

  const chooseSection = useCallback(
    (key) => {
      setSection(key);
      if (opened.current[key]) return;
      opened.current[key] = true;
      if (key === 'editorial') editorial.load();
      if (key === 'submissions') problem.refreshSubmissions();
    },
    [editorial, problem]
  );

  const toggleFold = (name) => setFold((current) => (current === name ? null : name));

  // On a phone the result is on another tab: take the student to it
  const run = () => {
    if (!wide) setPhoneView('console');
    runner.run();
  };
  const submit = () => {
    if (!wide && coding) setPhoneView('console');
    runner.submit();
  };

  const leave = () => navigate(examSession ? withExamSession(`/cohorts/${cohortId}`, true) : '/dashboard');

  const sectionPane = (embedded = false) => {
    switch (section) {
      case 'editorial':
        return <EditorialSection data={editorial} embedded={embedded} />;
      case 'submissions':
        return <SubmissionsSection question={question} submissions={problem.submissions} allUsers={allUsers} unlocked={staff || problem.submissions.some((entry) => entry.status === 'accepted')} embedded={embedded} />;
      case 'report':
        return <ReportSection ids={ids} staff={staff} embedded={embedded} />;
      case 'notes':
        return <NotesSection ids={ids} embedded={embedded} />;
      default:
        return null;
    }
  };

  const description = (replace) => (
    <DescriptionPane
      question={question}
      progress={problem.progress}
      exam={examSession ? null : exam}
      remainingMs={remainingMs}
      section={section}
      onSection={chooseSection}
      folded={wide && descFolded}
      onFold={wide ? () => setDescFolded((folded) => !folded) : undefined}
      replace={replace}
    />
  );

  const answer = isMcq ? (
    <McqPane question={question} mcq={mcq} />
  ) : (
    <CodeWorkspace
      question={question}
      runner={runner}
      themeName={themeName}
      editorRef={editorRef}
      context={problem.sqlContext}
      fold={fold}
      onFold={toggleFold}
      wide={wide}
      part={wide ? 'both' : phoneView === 'console' ? 'console' : 'editor'}
    />
  );

  let body;
  if (loading) {
    body = <PageSkeleton wide={wide} />;
  } else if (!question) {
    body = (
      <div className="psp-body" data-layout="single">
        <EmptyState title="No question data available" text="The question did not load." action={<Button variant="primary" onClick={() => problem.reload()}>Reload</Button>} />
      </div>
    );
  } else if (wide) {
    const template = descFolded ? '48px 8px minmax(0, 1fr)' : `minmax(0, ${columns.ratio}fr) 8px minmax(0, ${1 - columns.ratio}fr)`;
    body = (
      <div className="psp-body" data-layout="wide" ref={columns.containerRef} style={{ gridTemplateColumns: template }} data-dragging={columns.dragging ? 'true' : 'false'}>
        {description()}
        {descFolded ? <span aria-hidden="true" /> : <Gutter axis="x" gutterProps={columns.gutterProps} onDoubleClick={() => setDescFolded(true)} />}
        <div className="psp-right">
          <div className="psp-right__pane" hidden={section !== 'problem'}>
            {answer}
          </div>
          {section !== 'problem' ? <div className="psp-right__pane">{sectionPane()}</div> : null}
        </div>
      </div>
    );
  } else {
    // A phone: one pane at a time. The editor stays mounted behind the other tabs.
    const views = isMcq ? PHONE_VIEWS.mcq : PHONE_VIEWS.coding;
    const view = views.some((entry) => entry.key === phoneView) ? phoneView : 'problem';
    body = (
      <div className="psp-body" data-layout="phone">
        <div className="psp-phone-row">
          <PillTabs items={views} value={view} onChange={setPhoneView} label="Parts of this question" className="psp-phone-tabs" />
          <StepButtons nav={nav} />
        </div>
        <div className="psp-phone-pane" hidden={view !== 'problem'}>
          {description(section === 'problem' ? undefined : sectionPane(true))}
        </div>
        <div className="psp-phone-pane" hidden={view === 'problem'}>
          {answer}
        </div>
      </div>
    );
  }

  return (
    <div className="psp" style={examSession ? { '--ps-top': `${EXAM_BAR_HEIGHT}px` } : undefined}>
      <ProblemRail nav={nav} examSession={examSession} onLeave={leave} darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className="psp-main">
        <ProblemTopBar onList={() => setListOpen(true)} compact={!wide} coding={Boolean(coding)} runner={runner} onRun={run} onSubmit={submit} sql={question?.type === 'sql'} />
        {body}
      </div>
      <ProblemList open={listOpen} onClose={() => setListOpen(false)} nav={nav} currentId={questionId} />
    </div>
  );
}
