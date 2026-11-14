import React from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { ChatsIcon } from '@phosphor-icons/react/dist/csr/Chats';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { AdminListCard, AdminListCardSkeleton, Badge, formatDate, formatNumber, pluralize } from '../ui';

export const groupPath = (id) => `/admin/user-groups/${id}`;

/**
 * One user group on the list, as the kit's AdminListCard: the roll number count leads, then what uses
 * the group, then the Manage button that opens the group's own page. Three dots open its menu: Edit
 * (name and description) and Delete.
 *
 *   group                 a group of GET /user-groups (name, description, memberCount, cohortCount,
 *                         testCount, createdAt)
 *   onEdit, onDelete      (group) => void
 */
export default function GroupCard({ group, onEdit, onDelete }) {
  const used = (group.cohortCount || 0) + (group.testCount || 0) > 0;
  const facts = [
    { key: 'cohorts', icon: <StackIcon size={16} weight="regular" aria-hidden="true" />, text: pluralize(group.cohortCount || 0, 'cohort') },
    { key: 'tests', icon: <ChatsIcon size={16} weight="regular" aria-hidden="true" />, text: pluralize(group.testCount || 0, 'communication test') },
  ];
  if (group.createdAt) facts.push({ key: 'created', icon: <CalendarBlankIcon size={16} weight="regular" aria-hidden="true" />, text: `Created ${formatDate(group.createdAt)}` });

  return (
    <AdminListCard
      badge={<Badge tone={used ? 'success' : 'neutral'}>{used ? 'In use' : 'Not attached'}</Badge>}
      menuLabel={`Actions for ${group.name}`}
      menuItems={[
        { key: 'edit', label: 'Edit', hint: 'Name and description', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => onEdit(group) },
        { key: 'delete', label: 'Delete', icon: <TrashIcon size={20} weight="regular" />, tone: 'danger', onSelect: () => onDelete(group) },
      ]}
      title={group.name}
      description={group.description}
      figure={{ value: formatNumber(group.memberCount || 0), unit: group.memberCount === 1 ? 'roll number' : 'roll numbers' }}
      facts={facts}
      manageTo={groupPath(group._id)}
      manageLabel={`Manage ${group.name}`}
    />
  );
}

/** A card-shaped placeholder while the groups load */
export const GroupCardSkeleton = AdminListCardSkeleton;