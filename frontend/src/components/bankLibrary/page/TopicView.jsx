import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { QuestionIcon } from '@phosphor-icons/react/dist/csr/Question';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { AdminTop, Badge, Button, Card, ConfirmDialog, EmptyState, Notice, SearchField, SelectField, SkeletonRows, pluralize } from '../../ui';
import { useAuth } from '../../../contexts/AuthContext';
import { emptyQuestionForm, questionFormFrom } from '../../cohorts/staff/detail/model/staffContent';
import * as api from '../api/bankLibraryApi';
import QuestionEditorSheet from '../forms/QuestionEditorSheet';
import TopicDrawer from '../forms/TopicDrawer';
import useDebounced from '../hooks/useDebounced';
import useLibraryRequest from '../hooks/useLibraryRequest';
import { DIFFICULTY_TONE, TYPE_LABEL, apiMessage, difficultyLabel } from '../model/bankLibrary';
import { LIBRARY_PATH, LibraryRow, RowMenu } from './LibraryParts';

const DIFFICULTIES = [
  { value: 'all', label: 'All difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

/**
 * The third level (route /admin/bank-library/:bankId/:topicId): the questions of a topic, in the
 * order they are imported. Admins add questions one at a time or upload a JSON file of many (the
 * question form's Bulk upload tab), edit and delete them, and edit the topic itself.
 *
 * Questions are kept in the cohort question format, so the form is the cohort's own question form.
 * SQL questions are not part of the library.
 */
export default function TopicView({ bankId, topicId }) {
  const { token } = useAuth();
  const bank = useLibraryRequest(() => api.getBank(token, bankId), [token, bankId]);
  const topic = useLibraryRequest(() => api.getTopic(token, bankId, topicId), [token, bankId, topicId]);

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const query = useDebounced(search.trim(), 250);
  const questions = useLibraryRequest(
    () => api.listQuestions(token, bankId, topicId, { search: query || undefined, difficulty: difficulty === 'all' ? undefined : difficulty }),
    [token, bankId, topicId, query, difficulty]
  );

  const [editor, setEditor] = useState(null); // { topicName, question, form } while the question sheet is open
  const [topicDrawer, setTopicDrawer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = questions.data || [];
  const filtering = Boolean(query) || difficulty !== 'all';
  const topicName = topic.data?.name || 'Topic';

  const refresh = () => {
    questions.reload();
    topic.reload();
    bank.reload();
  };

  const openNew = () => setEditor({ topicName, question: null, form: emptyQuestionForm() });

  const openEdit = async (summary) => {
    setEditor({ topicName, question: summary, form: null });
    try {
      const full = await api.getQuestion(token, bankId, topicId, summary.id);
      setEditor({ topicName, question: full, form: questionFormFrom(full) });
    } catch (error) {
      toast.error(apiMessage(error, 'Could not open the question'));
      setEditor(null);
    }
  };

  const saveQuestion = async (data) => {
    setSaving(true);
    try {
      if (editor.question) {
        await api.updateQuestion(token, bankId, topicId, editor.question.id, data);
        toast.success('Question saved');
      } else {
        await api.createQuestion(token, bankId, topicId, data);
        toast.success('Question added');
      }
      setEditor(null);
      refresh();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the question'), { style: { whiteSpace: 'pre-line' } });
    } finally {
      setSaving(false);
    }
  };

  const uploadQuestions = async (payload) => {
    setSaving(true);
    try {
      const result = await api.bulkUploadQuestions(token, bankId, topicId, payload);
      toast.success(`${pluralize(result.created, 'question')} added`);
      setEditor(null);
      refresh();
      return true;
    } catch (error) {
      toast.error(apiMessage(error, 'Could not upload the questions'), { style: { whiteSpace: 'pre-line' } });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveTopic = async (form) => {
    setSaving(true);
    try {
      await api.updateTopic(token, bankId, topicId, form);
      toast.success('Topic saved');
      setTopicDrawer(null);
      refresh();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the topic'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteQuestion(token, bankId, topicId, toDelete.id);
      toast.success('Question moved to the trash');
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete the question'));
    } finally {
      setDeleting(false);
    }
  };

  const crumbs = [{ label: 'Bank library', to: LIBRARY_PATH }, { label: bank.data?.name || 'Bank', to: `${LIBRARY_PATH}/${bankId}` }, { label: topicName }];

  if (topic.error) {
    return (
      <>
        <AdminTop crumbs={crumbs} title={topicName} />
        <Notice
          tone="danger"
          title="This topic did not load"
          action={
            <Button variant="ghost" size="sm" onClick={topic.reload}>
              Retry
            </Button>
          }
        >
          {apiMessage(topic.error, 'It may have been deleted.')}
        </Notice>
      </>
    );
  }

  let body;
  if (questions.loading && !questions.data) {
    body = <SkeletonRows count={5} height={76} />;
  } else if (questions.error) {
    body = (
      <Notice
        tone="danger"
        title="The questions did not load"
        action={
          <Button variant="ghost" size="sm" onClick={questions.reload}>
            Retry
          </Button>
        }
      >
        {apiMessage(questions.error, 'Check your connection and try again.')}
      </Notice>
    );
  } else if (list.length === 0 && filtering) {
    body = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No question matches"
        text="Try another search or a different difficulty."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSearch('');
              setDifficulty('all');
            }}
          >
            Clear filters
          </Button>
        }
      />
    );
  } else if (list.length === 0) {
    body = (
      <EmptyState
        icon={<QuestionIcon size={28} weight="regular" />}
        title="No questions yet"
        text="Add questions one at a time, or upload a JSON file of many from the Bulk upload tab of the question form."
        action={
          <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={openNew}>
            Add question
          </Button>
        }
      />
    );
  } else {
    body = (
      <ul className="bl-rows" aria-label={`Questions in ${topicName}`}>
        {list.map((question) => (
          <LibraryRow
            key={question.id}
            title={question.title}
            meta={[TYPE_LABEL[question.type] || question.type, question.marks ? `${question.marks} marks` : null, question.tags.length ? question.tags.join(', ') : null].filter(Boolean).join(' \u00b7 ')}
            badges={<Badge tone={DIFFICULTY_TONE[question.difficultyLevel] || 'neutral'}>{difficultyLabel(question.difficultyLevel)}</Badge>}
            openLabel={`Edit ${question.title}`}
            onOpen={() => openEdit(question)}
            menu={
              <RowMenu
                label={`Actions for ${question.title}`}
                items={[
                  { key: 'edit', label: 'Edit question', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => openEdit(question) },
                  { key: 'delete', label: 'Delete question', tone: 'danger', icon: <TrashIcon size={20} weight="regular" />, onSelect: () => setToDelete(question) },
                ]}
              />
            }
          />
        ))}
      </ul>
    );
  }

  return (
    <>
      <AdminTop
        crumbs={crumbs}
        title={topicName}
        count={topic.data ? pluralize(topic.data.questionCount, 'question') : undefined}
        description={topic.data?.description || 'No description yet.'}
        actions={
          <>
            <Button startIcon={<PencilSimpleIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => setTopicDrawer({ nonce: Date.now() })} disabled={!topic.data}>
              Edit topic
            </Button>
            <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={openNew}>
              Add question
            </Button>
          </>
        }
        label="Search and filter questions"
        search={<SearchField value={search} onChange={setSearch} placeholder="Search questions" label="Search questions by title or tag" />}
        filters={<SelectField variant="pill" aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} options={DIFFICULTIES} />}
      />
      <Card flush className="bl-card" aria-busy={questions.loading ? 'true' : 'false'}>
        {body}
      </Card>

      <QuestionEditorSheet state={editor} saving={saving} onClose={() => setEditor(null)} onSave={saveQuestion} onBulkUpload={uploadQuestions} />
      {topicDrawer && topic.data ? <TopicDrawer key={topicDrawer.nonce} topic={topic.data} saving={saving} onClose={() => setTopicDrawer(null)} onSave={saveTopic} /> : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        busy={deleting}
        danger
        title="Delete this question?"
        description={toDelete ? `\u201c${toDelete.title}\u201d moves to the trash of the bucket and leaves the library. Cohorts that already imported it keep their copy.` : ''}
        confirmLabel="Delete question"
        onConfirm={confirmDelete}
      />
    </>
  );
}
