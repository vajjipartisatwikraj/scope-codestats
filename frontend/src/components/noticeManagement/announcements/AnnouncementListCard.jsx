import React from 'react';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
import { AdminListCard } from '../../ui';
import NoticeStatusBadge from '../shared/NoticeStatusBadge';
import { EditAction, closedFigure, commonFacts, noticeMenuItems } from '../shared/noticeCardParts';
import { plainTextOf } from '../shared/noticeFormat';
import { audienceText } from './announcementFormat';

/**
 * One announcement on the management list, as the kit's AdminListCard: its status, the title, the
 * first lines of the text, how many people closed it (the figure), who it is for, its window and how
 * many pressed the button. The menu has Edit, Switch on or off and Delete.
 *
 *   item                         an announcement of GET /admin/announcements
 *   busy                         it is being switched or deleted: the menu waits
 *   onEdit, onToggle, onDelete   (announcement) => void
 */
export default function AnnouncementListCard({ item, busy, onEdit, onToggle, onDelete }) {
  const facts = [{ key: 'audience', icon: <UsersIcon size={16} weight="regular" aria-hidden="true" />, text: audienceText(item) }, ...commonFacts(item)];
  return (
    <AdminListCard
      badge={<NoticeStatusBadge status={item.status} />}
      menuLabel={`Actions for ${item.title}`}
      menuItems={noticeMenuItems(item, { onEdit, onToggle, onDelete })}
      menuDisabled={busy}
      title={item.title}
      description={plainTextOf(item.description)}
      figure={closedFigure(item)}
      facts={facts}
      action={<EditAction item={item} label={`Edit ${item.title}`} onEdit={onEdit} />}
    />
  );
}
