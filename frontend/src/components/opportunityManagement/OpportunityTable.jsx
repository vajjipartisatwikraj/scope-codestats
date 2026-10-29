import React from 'react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { LockKeyIcon } from '@phosphor-icons/react/dist/csr/LockKey';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Avatar, Badge, IconButton, Tip } from '../ui';
import { categoryLabel, deadlineInfo, difficultyLabel, statusLabel } from './opportunityModel';

/**
 * The opportunities as a table (900px and wider) or as a list of rows (phones).
 *
 * Props
 *   opportunities       the opportunities of this page
 *   mobile              true below 900px: render rows instead of the table
 *   sort, onSort(key)   { key, dir } and the click handler of the sortable headers
 *   onOpen(item)        a row or its title was pressed: open the drawer
 *   onDelete(item)      the delete button of a row
 */

const STATUS_TONE = { upcoming: 'info', ongoing: 'success', completed: 'neutral' };

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'neutral'}>{statusLabel(status) || 'No status'}</Badge>;
}

export function RegistrationBadge({ open }) {
  return open ? (
    <Badge tone="success" icon={<CheckCircleIcon size={14} weight="fill" aria-hidden="true" />}>
      Open
    </Badge>
  ) : (
    <Badge tone="danger" icon={<LockKeyIcon size={14} weight="fill" aria-hidden="true" />}>
      Closed
    </Badge>
  );
}

function DeadlineBadge({ info }) {
  if (!info.badge) return null;
  return (
    <Badge tone={info.badge.tone} icon={<ClockIcon size={14} weight="fill" aria-hidden="true" />}>
      {info.badge.label}
    </Badge>
  );
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" data-sortable="true" aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="ui-table__sort" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span aria-hidden="true" className="om-sort-icon">
          {active ? sort.dir === 'desc' ? <CaretDownIcon size={12} weight="fill" /> : <CaretUpIcon size={12} weight="fill" /> : <CaretDownIcon size={12} weight="bold" />}
        </span>
      </button>
    </th>
  );
}

function Name({ item, onOpen }) {
  return (
    <button
      type="button"
      className="om-open"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(item);
      }}
    >
      {item.title}
    </button>
  );
}

const subtitle = (item) => [item.organizer, item.location].filter(Boolean).join(' \u00b7 ');

export default function OpportunityTable({ opportunities, mobile, sort, onSort, onOpen, onDelete }) {
  if (mobile) {
    return (
      <ul className="ui-list">
        {opportunities.map((item) => {
          const info = deadlineInfo(item);
          return (
            <li key={item._id} className="ui-list__row" data-clickable="true" onClick={() => onOpen(item)}>
              <div className="ui-table__cell-main">
                <Avatar name={item.organizer} src={item.organizerImageUrl} size={40} />
                <div className="ui-table__cell-text">
                  <Name item={item} onOpen={onOpen} />
                  <span className="ui-table__meta">{[categoryLabel(item.category), item.organizer].filter(Boolean).join(' \u00b7 ')}</span>
                </div>
              </div>
              <div className="om-row-end">
                <StatusBadge status={item.status} />
                <span className="ui-table__meta">{info.date}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table om-table" data-density="compact">
        <caption className="ui-sr">Opportunities. Select an opportunity name to edit it.</caption>
        <thead>
          <tr>
            <SortHeader label="Opportunity" sortKey="title" sort={sort} onSort={onSort} />
            <th scope="col">Category</th>
            <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
            <th scope="col">Registration</th>
            <SortHeader label="Deadline" sortKey="deadline" sort={sort} onSort={onSort} />
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((item) => {
            const info = deadlineInfo(item);
            return (
              <tr key={item._id} className="om-row" onClick={() => onOpen(item)}>
                <td className="om-cell-main">
                  <div className="ui-table__cell-main">
                    <Avatar name={item.organizer} src={item.organizerImageUrl} size={36} />
                    <div className="ui-table__cell-text">
                      <Name item={item} onOpen={onOpen} />
                      <span className="ui-table__meta">{subtitle(item)}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="ui-table__cell-text">
                    <span>{categoryLabel(item.category)}</span>
                    {item.difficulty ? <span className="ui-table__meta">{difficultyLabel(item.difficulty)}</span> : null}
                  </div>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  <RegistrationBadge open={Boolean(item.registrationOpen)} />
                </td>
                <td>
                  <div className="om-deadline">
                    <span className="om-deadline__date">{info.date}</span>
                    {info.badge ? <DeadlineBadge info={info} /> : info.relative ? <span className="ui-table__meta">{info.relative}</span> : null}
                  </div>
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <div className="ui-table__actions">
                    {item.applicationLink ? (
                      <Tip text="Open the application link">
                        <a
                          className="ui-icon-button om-external"
                          data-size="sm"
                          data-tone="plain"
                          href={item.applicationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open the application link for ${item.title} in a new tab`}
                        >
                          <ArrowSquareOutIcon size={20} weight="regular" aria-hidden="true" />
                        </a>
                      </Tip>
                    ) : null}
                    <IconButton label={`Edit ${item.title}`} size="sm" tone="plain" onClick={() => onOpen(item)}>
                      <PencilSimpleIcon size={20} weight="regular" aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Delete ${item.title}`} size="sm" tone="danger" onClick={() => onDelete(item)}>
                      <TrashIcon size={20} weight="regular" aria-hidden="true" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
