import React from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { ChalkboardTeacherIcon } from '@phosphor-icons/react/dist/csr/ChalkboardTeacher';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { AdminListCard, AdminListCardSkeleton, Badge, formatDate, formatNumber, pluralize } from '../../ui';
import { isUpcoming, mentorshipPath } from '../model/mentorshipModel';

/**
 * One mentorship on the list, as the kit's AdminListCard: the number of students leads, then the
 * mentors and the start date, then the Manage button that opens the mentorship's own page. Three dots
 * open Edit and Delete.
 *
 *   mentorship        one of GET /mentorships (name, description, startsAt, teacherCount, studentCount)
 *   onEdit, onDelete  (mentorship) => void
 */
export default function MentorshipCard({ mentorship, onEdit, onDelete }) {
  const upcoming = isUpcoming(mentorship);
  const facts = [{ key: 'mentors', icon: <ChalkboardTeacherIcon size={16} weight="regular" aria-hidden="true" />, text: pluralize(mentorship.teacherCount || 0, 'mentor') }];
  if (mentorship.startsAt) {
    facts.push({ key: 'start', icon: <CalendarBlankIcon size={16} weight="regular" aria-hidden="true" />, text: `${upcoming ? 'Starts' : 'Started'} ${formatDate(mentorship.startsAt)}` });
  }

  return (
    <AdminListCard
      badge={<Badge tone={upcoming ? 'warning' : 'success'}>{upcoming ? 'Upcoming' : 'Running'}</Badge>}
      menuLabel={`Actions for ${mentorship.name}`}
      menuItems={[
        { key: 'edit', label: 'Edit', hint: 'Name, description and start', icon: <PencilSimpleIcon size={20} weight="regular" />, onSelect: () => onEdit(mentorship) },
        { key: 'delete', label: 'Delete', icon: <TrashIcon size={20} weight="regular" />, tone: 'danger', onSelect: () => onDelete(mentorship) },
      ]}
      title={mentorship.name}
      description={mentorship.description}
      figure={{ value: formatNumber(mentorship.studentCount || 0), unit: mentorship.studentCount === 1 ? 'student' : 'students' }}
      facts={facts}
      manageTo={mentorshipPath(mentorship._id)}
      manageLabel={`Manage ${mentorship.name}`}
    />
  );
}

export const MentorshipCardSkeleton = AdminListCardSkeleton;
