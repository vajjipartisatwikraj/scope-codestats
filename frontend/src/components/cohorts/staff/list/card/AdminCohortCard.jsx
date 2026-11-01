import React from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { CopySimpleIcon } from '@phosphor-icons/react/dist/csr/CopySimple';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { TimerIcon } from '@phosphor-icons/react/dist/csr/Timer';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { UserIcon } from '@phosphor-icons/react/dist/csr/User';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
import { Badge, Button, Card, IconButton, Menu, formatDateTime, pluralize } from '../../../../ui';
import CohortStatusBadge from '../../../student/list/shared/CohortStatusBadge';
import { adminStatus } from '../model/cohortAdmin';
import '../../../student/list/card/cohortCard.css';
import './adminCohortCard.css';

/** Who can open the cohort, in one line */
function audienceOf(cohort) {
  const groups = pluralize(cohort.userGroupsCount || 0, 'user group');
  if (cohort.accessType === 'global') return `Open to all students \u00b7 ${groups}`;
  return `${pluralize(cohort.eligibleUsersCount || 0, 'eligible student')} \u00b7 ${groups}`;
}

/**
 * One cohort on the staff dashboard, in the student card's own shape (the status badge, the title,
 * two lines of description, the facts at the foot). Three dots in the top right corner open a menu of
 * what staff can do to the cohort (edit, download the exam results, duplicate, delete); User groups
 * and Manage are the two buttons at the foot. Teachers manage and attach user groups but do not
 * create, edit, duplicate or delete, so they get no menu.
 *
 *   cohort                 a cohort of GET /cohorts/admin
 *   canEdit                the viewer may edit, duplicate and delete (admins)
 *   busy                   an action is running: duplicating is not offered meanwhile (the item waits)
 *   exporting              this cohort's exam results are being built
 *   onEdit, onDelete, onDuplicate, onExport, onUserGroups, onManage   (cohort) => void
 */
export default function AdminCohortCard({ cohort, canEdit, busy, exporting, onEdit, onDelete, onDuplicate, onExport, onUserGroups, onManage }) {
  const status = adminStatus(cohort);
  const exam = cohort.mode === 'exam';

  return (
    <Card as="article" className="chc cmc">
      <div className="cmc-badges">
        <CohortStatusBadge status={status} />
        {exam ? <Badge tone="neutral">Exam mode</Badge> : null}
        {canEdit ? (
          <Menu
            className="cmc-menu"
            label={`Actions for ${cohort.title}`}
            align="end"
            fixed
            trigger={({ props }) => (
              <IconButton {...props} label={`Actions for ${cohort.title}`} size="sm" tone="plain">
                <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
              </IconButton>
            )}
            items={[
              { key: 'edit', label: 'Edit', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => onEdit(cohort) },
              ...(exam ? [{ key: 'download', label: exporting ? 'Preparing the download' : 'Download exam results', hint: 'An Excel workbook', icon: <DownloadSimpleIcon size={20} weight="regular" />, disabled: exporting, onSelect: () => onExport(cohort) }] : []),
              { key: 'duplicate', label: 'Duplicate', hint: 'A draft that uses the same modules', icon: <CopySimpleIcon size={20} weight="regular" />, disabled: busy, onSelect: () => onDuplicate(cohort) },
              { key: 'delete', label: 'Delete', icon: <TrashIcon size={20} weight="regular" />, tone: 'danger', onSelect: () => onDelete(cohort) },
            ]}
          />
        ) : null}
      </div>

      <h3 className="chc-title cmc-title">{cohort.title}</h3>
      {cohort.description ? <p className="chc-description">{cohort.description}</p> : null}

      <div className="chc-foot">
        <ul className="cmc-facts" aria-label="About this cohort">
          <li>
            <CalendarBlankIcon size={16} weight="regular" aria-hidden="true" />
            <span>
              <span className="ui-sr">Runs from </span>
              {formatDateTime(cohort.startDate)} to {formatDateTime(cohort.endDate)}
            </span>
          </li>
          {exam && cohort.examStartTime && cohort.examEndTime ? (
            <li>
              <TimerIcon size={16} weight="regular" aria-hidden="true" />
              <span>
                <span className="ui-sr">Exam window: </span>
                {formatDateTime(cohort.examStartTime)} to {formatDateTime(cohort.examEndTime)}
                {cohort.examDurationMinutes ? ` \u00b7 ${cohort.examDurationMinutes} min each` : ''}
              </span>
            </li>
          ) : null}
          <li>
            <UsersIcon size={16} weight="regular" aria-hidden="true" />
            <span>{audienceOf(cohort)}</span>
          </li>
          <li>
            <UserIcon size={16} weight="regular" aria-hidden="true" />
            <span>Created by {cohort.createdBy?.name || 'Admin'}</span>
          </li>
        </ul>

        <div className="cmc-actions">
          <div className="cmc-main">
            <Button size="sm" variant="ghost" startIcon={<UsersIcon size={16} weight="regular" aria-hidden="true" />} onClick={() => onUserGroups(cohort)}>
              User groups
            </Button>
            <Button size="sm" variant="secondary" endIcon={<ArrowRightIcon size={16} weight="bold" aria-hidden="true" />} onClick={() => onManage(cohort)}>
              {cohort.isDraft ? 'Edit draft' : 'Manage'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
