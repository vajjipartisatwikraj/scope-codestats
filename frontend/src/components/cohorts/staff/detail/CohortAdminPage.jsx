import React, { Suspense, lazy, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { Button, Card, EmptyState, Skeleton } from '../../../ui';
import { useAuth } from '../../../../contexts/AuthContext';
import ExamBanner from '../../student/detail/shared/ExamBanner';
import ImportBanner from '../../../bankLibrary/picker/ImportBanner';
import ImportDrawer from '../../../bankLibrary/picker/ImportDrawer';
import useCohortImports from '../../../bankLibrary/hooks/useCohortImports';
import { startImport } from '../../../bankLibrary/api/bankLibraryApi';
import { apiMessage, jobSummary } from '../../../bankLibrary/model/bankLibrary';
import ModuleNotes from '../../student/detail/questions/ModuleNotes';
import useModuleQuestions from '../../student/detail/hooks/useModuleQuestions';
import useModuleSelection from '../../student/detail/hooks/useModuleSelection';
import '../../student/detail/cohortDetail.css';
import { BulkUploadSheet, QuestionSheet } from './dialogs/QuestionSheet';
import ModuleDrawer from './dialogs/ModuleDrawer';
import SharedContentDialog from './dialogs/SharedContentDialog';
import useSharedConfirm from './hooks/useSharedConfirm';
import useStaffActions from './hooks/useStaffActions';
import useStaffCohort from './hooks/useStaffCohort';
import { emptyQuestionForm } from './model/staffContent';
import StaffQuestionsPanel from './questions/StaffQuestionsPanel';
import StaffSidebar from './sidebar/StaffSidebar';

// The cohort-wide progress table is still a Material UI screen: it loads only when Progress is opened
const CohortProgress = lazy(() => import('../../../cohort/CohortProgress'));

function PageSkeleton() {
  return (
    <div className="cdp" aria-busy="true">
      <div className="cdp-grid">
        <div className="cdp-left">
          <Card flush>
            <Skeleton height={168} radius={0} />
            <div style={{ padding: 16, display: 'grid', gap: 8 }}>
              <Skeleton height={68} />
              <Skeleton height={68} />
              <Skeleton height={68} />
            </div>
          </Card>
        </div>
        <div className="cdp-right">
          <Card>
            <Skeleton width="40%" height={32} />
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              <Skeleton height={92} />
              <Skeleton height={92} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * The staff cohort page (routes /admin/cohorts/:id, and /cohorts/:id for an admin or a teacher): the
 * student page's frame with the staff tools in it. Left, one card with the cohort (published or
 * draft, Publish, Progress) over its modules (add, edit, delete); right, the open module's questions
 * (add, upload, export, edit, delete, view), its notes, or the cohort's progress. On a phone the two
 * sides take turns.
 *
 * Every change to a module or a question goes through the shared-content warning: cohorts cloned from
 * one another share their content, so the server previews which cohorts a change reaches and staff
 * confirm it (hooks/useSharedConfirm, dialogs/SharedContentDialog). Admins edit; teachers publish,
 * look at progress and issues, view questions and export them.
 *
 * Admins and teachers can import content from the bank library (components/bankLibrary): a whole
 * bank as new modules (the button in the module list) or topics and single questions into the open
 * module (Import in the questions header). An import runs on the server in the background; a strip at
 * the top shows it while it runs, and the module list and questions reload when it finishes.
 *
 * Still on Material UI, loaded only when opened: the question form, the bulk upload and the progress
 * table. The folder is organised by job: sidebar/, questions/, dialogs/, hooks/ (data and actions),
 * api/ (every request) and model/ (rules, no React).
 */
export default function CohortAdminPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isAdmin = user?.userType === 'admin';

  const { cohort, modules, loading, reload } = useStaffCohort(id);
  const { selected, selectModule, panel, setPanel, showPanel, view, setView } = useModuleSelection(modules);
  const questions = useModuleQuestions(id, selected);
  const imports = useCohortImports(id, {
    onSettled: (job) => {
      if (job.status === 'done') toast.success(`Import finished: ${jobSummary(job)}`);
      else if (job.status === 'cancelled') toast.info('The import was cancelled');
      else toast.warn(`The import stopped: ${jobSummary(job)}`);
      // The modules and questions it brought in
      reload();
      questions.reload();
    },
  });
  const shared = useSharedConfirm();
  const actions = useStaffActions({ id, cohort, shared, reload, reloadQuestions: questions.reload });

  const [moduleDrawer, setModuleDrawer] = useState(null); // { nonce, module } while open
  const [savingModule, setSavingModule] = useState(false);
  const [questionSheet, setQuestionSheet] = useState(null); // { module, question, form } while open
  const [uploadModule, setUploadModule] = useState(null); // the module receiving a JSON upload
  const [importDrawer, setImportDrawer] = useState(null); // { nonce, module, view } while open; a null module imports whole topics as new modules
  const [dismissedImport, setDismissedImport] = useState('');

  if (loading || !cohort) return <PageSkeleton />;

  const openImport = (module = null, view = 'pick') => setImportDrawer({ nonce: Date.now(), module, view });

  const retryImport = async () => {
    try {
      await imports.retry();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not retry the import'));
    }
  };

  const openModuleDrawer = (module = null) => setModuleDrawer({ nonce: Date.now(), module });

  const saveModule = async (form, extras) => {
    setSavingModule(true);
    const saved = await actions.saveModule(form, moduleDrawer.module);
    setSavingModule(false);
    if (!saved) return;
    setModuleDrawer(null);

    // A new module made from a library topic: its questions come in as a background import
    const topic = extras?.importTopic;
    if (topic && saved._id) {
      try {
        const job = await startImport(token, { cohortId: id, bankId: topic.bankId, topicIds: [topic.topicId], moduleId: saved._id });
        imports.adopt(job);
        toast.info(`Importing the questions of ${topic.topicName} in the background`);
      } catch (error) {
        toast.error(`The module was created, but its questions were not imported. ${apiMessage(error, 'Use Import in the module to try again.')}`);
      }
    }
  };

  const addQuestion = () => setQuestionSheet({ module: selected, question: null, form: emptyQuestionForm() });

  const editQuestion = async (question) => {
    const { form, question: full } = await actions.readQuestion(selected, question);
    setQuestionSheet({ module: selected, question: full, form });
  };

  const saveQuestion = async (data) => {
    const ok = await actions.saveQuestion(data, questionSheet.module, questionSheet.question);
    if (ok) setQuestionSheet(null);
  };

  const uploadFromForm = async (payload) => {
    const ok = await actions.uploadQuestions(payload, questionSheet.module._id);
    if (ok) setQuestionSheet(null);
  };

  const upload = async (payload) => {
    const ok = await actions.uploadQuestions(payload, uploadModule._id);
    if (ok) setUploadModule(null);
  };

  const isExam = cohort.mode === 'exam' || Boolean(cohort.examWindow?.isExam);

  let main;
  if (panel === 'progress') {
    main = (
      <Card as="section" flush aria-label="Progress of the cohort">
        <Suspense fallback={<Skeleton height={320} />}>
          <CohortProgress cohort={cohort} userProgress={cohort.userProgress} isAdmin populatedModules={modules} />
        </Suspense>
      </Card>
    );
  } else if (!selected) {
    main = (
      <Card as="section">
        <EmptyState icon={<StackIcon size={28} weight="regular" />} title="Select a module or add one" text={isAdmin ? 'Add a module from the list on the left to get started.' : 'This cohort has no modules yet.'} />
      </Card>
    );
  } else if (panel === 'notes') {
    main = <ModuleNotes module={selected} onBack={() => setPanel('questions')} />;
  } else {
    main = (
      // Keyed by the module, so the search and the filter start afresh when another module opens
      <StaffQuestionsPanel
        key={selected._id}
        cohortId={id}
        module={selected}
        questions={questions}
        isAdmin={isAdmin}
        onNotes={() => setPanel('notes')}
        onBack={() => setView('modules')}
        onAdd={addQuestion}
        onUpload={() => setUploadModule(selected)}
        onImport={() => openImport(selected)}
        onExport={() => actions.exportModule(selected)}
        onIssues={() => navigate(`/cohorts/${selected.cohort || id}/reports`)}
        onEdit={editQuestion}
        onDelete={(question) => actions.removeQuestion(selected, question)}
      />
    );
  }

  return (
    <div className="cdp" data-view={view}>
      {isExam ? (
        <div className="cdp-banner">
          <ExamBanner exam={cohort.examWindow} remainingMs={cohort.examWindow?.msRemaining} />
        </div>
      ) : null}

      <ImportBanner
        className="cdp-banner"
        job={imports.latest}
        dismissed={dismissedImport}
        onView={() => openImport(null, 'progress')}
        onRetry={retryImport}
        onDismiss={(job) => setDismissedImport(`${job.id}:${job.status}`)}
      />

      <div className="cdp-grid">
        <aside className="cdp-left" aria-label="Cohort and modules">
          <StaffSidebar
            cohort={cohort}
            panel={panel}
            onPanel={showPanel}
            busy={actions.busy}
            onTogglePublished={actions.togglePublished}
            modules={modules}
            selectedId={panel === 'questions' || panel === 'notes' ? selected?._id : undefined}
            onSelect={selectModule}
            canEdit={isAdmin}
            canImport
            onImport={() => openImport(null)}
            onAdd={() => openModuleDrawer()}
            onEdit={openModuleDrawer}
            onDelete={actions.removeModule}
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

      {moduleDrawer ? <ModuleDrawer key={moduleDrawer.nonce} module={moduleDrawer.module} order={modules.length} saving={savingModule} onClose={() => setModuleDrawer(null)} onSave={saveModule} /> : null}

      <QuestionSheet state={questionSheet} saving={actions.busy} cohortId={id} onClose={() => setQuestionSheet(null)} onSave={saveQuestion} onBulkUpload={uploadFromForm} />
      <BulkUploadSheet module={uploadModule} uploading={actions.busy} onClose={() => setUploadModule(null)} onUpload={upload} />

      {importDrawer ? <ImportDrawer key={importDrawer.nonce} cohortId={id} module={importDrawer.module} imports={imports} initialView={importDrawer.view} onClose={() => setImportDrawer(null)} /> : null}

      <SharedContentDialog dialog={shared.dialog} />
    </div>
  );
}
