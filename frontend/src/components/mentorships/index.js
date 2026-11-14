/**
 * Mentorships: teachers mentor groups of students inside a mentorship (programme).
 *
 *   admin/    MentorshipList (/admin/mentorships), MentorshipPage (/admin/mentorships/:typeId),
 *             MentorRosterPage (/admin/mentorships/:typeId/mentors/:teacherId)
 *   teacher/  MyStudents (/admin/my-students)
 *   roster/   RosterScreen, the students list both sides share (with useRoster and AddStudentsDrawer)
 *   shared/   PeopleTable
 *   model/    paths, sorts and text helpers
 */
export { default as MentorshipList } from './admin/MentorshipList';
export { default as MentorshipPage } from './admin/MentorshipPage';
export { default as MentorRosterPage } from './admin/MentorRosterPage';
export { default as MyStudents } from './teacher/MyStudents';
