import React, { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { Button, Card, EmptyState, Skeleton } from '../../../ui';
import { useAuth } from '../../../../contexts/AuthContext';
import useExamGuard from '../../../../hooks/useExamGuard';
import { isExamSessionSearch, withExamSession } from '../../../../utils/examSession';
import { EXAM_BAR_HEIGHT } from '../../../cohort/ExamSessionBar';
import FeedbackPanel from './feedback/FeedbackPanel';
import useCohortDetail from './hooks/useCohortDetail';
import useModuleQuestions from './hooks/useModuleQuestions';
import useModuleSelection from './hooks/useModuleSelection';
import { cohortSummary, progressByQuestion } from './model/progress';
import ProgressPanel from './progress/ProgressPanel';
import ModuleNotes from './questions/ModuleNotes';
import QuestionsPanel from './questions/QuestionsPanel';
import ExamBanner from './shared/ExamBanner';
import CohortSidebar from './sidebar/CohortSidebar';
import './cohortDetail.css';

/** The page's shape while the cohort loads: the two columns, so nothing jumps when it arrives */
function PageSkeleton() {
  return (
    <div className="cdp" aria-busy="true" role="status" aria-label="Loading the cohort">
      <div className="cdp-grid">
        <div className="cdp-left">
          <Card as="div" flush className="cds">
            <div className="cdh">
              <Skeleton width={88} height={22} radius="var(--ds-radius-pill)" />
              <Skeleton width="65%" height={24} />
              <Skeleton height={12} />
              <Skeleton width="80%" height={12} />
            </div>
            <div className="cdm">
              <Skeleton height={52} radius="var(--ds-radius-md)" />
              <Skeleton height={52} radius="var(--ds-radius-md)" />
              <Skeleton height={52} radius="var(--ds-radius-md)" />
            </div>
          </Card>
        </div>
        <div className="cdp-right">
          <Card as="div" className="cdq">
            <Skeleton width="40%" height={32} />
            <Skeleton height={72} radius="var(--ds-radius-lg)" />
            <Skeleton height={72} radius="var(--ds-radius-lg)" />
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * A cohort for a student (route /cohorts/:id): the cohort's header and its modules on the left, and
 * on the right the open module's questions (or the module's notes, the student's progress, or their
 * review). Choosing a module opens its questions; a question opens in a new tab, or in this tab
 * during an exam. On a phone the two sides take turns: the list first, then the questions with a
 * way back.
 *
 * Follows design/screens.md section 8 and the shared kit in ../ui. The folder is organised by job:
 *   sidebar/   the left column: one card joining the header and the module list
 *   header/    the accent top of the sidebar: name, status, overall progress, the two cohort-wide views
 *   modules/   the list of modules, under the header
 *   questions/ the open module: header, difficulty bars, filters, rows, notes
 *   progress/  the student's standing and the leaderboard
 *   feedback/  rate and review
 *   shared/    the exam banner
 *   hooks/     data and state (the cohort, a module's questions, the selection, the leaderboard, reviews)
 *   model/     the rules, with no React (progress figures, question order and filters, error wording)
 *
 * Staff do not come here: CohortDetailRoute sends them to the authoring page.
 */
export default function CohortDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { cohort, modules, loading } = useCohortDetail(id);
  const { selected, selectModule, panel, setPanel, showPanel, view, setView } = useModuleSelection(modules);
  const questions = useModuleQuestions(id, selected);

  const byQuestion = useMemo(() => progressByQuestion(cohort?.userProgress), [cohort]);
  const summary = useMemo(() => cohortSummary(modules, byQuestion), [modules, byQuestion]);

  // An exam session tab (?exam=1) has the app shell's own countdown bar and guard; here the page only
  // follows an exam cohort's clock when it is opened in an ordinary tab.
  const examSession = isExamSessionSearch(location.search);
  const isExam = cohort?.mode === 'exam' || Boolean(cohort?.examWindow?.isExam);
  const { exam, remainingMs } = useExamGuard({ cohortId: id, enabled: isExam && !examSession });

  const openQuestion = useCallback(
    (question) => {
      if (!selected) return;
      const path = `/cohorts/${id}/modules/${selected._id}/questions/${question._id}`;
      // During an exam the question opens in this tab: a new tab is a new browsing context, which
      // drops fullscreen and would be recorded as an exit the student did not choose.
      if (examSession) navigate(withExamSession(path, true));
      else window.open(path, '_blank', 'noopener');
    },
    [id, selected, examSession, navigate]
  );

  if (loading || !cohort) return <PageSkeleton />;

  let main;
  if (panel === 'progress') {
    main = <ProgressPanel cohortId={id} userProgress={cohort.userProgress} summary={summary} currentUserId={user?.id} />;
  } else if (panel === 'feedback') {
    main = <FeedbackPanel cohortId={id} currentUserId={user?.id} />;
  } else if (!selected) {
    main = (
      <Card as="section">
        <EmptyState icon={<StackIcon size={28} weight="regular" />} title="Nothing to open yet" text="This cohort has no modules. Check back once your teacher adds some." />
      </Card>
    );
  } else if (panel === 'notes') {
    main = <ModuleNotes module={selected} onBack={() => setPanel('questions')} />;
  } else {
    main = (
      // Keyed by the module, so the filters start afresh when another module opens
      <QuestionsPanel
        key={selected._id}
        module={selected}
        questions={questions}
        byQuestion={byQuestion}
        sameTab={examSession}
        onOpenQuestion={openQuestion}
        onNotes={() => setPanel('notes')}
        onBack={() => setView('modules')}
      />
    );
  }

  return (
    <div className="cdp" data-view={view} style={examSession ? { '--cdp-chrome': `${EXAM_BAR_HEIGHT}px` } : undefined}>
      {isExam && !examSession ? (
        <div className="cdp-banner">
          <ExamBanner exam={exam || cohort.examWindow} remainingMs={remainingMs ?? cohort.examWindow?.msRemaining} />
        </div>
      ) : null}

      <div className="cdp-grid">
        <aside className="cdp-left" aria-label="Cohort and modules">
          <CohortSidebar
            cohort={cohort}
            panel={panel}
            onPanel={showPanel}
            modules={modules}
            byQuestion={byQuestion}
            selectedId={panel === 'questions' || panel === 'notes' ? selected?._id : undefined}
            onSelect={selectModule}
          />
        </aside>

        <div className="cdp-right">
          {panel !== 'questions' ? (
            <Button className="cdp-back" variant="ghost" size="sm" startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setView('modules')}>
              All modules
            </Button>
          ) : null}
          {main}
        </div>
      </div>
    </div>
  );
}
