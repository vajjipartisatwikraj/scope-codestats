import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import { publishSqlQuestion, toSqlErrorMessage } from '../../../../../services/sqlQuestionApi';
import * as api from '../api/staffCohortApi';
import { bulkErrorMessage, questionFormFrom } from '../model/staffContent';

const count = (result) => result?.affectedCohorts?.length || 0;

/**
 * Everything staff do to a cohort's content: publish or unpublish it, add, edit and delete modules
 * and questions, upload questions in bulk and export a module's questions. A change to content that
 * cohorts share is previewed first and goes on only after the staff member has seen which cohorts it
 * reaches (useSharedConfirm). Each action tells them how it went with a toast, reads the page again
 * after a change, and resolves true when it worked.
 *
 *   id              the cohort
 *   cohort          the cohort (for its draft state)
 *   shared          the result of useSharedConfirm
 *   reload()        reads the cohort and its modules again
 *   reloadQuestions()   reads the open module's questions again
 */
export default function useStaffActions({ id, cohort, shared, reload, reloadQuestions }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);

  /** Runs an action with `busy` on, so buttons can show it */
  const working = useCallback(async (action) => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  }, []);

  const togglePublished = useCallback(
    () =>
      working(async () => {
        try {
          await api.setDraft(token, id, !cohort.isDraft);
          toast.success(cohort.isDraft ? 'Cohort published successfully' : 'Cohort unpublished successfully');
          await reload();
          return true;
        } catch (error) {
          console.error('Error updating cohort:', error);
          toast.error('Failed to update cohort');
          return false;
        }
      }),
    [working, token, id, cohort, reload]
  );

  // ---- Modules ---------------------------------------------------------------------------------

  const saveModule = useCallback(
    (data, module) =>
      working(async () => {
        let preview;
        try {
          preview = await api.previewModule(token, id, data, module);
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to save module');
          return false;
        }
        const result = await shared.run(
          { action: module ? 'edit_module' : 'create_module', affectedCohorts: preview.affectedCohorts, details: { moduleName: data.title }, failMessage: module ? 'Failed to update module' : 'Failed to create module' },
          () => api.saveModule(token, id, data, module)
        );
        if (!result) return false;
        toast.success(module ? `Module updated across ${count(result)} cohort(s)` : `Module created and added to ${count(result)} cohort(s)`);
        await reload();
        // A new module comes back so the page can fill it (bank library import); an edit is just true
        return result.module || true;
      }),
    [working, token, id, shared, reload]
  );

  const removeModule = useCallback(
    (module) =>
      working(async () => {
        let preview;
        try {
          preview = await api.previewDeleteModule(token, id, module._id);
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete module');
          return false;
        }
        const result = await shared.run(
          {
            action: 'delete_module',
            affectedCohorts: preview.affectedCohorts,
            details: { moduleName: preview.module?.title || module.title, questionCount: preview.module?.questionCount },
            failMessage: 'Failed to delete module',
          },
          () => api.deleteModule(token, id, module._id)
        );
        if (!result) return false;
        toast.success('Module deleted successfully from all related cohorts');
        await reload();
        return true;
      }),
    [working, token, id, shared, reload]
  );

  // ---- Questions ---------------------------------------------------------------------------------

  /** The whole question for the form; if it cannot be read, the row's own fields stand in */
  const readQuestion = useCallback(
    (module, question) =>
      working(async () => {
        try {
          const full = await api.fetchQuestionForEdit(token, id, module._id, question._id);
          return { form: questionFormFrom(full), question: full };
        } catch (error) {
          console.error('Error fetching complete question data:', error);
          toast.error('Error loading question data. Please try again.');
          return { form: questionFormFrom(question), question };
        }
      }),
    [working, token, id]
  );

  const saveQuestion = useCallback(
    (data, module, question) =>
      working(async () => {
        const payload = { ...data, module: module._id };

        // A SQL question is published through its own endpoint: the SQL engine stores the schema,
        // seeds and expected output first, and only then is the question created here
        if (data.type === 'sql') {
          try {
            const created = await publishSqlQuestion(id, module._id, payload);
            toast.success(created.message || `SQL question published (${created.judgeQuestionId} v${created.judgeVersion})`);
            await reload();
            reloadQuestions();
            return true;
          } catch (error) {
            console.error('Error publishing SQL question:', error);
            toast.error(toSqlErrorMessage(error, 'Failed to publish the SQL question'));
            return false;
          }
        }

        let preview;
        try {
          preview = await api.previewQuestion(token, id, module._id, payload, question);
        } catch (error) {
          console.error('Preview error:', error);
          toast.error(error.response?.data?.message ? `Failed to save question: ${error.response.data.message}` : 'Failed to save question. Please try again later.');
          return false;
        }
        const result = await shared.run(
          {
            action: question ? 'edit_question' : 'create_question',
            affectedCohorts: preview.affectedCohorts,
            details: { questionTitle: data.title },
            failMessage: question ? 'Failed to update question' : 'Failed to create question',
          },
          () => api.saveQuestion(token, id, module._id, payload, question)
        );
        if (!result) return false;
        toast.success(question ? `Question updated across ${count(result)} cohort(s)` : `Question created and added to ${count(result)} cohort(s)`);
        await reload();
        reloadQuestions();
        return true;
      }),
    [working, token, id, shared, reload, reloadQuestions]
  );

  const removeQuestion = useCallback(
    (module, question) =>
      working(async () => {
        let preview;
        try {
          preview = await api.previewDeleteQuestion(token, id, module._id, question._id);
        } catch (error) {
          console.error('Error fetching delete preview:', error);
          toast.error(error.response?.data?.message || 'Failed to delete question');
          return false;
        }
        const result = await shared.run(
          { action: 'delete_question', affectedCohorts: preview.affectedCohorts, details: { questionTitle: question.title, questionCount: 1 }, failMessage: 'Failed to delete question' },
          () => api.deleteQuestion(token, id, module._id, question._id)
        );
        if (!result) return false;
        toast.success(`Question deleted from ${count(result)} cohort(s)`);
        await reload();
        reloadQuestions();
        return true;
      }),
    [working, token, id, shared, reload, reloadQuestions]
  );

  /** Uploads a batch of questions as one all-or-nothing change; resolves true when every question was created */
  const uploadQuestions = useCallback(
    (payload, moduleId) =>
      working(async () => {
        const total = Array.isArray(payload?.files) ? payload.files.reduce((sum, file) => sum + (Array.isArray(file.questions) ? file.questions.length : 0), 0) : 0;
        if (!moduleId || total === 0) {
          toast.error('No valid bulk upload batch or target module was provided');
          return false;
        }
        let preview;
        try {
          preview = await api.previewBulk(token, id, moduleId, payload);
        } catch (error) {
          console.error('Error in bulk question upload:', error);
          toast.error(bulkErrorMessage(error), { style: { whiteSpace: 'pre-line' } });
          return false;
        }
        const result = await shared.run(
          { action: 'bulk_create_questions', affectedCohorts: preview.affectedCohorts, details: { questionCount: total, moduleName: preview.module?.title || 'Module' }, onError: (error) => toast.error(bulkErrorMessage(error), { style: { whiteSpace: 'pre-line' } }) },
          async () => {
            const response = await api.bulkUpload(token, id, moduleId, payload);
            const failed = response.failed || 0;
            // The batch is atomic: anything short of every question created is a failure
            if (response.success === false || failed > 0 || (Number.isFinite(response.created) && response.created !== total)) {
              const incomplete = new Error('Atomic bulk upload did not create the complete batch');
              incomplete.response = { data: response };
              throw incomplete;
            }
            return response;
          }
        );
        if (!result) return false;
        toast.success(`${total} question(s) uploaded successfully across ${count(result)} cohort(s)`);
        await reload();
        reloadQuestions();
        return true;
      }),
    [working, token, id, shared, reload, reloadQuestions]
  );

  /** Downloads a module's questions as a JSON file */
  const exportModule = useCallback(
    async (module) => {
      try {
        const data = await api.exportQuestions(token, id, module._id);
        const url = URL.createObjectURL(new Blob([JSON.stringify({ questions: data.questions }, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(data.moduleName || 'module').replace(/[^a-zA-Z0-9]/g, '_')}_questions.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Export failed:', error);
        toast.error('Could not export the questions');
      }
    },
    [token, id]
  );

  return { busy, togglePublished, saveModule, removeModule, readQuestion, saveQuestion, removeQuestion, uploadQuestions, exportModule };
}
