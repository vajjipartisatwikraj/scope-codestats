import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { adminRoster } from '../../../services/mentorshipApi';
import { LIST_PATH, mentorshipPath } from '../model/mentorshipModel';
import '../mentorships.css';
import RosterScreen from '../roster/RosterScreen';

/**
 * One mentor's students in one mentorship, for an admin (route
 * /admin/mentorships/:typeId/mentors/:teacherId, opened from the mentorship's page). The path in the
 * top reads "/ Mentorships / Mentorship name / Teacher name". The admin adds and removes the
 * students like the teacher does, which is also how a student moves to another mentor.
 */
export default function MentorRosterPage() {
  const { typeId, teacherId } = useParams();
  const api = useMemo(() => adminRoster(typeId, teacherId), [typeId, teacherId]);

  const describe = (data) => {
    const mentorship = data && data.mentorship;
    const teacher = data && data.teacher;
    return {
      crumbs: [{ label: 'Mentorships', to: LIST_PATH }, { label: mentorship ? mentorship.name : 'Mentorship', to: mentorshipPath(typeId) }, { label: teacher ? teacher.name : 'Mentor' }],
      title: teacher ? teacher.name : 'Mentor',
      description: mentorship ? `Students in ${mentorship.name}` : undefined,
      drawerDescription: teacher && mentorship ? `${teacher.name} \u00b7 ${mentorship.name}` : undefined,
    };
  };

  return <RosterScreen key={api.key} api={api} describe={describe} />;
}
