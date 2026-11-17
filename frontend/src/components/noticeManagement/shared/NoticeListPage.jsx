import React, { useMemo, useState } from 'react';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { AdminCardGrid, AdminListCardSkeleton, AdminTop, Button, ConfirmDialog, EmptyState, Notice, Page, SearchField, SelectField, pluralize } from '../../ui';
import useAutoHideScrollbars from '../../../hooks/useAutoHideScrollbars';
import { STATUS_FILTERS } from './noticeFormat';
import useNoticeList from './useNoticeList';
import './noticeManagement.css';

const SKELETON_CARDS = 6;

/**
 * The management screen both alerts and announcements use: the admin top (title, count, tagline, the
 * create button, a search and a status dropdown), a card per notice, and the create and edit drawer.
 * Switching on or off happens from the card's menu; deleting asks first. The two screens differ only in
 * what they pass in.
 *
 *   api, noun          see useNoticeList
 *   title, description the heading and its one-line tagline
 *   createLabel        the primary button ("Create alert")
 *   searchLabel        the accessible name of the search ("Search alerts by message")
 *   searchTextOf(item) the text the search looks in
 *   empty              { icon, title, text } for a list with nothing in it
 *   Card               a component for one notice: { item, busy, onEdit, onToggle, onDelete }
 *   FormDrawer         the create and edit drawer: { item, saving, onClose, onSave(form, id) -> Promise<boolean> }
 *   confirmDelete(item)  { title, description } for the delete dialog
 */
export default function NoticeListPage({ api, noun, title, description, createLabel, searchLabel, searchTextOf, empty, Card, FormDrawer, confirmDelete }) {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const data = useNoticeList(api, noun);
  const { items, loading, failed, busyId } = data;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [drawer, setDrawer] = useState(null); // { nonce, item } while open; a new nonce gives the form a fresh start
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => (status === 'all' || item.status === status) && (!term || searchTextOf(item).toLowerCase().includes(term)));
  }, [items, search, status, searchTextOf]);

  const filtered = search.trim() !== '' || status !== 'all';
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
  };

  const openDrawer = (item = null) => setDrawer({ nonce: Date.now(), item });

  const save = async (form, id) => {
    setSaving(true);
    const ok = await data.save(form, id);
    setSaving(false);
    if (ok) setDrawer(null);
    return ok;
  };

  const confirmRemove = async () => {
    setDeleting(true);
    const ok = await data.remove(toDelete);
    setDeleting(false);
    if (ok) setToDelete(null);
  };

  let body;
  if (loading) {
    body = (
      <ul className="ui-grid alc-grid" role="status" aria-label={`Loading ${noun.many}`}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <li key={index} className="alc-grid__item">
            <AdminListCardSkeleton />
          </li>
        ))}
      </ul>
    );
  } else if (failed && items.length === 0) {
    body = (
      <Notice
        tone="danger"
        title={`The ${noun.many} did not load`}
        action={
          <Button variant="ghost" size="sm" onClick={data.reload}>
            Retry
          </Button>
        }
      >
        Check your connection and try again.
      </Notice>
    );
  } else if (items.length === 0) {
    body = <EmptyState icon={empty.icon} title={empty.title} text={empty.text} />;
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title={`No ${noun.many} match`}
        text="Nothing fits these filters. Try a different search or status."
        action={
          filtered ? (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      />
    );
  } else {
    body = (
      <AdminCardGrid label={noun.many}>
        {visible.map((item) => (
          <Card key={item._id} item={item} busy={busyId === item._id} onEdit={openDrawer} onToggle={data.toggle} onDelete={setToDelete} />
        ))}
      </AdminCardGrid>
    );
  }

  const del = toDelete ? confirmDelete(toDelete) : { title: `Delete this ${noun.one}?`, description: '' };

  return (
    <Page className="nm">
      <AdminTop
        title={title}
        count={!loading && items.length > 0 ? pluralize(items.length, noun.one) : undefined}
        description={description}
        actions={
          <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => openDrawer()}>
            {createLabel}
          </Button>
        }
        label={`Search and filter ${noun.many}`}
        search={<SearchField value={search} onChange={setSearch} placeholder={`Search ${noun.many}`} label={searchLabel} />}
        filters={<SelectField variant="pill" aria-label="Show status" value={status} onChange={(event) => setStatus(event.target.value)} options={STATUS_FILTERS} />}
      />

      {body}

      {drawer ? <FormDrawer key={drawer.nonce} item={drawer.item} saving={saving} onClose={() => !saving && setDrawer(null)} onSave={save} /> : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        busy={deleting}
        danger
        title={del.title}
        description={del.description}
        confirmLabel={`Delete ${noun.one}`}
        onConfirm={confirmRemove}
      />
    </Page>
  );
}
