import React from 'react';
import { ChalkboardTeacherIcon } from '@phosphor-icons/react/dist/csr/ChalkboardTeacher';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { StudentIcon } from '@phosphor-icons/react/dist/csr/Student';

/**
 * What the manage users page knows about roles and filters. The values are the ones the server
 * uses (user, teacher, admin); the words are the ones people use.
 */

export const ROLES = [
  { value: 'user', label: 'Student', tone: 'neutral', Icon: StudentIcon, grants: 'the student screens' },
  { value: 'teacher', label: 'Teacher', tone: 'info', Icon: ChalkboardTeacherIcon, grants: 'the staff screens and student data' },
  { value: 'admin', label: 'Admin', tone: 'warning', Icon: ShieldCheckIcon, grants: 'every staff screen, including managing users' },
];

/** The role record for a server value (the first, Student, when the value is unknown) */
export const roleInfo = (value) => ROLES.find((role) => role.value === value) || ROLES[0];

/** The departments the filter has always offered */
export const DEPARTMENTS = ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE'];

export const EMPTY_FILTERS = { query: '', role: 'all', department: 'all' };

export const hasFilters = (filters) => filters.query.trim() !== '' || filters.role !== 'all' || filters.department !== 'all';

const text = (value) => String(value || '').toLowerCase();

/**
 * The same filter the page has always had: the search matches the name, email, roll number and
 * department; the role and the department narrow it further.
 */
export function filterUsers(users, filters) {
  const query = filters.query.trim().toLowerCase();
  return users.filter((person) => {
    if (query && !(text(person.name).includes(query) || text(person.email).includes(query) || text(person.rollNumber).includes(query) || text(person.department).includes(query))) {
      return false;
    }
    if (filters.role !== 'all' && person.userType !== filters.role) return false;
    if (filters.department !== 'all' && person.department !== filters.department) return false;
    return true;
  });
}

/** The roles of everyone, counted from the list on screen so a role change shows at once */
export function countRoles(users) {
  const departments = new Set();
  const counts = { total: users.length, admin: 0, teacher: 0, user: 0 };
  users.forEach((person) => {
    if (counts[person.userType] !== undefined) counts[person.userType] += 1;
    if (person.department) departments.add(person.department);
  });
  return { ...counts, departments: departments.size };
}

/** What a role change means for the person, in a sentence for the confirmation */
export function consequenceOf(person, newRole) {
  const name = person.name || 'This person';
  const next = roleInfo(newRole);
  if (newRole === 'user') return `${name} loses access to the staff screens and goes back to the student view.`;
  return `${name} gets access to ${next.grants}.`;
}

/** The role badge's icon, so the role is never colour alone */
export function RoleIcon({ role, size = 14 }) {
  const { Icon } = roleInfo(role);
  return <Icon size={size} weight="fill" aria-hidden="true" />;
}
