import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { ChatsIcon } from '@phosphor-icons/react/dist/csr/Chats';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Badge, Button, Card, IconButton, Menu, Skeleton, formatDate, formatNumber, pluralize } from '../ui';

export const groupPath = (id) => `/admin/user-groups/${id}`;

/**
 * One user group on the list, as a card. The roll number count leads (it is the figure staff come
 * for), then what uses the group, then the Manage button that opens the group's own page. Three
 * dots in the top right corner open its menu: Edit (name and description) and Delete.
 *
 *   group                 a group of GET /user-groups (name, description, memberCount, cohortCount,
 *                         testCount, createdAt)
 *   onEdit, onDelete      (group) => void
 */
export default function GroupCard({ group, onEdit, onDelete }) {
  const used = (group.cohortCount || 0) + (group.testCount || 0) > 0;

  return (
    <Card as="article" className="ugc">
      <div className="ugc-top">
        <Badge tone={used ? 'success' : 'neutral'}>{used ? 'In use' : 'Not attached'}</Badge>
        <Menu
          className="ugc-menu"
          label={`Actions for ${group.name}`}
          align="end"
          fixed
          trigger={({ props }) => (
            <IconButton {...props} label={`Actions for ${group.name}`} size="sm" tone="plain">
              <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
            </IconButton>
          )}
          items={[
            { key: 'edit', label: 'Edit', hint: 'Name and description', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => onEdit(group) },
            { key: 'delete', label: 'Delete', icon: <TrashIcon size={20} weight="regular" />, tone: 'danger', onSelect: () => onDelete(group) },
          ]}
        />
      </div>

      <h3 className="ugc-title">{group.name}</h3>
      <p className="ugc-description" data-empty={group.description ? 'false' : 'true'}>
        {group.description || 'No description'}
      </p>

      <p className="ugc-figure">
        <span className="ugc-number">{formatNumber(group.memberCount || 0)}</span>
        <span className="ugc-unit">{group.memberCount === 1 ? 'roll number' : 'roll numbers'}</span>
      </p>

      <ul className="ugc-facts" aria-label="Where this group is used">
        <li>
          <StackIcon size={16} weight="regular" aria-hidden="true" />
          <span>{pluralize(group.cohortCount || 0, 'cohort')}</span>
        </li>
        <li>
          <ChatsIcon size={16} weight="regular" aria-hidden="true" />
          <span>{pluralize(group.testCount || 0, 'communication test')}</span>
        </li>
        {group.createdAt ? (
          <li>
            <CalendarBlankIcon size={16} weight="regular" aria-hidden="true" />
            <span>Created {formatDate(group.createdAt)}</span>
          </li>
        ) : null}
      </ul>

      <div className="ugc-foot">
        <Button as={Link} to={groupPath(group._id)} size="sm" variant="secondary" endIcon={<ArrowRightIcon size={16} weight="bold" aria-hidden="true" />} aria-label={`Manage ${group.name}`}>
          Manage
        </Button>
      </div>
    </Card>
  );
}

/** A card-shaped placeholder while the groups load */
export function GroupCardSkeleton() {
  return (
    <Card as="div" className="ugc" aria-hidden="true">
      <Skeleton width={96} height={24} radius="var(--ds-radius-pill)" />
      <Skeleton width="60%" height={22} />
      <Skeleton width="85%" height={16} />
      <Skeleton width="40%" height={36} />
      <Skeleton width="70%" height={16} />
      <Skeleton width={96} height={36} radius="var(--ds-radius-pill)" />
    </Card>
  );
}
