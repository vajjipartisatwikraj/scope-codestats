import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/csr/EyeSlash';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { AdminTop, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Menu, Notice, PillTabs, SearchField, SkeletonRows, formatDate, pluralize } from '../../ui';
import { useAuth } from '../../../contexts/AuthContext';
import * as api from '../api/bankLibraryApi';
import BankDrawer from '../forms/BankDrawer';
import useDebounced from '../hooks/useDebounced';
import useLibraryRequest from '../hooks/useLibraryRequest';
import { apiMessage, bankStatusInfo, countOf } from '../model/bankLibrary';
import { LIBRARY_PATH, LibraryRow, RowMenu } from './LibraryParts';

const TABS = [
  { key: 'all', label: 'All banks' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
];

/**
 * The first level of the bank library (route /admin/bank-library): every bank, with a search and a
 * filter by status. A bank opens to its topics. Admins create banks here, change their status, edit
 * and delete them, and rebuild the index.
 */
export default function BanksView() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim(), 250);

  const banks = useLibraryRequest(() => api.listBanks(token, { search: query || undefined, status: tab === 'all' ? undefined : tab }), [token, query, tab]);
  const [drawer, setDrawer] = useState(null); // { nonce, bank } while open
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const list = banks.data || [];

  const save = async (payload) => {
    setSaving(true);
    try {
      if (drawer.bank) {
        await api.updateBank(token, drawer.bank.id, payload);
        toast.success('Bank saved');
      } else {
        const created = await api.createBank(token, payload);
        toast.success('Bank created. Add its first topic next.');
        setDrawer(null);
        navigate(`${LIBRARY_PATH}/${created.id}`);
        return;
      }
      setDrawer(null);
      banks.reload();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the bank'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (bank) => {
    const next = bank.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateBank(token, bank.id, { status: next });
      toast.success(next === 'published' ? `${bank.name} is published. Teachers can import it.` : `${bank.name} is a draft again. Only administrators can see it.`);
      banks.reload();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not change the status'));
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteBank(token, toDelete.id);
      toast.success(`${toDelete.name} was moved to the trash`);
      setToDelete(null);
      banks.reload();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete the bank'));
    } finally {
      setDeleting(false);
    }
  };

  const rebuild = async () => {
    setReindexing(true);
    try {
      const summary = await api.reindex(token);
      toast.success(`Index rebuilt: ${countOf(summary.banks, 'bank')}, ${countOf(summary.topics, 'topic')}, ${countOf(summary.questions, 'question')}`);
      banks.reload();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not rebuild the index'));
    } finally {
      setReindexing(false);
    }
  };

  let body;
  if (banks.loading && !banks.data) {
    body = <SkeletonRows count={5} height={76} />;
  } else if (banks.error) {
    body = (
      <Notice
        tone="danger"
        title="The banks did not load"
        action={
          <Button variant="ghost" size="sm" onClick={banks.reload}>
            Retry
          </Button>
        }
      >
        {apiMessage(banks.error, 'Check your connection and try again.')}
      </Notice>
    );
  } else if (list.length === 0) {
    const filtered = Boolean(query) || tab !== 'all';
    body = (
      <EmptyState
        icon={<BooksIcon size={28} weight="regular" />}
        title={filtered ? 'No bank matches' : 'No banks yet'}
        text={filtered ? 'Try another search, or look at all banks.' : 'Create a bank, add topics to it, then fill them with questions. Teachers import published banks into their cohorts.'}
        action={
          filtered ? (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setTab('all');
              }}
            >
              Clear filters
            </Button>
          ) : (
            <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setDrawer({ nonce: Date.now(), bank: null })}>
              Create bank
            </Button>
          )
        }
      />
    );
  } else {
    body = (
      <ul className="bl-rows" aria-label="Banks">
        {list.map((bank) => {
          const status = bankStatusInfo(bank.status);
          return (
            <LibraryRow
              key={bank.id}
              title={bank.name}
              description={bank.description}
              meta={`${countOf(bank.topicCount, 'topic')} \u00b7 ${countOf(bank.questionCount, 'question')} \u00b7 updated ${formatDate(bank.updatedAt)}`}
              badges={<Badge tone={status.tone}>{status.label}</Badge>}
              openLabel={`Open ${bank.name}`}
              onOpen={() => navigate(`${LIBRARY_PATH}/${bank.id}`)}
              menu={
                <RowMenu
                  label={`Actions for ${bank.name}`}
                  items={[
                    { key: 'edit', label: 'Edit bank', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => setDrawer({ nonce: Date.now(), bank }) },
                    {
                      key: 'status',
                      label: bank.status === 'published' ? 'Make a draft' : 'Publish',
                      hint: bank.status === 'published' ? 'Teachers can no longer see it' : 'Teachers can import it',
                      icon: bank.status === 'published' ? <EyeSlashIcon size={20} weight="regular" /> : <EyeIcon size={20} weight="regular" />,
                      onSelect: () => toggleStatus(bank),
                    },
                    { key: 'delete', label: 'Delete bank', tone: 'danger', icon: <TrashIcon size={20} weight="regular" />, onSelect: () => setToDelete(bank) },
                  ]}
                />
              }
            />
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <AdminTop
          title="Bank library"
          count={banks.data && !query && tab === 'all' ? pluralize(list.length, 'bank') : undefined}
          description="Question banks that teachers import into their cohorts."
          actions={
            <>
              <Menu
                label="More actions"
                align="end"
                items={[
                  {
                    key: 'reindex',
                    label: 'Rebuild index',
                    hint: 'Use it after files were changed in the bucket by hand',
                    icon: <ArrowsClockwiseIcon size={20} weight="regular" />,
                    disabled: reindexing,
                    onSelect: rebuild,
                  },
                ]}
                trigger={({ props }) => (
                  <IconButton label="More actions" {...props}>
                    <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
                  </IconButton>
                )}
              />
              <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setDrawer({ nonce: Date.now(), bank: null })}>
                Create bank
              </Button>
            </>
          }
          label="Search and filter banks"
          search={<SearchField value={search} onChange={setSearch} placeholder="Search banks" label="Search banks by name, description or tag" />}
          filters={<PillTabs items={TABS} value={tab} onChange={setTab} label="Show banks" role="radiogroup" />}
        />

      <Card flush className="bl-card" aria-busy={banks.loading ? 'true' : 'false'}>
        {body}
      </Card>

      {drawer ? <BankDrawer key={drawer.nonce} bank={drawer.bank} saving={saving} onClose={() => setDrawer(null)} onSave={save} /> : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        busy={deleting}
        danger
        title={toDelete ? `Delete ${toDelete.name}?` : 'Delete bank?'}
        description={
          toDelete ? `Its ${countOf(toDelete.topicCount, 'topic')} and ${countOf(toDelete.questionCount, 'question')} move to the trash of the bucket and leave the library. Cohorts that already imported from it keep their copies.` : ''
        }
        confirmLabel="Delete bank"
        onConfirm={confirmDelete}
      />
    </>
  );
}
