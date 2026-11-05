import React, { Suspense, lazy } from 'react';
import { Skeleton } from '../../ui';
import Sheet from '../../cohorts/staff/detail/dialogs/Sheet';

// The question form is the cohort's own Material UI form, loaded only when a question is opened
const QuestionForm = lazy(() => import('../../cohort/QuestionForm'));

/**
 * The sheet that holds the question form for a question of the bank library: a new one, or one being
 * edited. It is the same form cohorts use (the library keeps questions in the cohort question format),
 * with the Import tab switched off.
 *
 *   state    null when closed, else { topicName, question, form }; `form` is null while the question
 *            is still being read
 *   saving   a save or an upload is running
 *   onClose(), onSave(data)
 *   onBulkUpload(payload)   the form's Bulk upload tab
 */
export default function QuestionEditorSheet({ state, saving, onClose, onSave, onBulkUpload }) {
  const editing = Boolean(state?.question);
  return (
    <Sheet open={Boolean(state)} onClose={onClose} busy={saving} title={editing ? 'Edit question' : 'Add question'} description={state?.topicName}>
      {state ? (
        state.form ? (
          <Suspense fallback={<Skeleton height={320} />}>
            <QuestionForm
              key={`library-question-${state.question?.id || 'new'}`}
              initialData={state.form}
              onSave={onSave}
              onCancel={onClose}
              isEdit={editing}
              onBulkUpload={onBulkUpload}
              bulkUploading={saving}
              libraryImport={false}
            />
          </Suspense>
        ) : (
          <Skeleton height={320} />
        )
      ) : null}
    </Sheet>
  );
}
