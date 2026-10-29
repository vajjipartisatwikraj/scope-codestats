import React, { useMemo, useState } from 'react';
import { BroomIcon } from '@phosphor-icons/react/dist/csr/Broom';
import { BellSlashIcon } from '@phosphor-icons/react/dist/csr/BellSlash';
import { FunnelIcon } from '@phosphor-icons/react/dist/csr/Funnel';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Button, Card, Chip, ConfirmDialog, EmptyState, Notice, Page, PageHeader, Skeleton, SkeletonRows, formatNumber, pluralize } from '../ui';
import ComposeCard from './ComposeCard';
import NotificationTable from './NotificationTable';
import { FIELD_IDS, isGlobal } from './notificationFormat';
import useNotificationManagement from './useNotificationManagement';
import './notificationManagement.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'global', label: 'Every student' },
  { value: 'individual', label: 'One student' },
];

/**
 * Notification management (route /admin/notifications): staff write a notification, choose who gets
 * it, see how it will look and how many people receive it, and manage what was already sent.
 * design/screens.md section 14 (Admin compose) and section 16 (Admin management screens).
 *
 * Same API, headers, validation and role check as the page it replaces (see
 * useNotificationManagement); the audiences the server supports are every student and one student.
 */
export default function NotificationManagement() {
  const phone = useMediaQuery('(max-width: 899.95px)');
  const data = useNotificationManagement();
  const { notifications, users, usersReady, loading, loadError, stats } = data;

  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [toDelete, setToDelete] = useState(null);

  const rows = useMemo(
    () => notifications.filter((notification) => filter === 'all' || (filter === 'global' ? isGlobal(notification) : !isGlobal(notification))),
    [notifications, filter]
  );

  const firstLoad = loading && notifications.length === 0;
  const total = notifications.length;

  const confirmDelete = async () => {
    const ok = await data.remove(toDelete.id);
    if (!ok) return;
    if (editing && editing.id === toDelete.id) setEditing(null);
    setToDelete(null);
  };

  const focusTitle = () => {
    const field = document.getElementById(FIELD_IDS.title);
    if (field) field.focus();
  };

  const deleteDescription = toDelete
    ? isGlobal(toDelete)
      ? `It disappears from the notifications of ${toDelete.recipientCount ? pluralize(toDelete.recipientCount, 'person', 'people') : 'every student'}. This cannot be undone.`
      : `It disappears from ${toDelete.user?.name ? `${toDelete.user.name}'s` : "the student's"} notifications. This cannot be undone.`
    : '';

  const tiles = [
    { key: 'reach', label: 'Students you can reach', value: stats.reachable, context: 'Everyone with a student account', spotlight: true },
    { key: 'everyone', label: 'Sent to every student', value: stats.everyone, context: 'In the latest list' },
    { key: 'one', label: 'Sent to one student', value: stats.individual, context: 'In the latest list' },
    { key: 'expiring', label: 'Remove themselves', value: stats.expiring, context: 'Have an auto-delete time' },
  ];

  return (
    <Page className="nm-page">
      <PageHeader
        title="Notifications"
        count={firstLoad ? undefined : pluralize(total, 'notification')}
        description="Write an announcement for every student or a message for one, and manage what was sent."
        actions={
          <Button onClick={data.cleanup} loading={data.cleaning} startIcon={<BroomIcon size={18} weight="regular" aria-hidden="true" />}>
            Clean expired
          </Button>
        }
      />

      <section className="nm-stats" aria-label="Summary">
        {tiles.map((tile) => (
          <div key={tile.key} className="nm-stat" data-spotlight={tile.spotlight ? 'true' : 'false'}>
            <p className="nm-stat__label">{tile.label}</p>
            {firstLoad ? (
              <Skeleton width={72} height={36} radius="var(--ds-radius-sm)" />
            ) : (
              <p className="nm-stat__value">{formatNumber(tile.value)}</p>
            )}
            <p className="nm-stat__context">{tile.context}</p>
          </div>
        ))}
      </section>

      <ComposeCard
        users={users}
        studentCount={usersReady ? users.length : null}
        editing={editing}
        saving={data.saving}
        onSave={data.save}
        onCancelEdit={() => setEditing(null)}
      />

      <Card
        className="nm-history"
        flush
        title="Recent notifications"
        description="The 10 latest sent to every student and the 10 latest sent to one student."
        actions={
          total > 0 ? (
            <div className="ui-chips" role="group" aria-label="Show">
              {FILTERS.map((option) => (
                <Chip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
                  {option.label}
                </Chip>
              ))}
            </div>
          ) : null
        }
      >
        {firstLoad ? (
          <SkeletonRows count={5} height={44} />
        ) : loadError && total === 0 ? (
          <div className="nm-state">
            <Notice
              tone="danger"
              title="We could not load the notifications"
              action={
                <Button variant="ghost" onClick={data.reload}>
                  Retry
                </Button>
              }
            >
              Check your connection and try again. Nothing was changed.
            </Notice>
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<BellSlashIcon size={28} weight="regular" />}
            title="No notifications yet"
            text="Write your first announcement in the form above. It shows here once it is sent."
            action={<Button onClick={focusTitle}>Write a notification</Button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FunnelIcon size={28} weight="regular" />}
            title="Nothing matches this filter"
            text={`No notification was sent to ${filter === 'global' ? 'every student' : 'one student'} in the latest list.`}
            action={<Button onClick={() => setFilter('all')}>Clear filters</Button>}
          />
        ) : (
          <NotificationTable rows={rows} phone={phone} editingId={editing ? editing.id : null} onEdit={setEditing} onDelete={setToDelete} />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={toDelete ? `Delete "${toDelete.title}"?` : 'Delete notification?'}
        description={deleteDescription}
        confirmLabel="Delete notification"
        danger
        busy={data.removing}
        onConfirm={confirmDelete}
      />
    </Page>
  );
}
