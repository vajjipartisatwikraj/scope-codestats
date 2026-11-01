import React, { Suspense, lazy } from 'react';
import { Skeleton } from '../../../../ui';
import Sheet from './Sheet';

// The question form and the bulk upload are the two forms of this page still on Material UI. They are
// loaded only when one is opened, so the page itself carries none of it.
const QuestionForm = lazy(() => import('../../../../cohort/QuestionForm'));
const BulkQuestionUpload = lazy(() => import('../../../../cohort/BulkQuestionUpload'));

const Loading = () => <Skeleton height={320} />;

/**
 * The sheet that holds the question form, for a new question or one being edited.
 *
 *   state       { module, question, form } while open, else null. `question` is null for a new one.
 *   saving      a save or an upload is running
 *   cohortId
 *   onClose()
 *   onSave(data)      the form's save
 *   onBulkUpload(payload)   the form's own "upload as JSON" tab
 */
export function QuestionSheet({ state, saving, cohortId, onClose, onSave, onBulkUpload }) {
  return (
    <Sheet open={Boolean(state)} onClose={onClose} busy={saving} title={state?.question ? 'Edit question' : 'Add question'} description={state?.module ? state.module.title : undefined}>
      {state ? (
        <Suspense fallback={<Loading />}>
          <QuestionForm
            key={`question-form-${state.question?._id || 'new'}`}
            initialData={state.form}
            onSave={onSave}
            onCancel={onClose}
            moduleId={state.module._id}
            cohortId={cohortId}
            isEdit={Boolean(state.question)}
            onBulkUpload={onBulkUpload}
            bulkUploading={saving}
          />
        </Suspense>
      ) : null}
    </Sheet>
  );
}

/**
 * The sheet for uploading questions as JSON files into a module.
 *
 *   module      the module that receives them; null when closed
 *   uploading   an upload is running
 *   onClose(), onUpload(payload)
 */
export function BulkUploadSheet({ module, uploading, onClose, onUpload }) {
  return (
    <Sheet open={Boolean(module)} onClose={onClose} busy={uploading} title="Upload questions" description={module ? `They are added to ${module.title}.` : undefined}>
      {module ? (
        <Suspense fallback={<Loading />}>
          <BulkQuestionUpload onUpload={onUpload} onCancel={onClose} loading={uploading} />
        </Suspense>
      ) : null}
    </Sheet>
  );
}
