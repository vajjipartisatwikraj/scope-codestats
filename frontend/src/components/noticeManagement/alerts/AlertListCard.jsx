import React from 'react';
import { AdminListCard } from '../../ui';
import NoticeStatusBadge from '../shared/NoticeStatusBadge';
import { EditAction, closedFigure, commonFacts, noticeMenuItems } from '../shared/noticeCardParts';

const TITLE_LIMIT = 90;

const shorten = (text) => (text.length > TITLE_LIMIT ? `${text.slice(0, TITLE_LIMIT - 1).trimEnd()}\u2026` : text);

/**
 * One alert on the management list, as the kit's AdminListCard: its status, the message, whether it
 * has a button, how many people closed it (the figure), its window and how many pressed the button.
 * The menu has Edit, Switch on or off and Delete.
 *
 *   item                         an alert of GET /admin/alerts
 *   busy                         it is being switched or deleted: the menu waits
 *   onEdit, onToggle, onDelete   (alert) => void
 */
export default function AlertListCard({ item, busy, onEdit, onToggle, onDelete }) {
  return (
    <AdminListCard
      badge={<NoticeStatusBadge status={item.status} />}
      menuLabel="Actions for this alert"
      menuItems={noticeMenuItems(item, { onEdit, onToggle, onDelete })}
      menuDisabled={busy}
      title={shorten(item.message)}
      description={item.buttonText ? `Button: ${item.buttonText}` : ''}
      emptyDescription="No button"
      figure={closedFigure(item)}
      facts={commonFacts(item)}
      action={<EditAction item={item} label="Edit this alert" onEdit={onEdit} />}
    />
  );
}
