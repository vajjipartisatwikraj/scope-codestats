import React from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { isAdminOrTeacher } from '../../../../utils/userHelpers';
import CohortAdminPage from '../../staff/detail';
import CohortDetailPage from './CohortDetailPage';

/**
 * What /cohorts/:id shows: a student gets the new cohort page; a teacher or admin who opens the same
 * address gets the staff page (components/cohorts/staff/detail: adding, editing and deleting modules and
 * questions, bulk upload, publishing).
 */
export default function CohortDetailRoute() {
  const { user } = useAuth();

  if (isAdminOrTeacher(user)) return <CohortAdminPage />;
  return <CohortDetailPage />;
}
