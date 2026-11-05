import React from 'react';
import { Card } from '../../../../ui';
import '../../../student/detail/sidebar/cohortSidebar.css';
import StaffHeader from './StaffHeader';
import StaffModuleList from './StaffModuleList';

/**
 * The left column of the staff page: the student sidebar's card, with the staff header and module list.
 * See StaffHeader and StaffModuleList for the props they take.
 */
export default function StaffSidebar({ cohort, panel, onPanel, busy, onTogglePublished, modules, selectedId, onSelect, canEdit, canImport, onImport, onAdd, onEdit, onDelete }) {
  return (
    <Card as="div" flush className="cds">
      <StaffHeader cohort={cohort} panel={panel} onPanel={onPanel} busy={busy} onTogglePublished={onTogglePublished} />
      <StaffModuleList modules={modules} selectedId={selectedId} onSelect={onSelect} canEdit={canEdit} canImport={canImport} onImport={onImport} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
    </Card>
  );
}
