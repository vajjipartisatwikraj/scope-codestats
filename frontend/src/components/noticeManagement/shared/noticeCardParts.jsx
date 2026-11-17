import React from 'react';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { CursorClickIcon } from '@phosphor-icons/react/dist/csr/CursorClick';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PowerIcon } from '@phosphor-icons/react/dist/csr/Power';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Button, formatNumber, pluralize } from '../../ui';
import { windowText } from './noticeFormat';

/**
 * The parts of a notice card that alerts and announcements have in common, so both build on the
 * kit's AdminListCard with the same menu, the same foot button, the same figure and the same facts.
 */

/** The three-dot menu: Edit, switch on or off, Delete (last, in the danger tone) */
export function noticeMenuItems(item, { onEdit, onToggle, onDelete }) {
  return [
    { key: 'edit', label: 'Edit', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => onEdit(item) },
    {
      key: 'toggle',
      label: item.isActive ? 'Switch off' : 'Switch on',
      hint: item.isActive ? 'Stop showing it' : 'Show it in its window',
      icon: <PowerIcon size={20} weight="regular" />,
      onSelect: () => onToggle(item),
    },
    { key: 'delete', label: 'Delete', icon: <TrashIcon size={20} weight="regular" />, tone: 'danger', onSelect: () => onDelete(item) },
  ];
}

/** The foot of a card: the notice has no page of its own, so Edit opens its drawer */
export function EditAction({ item, label, onEdit }) {
  return (
    <Button size="sm" variant="secondary" startIcon={<PencilSimpleIcon size={16} weight="regular" aria-hidden="true" />} aria-label={label} onClick={() => onEdit(item)}>
      Edit
    </Button>
  );
}

/** The figure that leads: how many people closed the notice */
export const closedFigure = (item) => ({ value: formatNumber(item.closeClicks), unit: item.closeClicks === 1 ? 'person closed it' : 'people closed it' });

/** The facts every notice card shows: its window and, when it has a button, how many pressed it */
export function commonFacts(item) {
  const facts = [{ key: 'window', icon: <ClockIcon size={16} weight="regular" aria-hidden="true" />, text: windowText(item) }];
  if (item.buttonText) {
    facts.push({
      key: 'button',
      icon: <CursorClickIcon size={16} weight="regular" aria-hidden="true" />,
      text: `${pluralize(item.buttonClicks, 'person')} pressed \u201c${item.buttonText}\u201d`,
    });
  }
  return facts;
}
