import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/csr/EyeSlash';
import { FolderSimpleIcon } from '@phosphor-icons/react/dist/csr/FolderSimple';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { AdminTop, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Menu, Notice, SkeletonRows, pluralize } from '../../ui';
import { useAuth } from '../../../contexts/AuthContext';
import * as api from '../api/bankLibraryApi';
import BankDrawer from '../forms/BankDrawer';
import TopicDrawer from '../forms/TopicDrawer';
import useLibraryRequest from '../hooks/useLibraryRequest';
import { apiMessage, bankStatusInfo, countOf } from '../model/bankLibrary';
import { LIBRARY_PATH, LibraryRow, RowMenu } from './LibraryParts';

/**
 * The second level (route /admin/bank-library/:bankId): one bank and its topics, in the order they
 * become modules. A topic opens to its questions. Admins edit the bank, change its status, delete
 * it, and add, edit and delete topics.
 */
export default function BankView({ bankId }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const bank = useLibraryRequest(() => api.getBank(token, bankId), [token, bankId]);
  const data = bank.data;

  const [bankDrawer, setBankDrawer] = useState(null); // { nonce } while open
  const [topicDrawer, setTopicDrawer] = useState(null); // { nonce, topic } while open; topic is null for a new one
  const [saving, setSaving] = useState(false);
  const [deleteBank, setDeleteBank] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const run = async (action, failure) => {
    setSaving(true);
    try {
      await action();
      return true;
    } catch (error) {
      toast.error(apiMessage(error, failure));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async (payload) => {
    const ok = await run(() => api.updateBank(token, bankId, payload), 'Could not save the bank');
    if (ok) {
      toast.success('Bank saved');
      setBankDrawer(null);
      bank.reload();
    }
  };

  const toggleStatus = async () => {
    const next = data.status === 'published' ? 'draft' : 'published';
    const ok = await run(() => api.updateBank(token, bankId, { status: next }), 'Could not change the status');
    if (ok) {
      toast.success(next === 'published' ? 'Published. Teachers can import this bank.' : 'Back to a draft. Only administrators can see it.');
      bank.reload();
    }
  };

  const openTopic = async (topic) => {
    // The notes and resources are not in the list, so the editor reads the whole topic first
    if (!topic) return setTopicDrawer({ nonce: Date.now(), topic: null });
    try {
      const full = await api.getTopic(token, bankId, topic.id);
      setTopicDrawer({ nonce: Date.now(), topic: full });
    } catch (error) {
      toast.error(apiMessage(error, 'Could not open the topic'));
    }
  };

  const saveTopic = async (form) => {
    const editing = topicDrawer.topic;
    const ok = await run(() => (editing ? api.updateTopic(token, bankId, editing.id, form) : api.createTopic(token, bankId, form)), 'Could not save the topic');
    if (ok) {
      toast.success(editing ? 'Topic saved' : 'Topic added');
      setTopicDrawer(null);
      bank.reload();
    }
  };

  const confirmDeleteTopic = async () => {
    setDeleting(true);
    try {
      await api.deleteTopic(token, bankId, topicToDelete.id);
      toast.success(`${topicToDelete.name} was moved to the trash`);
      setTopicToDelete(null);
      bank.reload();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete the topic'));
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteBank = async () => {
    setDeleting(true);
    try {
      await api.deleteBank(token, bankId);
      toast.success(`${data.name} was moved to the trash`);
      navigate(LIBRARY_PATH);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete the bank'));
      setDeleting(false);
    }
  };

  if (bank.loading && !data) {
    return (
      <>
        <AdminTop crumbs={[{ label: 'Bank library', to: LIBRARY_PATH }, { label: 'Loading' }]} title="Bank" />
        <SkeletonRows count={4} height={76} />
      </>
    );
  }

  if (bank.error || !data) {
    return (
      <>
        <AdminTop crumbs={[{ label: 'Bank library', to: LIBRARY_PATH }, { label: 'Bank' }]} title="Bank" />
        <Notice
          tone="danger"
          title="This bank did not load"
          action={
            <Button variant="ghost" size="sm" onClick={bank.reload}>
              Retry
            </Button>
          }
        >
          {apiMessage(bank.error, 'It may have been deleted.')}
        </Notice>
      </>
    );
  }

  const status = bankStatusInfo(data.status);
  const topicWord = pluralize(data.topics.length, 'topic');

  return (
    <>
      <AdminTop
          crumbs={[{ label: 'Bank library', to: LIBRARY_PATH }, { label: data.name }]}
          title={data.name}
          count={`${topicWord} \u00b7 ${countOf(data.questionCount, 'question')}`}
          description={data.description || 'No description yet.'}
          actions={
            <>
              <Badge tone={status.tone}>{status.label}</Badge>
              <Menu
                label="Actions for this bank"
                align="end"
                items={[
                  { key: 'edit', label: 'Edit bank', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => setBankDrawer({ nonce: Date.now() }) },
                  {
                    key: 'status',
                    label: data.status === 'published' ? 'Make a draft' : 'Publish',
                    hint: data.status === 'published' ? 'Teachers can no longer see it' : 'Teachers can import it',
                    icon: data.status === 'published' ? <EyeSlashIcon size={20} weight="regular" /> : <EyeIcon size={20} weight="regular" />,
                    onSelect: toggleStatus,
                  },
                  { key: 'delete', label: 'Delete bank', tone: 'danger', icon: <TrashIcon size={20} weight="regular" />, onSelect: () => setDeleteBank(true) },
                ]}
                trigger={({ props }) => (
                  <IconButton label="Actions for this bank" {...props}>
                    <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
                  </IconButton>
                )}
              />
              <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => openTopic(null)}>
                Add topic
              </Button>
            </>
          }
        />

      <Card flush className="bl-card">
        {data.topics.length === 0 ? (
          <EmptyState
            icon={<FolderSimpleIcon size={28} weight="regular" />}
            title="No topics yet"
            text="A topic becomes a module when this bank is imported into a cohort. Add the first one, then fill it with questions."
            action={
              <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => openTopic(null)}>
                Add topic
              </Button>
            }
          />
        ) : (
          <ul className="bl-rows" aria-label={`Topics of ${data.name}`}>
            {data.topics.map((topic) => (
              <LibraryRow
                key={topic.id}
                title={topic.name}
                description={topic.description}
                meta={countOf(topic.questionCount, 'question')}
                openLabel={`Open ${topic.name}`}
                onOpen={() => navigate(`${LIBRARY_PATH}/${bankId}/${topic.id}`)}
                menu={
                  <RowMenu
                    label={`Actions for ${topic.name}`}
                    items={[
                      { key: 'edit', label: 'Edit topic', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => openTopic(topic) },
                      { key: 'delete', label: 'Delete topic', tone: 'danger', icon: <TrashIcon size={20} weight="regular" />, onSelect: () => setTopicToDelete(topic) },
                    ]}
                  />
                }
              />
            ))}
          </ul>
        )}
      </Card>

      {bankDrawer ? <BankDrawer key={bankDrawer.nonce} bank={data} saving={saving} onClose={() => setBankDrawer(null)} onSave={saveBank} /> : null}
      {topicDrawer ? <TopicDrawer key={topicDrawer.nonce} topic={topicDrawer.topic} saving={saving} onClose={() => setTopicDrawer(null)} onSave={saveTopic} /> : null}

      <ConfirmDialog
        open={Boolean(topicToDelete)}
        onClose={() => !deleting && setTopicToDelete(null)}
        busy={deleting}
        danger
        title={topicToDelete ? `Delete ${topicToDelete.name}?` : 'Delete topic?'}
        description={topicToDelete ? `Its ${countOf(topicToDelete.questionCount, 'question')} move to the trash of the bucket. Cohorts that already imported this topic keep their copies.` : ''}
        confirmLabel="Delete topic"
        onConfirm={confirmDeleteTopic}
      />
      <ConfirmDialog
        open={deleteBank}
        onClose={() => !deleting && setDeleteBank(false)}
        busy={deleting}
        danger
        title={`Delete ${data.name}?`}
        description={`Its ${topicWord} and ${countOf(data.questionCount, 'question')} move to the trash of the bucket and leave the library. Cohorts that already imported from it keep their copies.`}
        confirmLabel="Delete bank"
        onConfirm={confirmDeleteBank}
      />
    </>
  );
}
