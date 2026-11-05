import React from 'react';
import { CloudArrowDownIcon } from '@phosphor-icons/react/dist/csr/CloudArrowDown';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Badge, Button, EmptyState, IconButton, formatNumber, pluralize } from '../../../../ui';
import useScrolling from '../../../../../hooks/useScrolling';
import '../../../student/detail/modules/moduleList.css';
import './staffSidebar.css';

/**
 * The modules of the cohort in the student list's shape (a row per module, the open one a solid
 * accent row) with what staff need: a button to add a module, and edit and delete on the open
 * row. A row says how many questions the module has. The list scrolls inside the sidebar card and
 * shows its slim scrollbar only while it moves.
 *
 *   modules, selectedId, onSelect(moduleId)
 *   canEdit                    admins: show add, edit and delete (teachers manage content elsewhere)
 *   canImport, onImport()      admins and teachers: import a bank from the bank library as new modules
 *   onAdd(), onEdit(module), onDelete(module)
 */
export default function StaffModuleList({ modules, selectedId, onSelect, canEdit, canImport = false, onImport, onAdd, onEdit, onDelete }) {
  const [listRef, scrolling] = useScrolling();

  return (
    <section className="cdm" aria-labelledby="cdm-title">
      <header className="cdm-head cad-head">
        <h2 className="cdm-title" id="cdm-title">
          Modules
        </h2>
        <Badge tone="neutral">{formatNumber(modules.length)}</Badge>
        {canImport ? (
          <IconButton className="cad-head__add" label="Import modules from the bank library" size="sm" tone="plain" onClick={onImport}>
            <CloudArrowDownIcon size={20} weight="regular" aria-hidden="true" />
          </IconButton>
        ) : null}
        {canEdit ? (
          <IconButton className={canImport ? undefined : 'cad-head__add'} label="Add module" size="sm" tone="plain" onClick={onAdd}>
            <PlusIcon size={20} weight="bold" aria-hidden="true" />
          </IconButton>
        ) : null}
      </header>

      {modules.length === 0 ? (
        <EmptyState
          compact
          icon={<StackIcon size={24} weight="regular" />}
          title="No modules yet"
          text={canEdit ? 'Add the first module to start building this cohort.' : 'No modules have been added to this cohort.'}
          action={
            canEdit || canImport ? (
              <div className="cad-empty-actions">
                {canEdit ? (
                  <Button variant="secondary" size="sm" startIcon={<PlusIcon size={16} weight="bold" aria-hidden="true" />} onClick={onAdd}>
                    Add module
                  </Button>
                ) : null}
                {canImport ? (
                  <Button variant="secondary" size="sm" startIcon={<CloudArrowDownIcon size={16} weight="regular" aria-hidden="true" />} onClick={onImport}>
                    Import a bank
                  </Button>
                ) : null}
              </div>
            ) : undefined
          }
        />
      ) : (
        <ul className="cdm-list" ref={listRef} data-scrolling={scrolling ? 'true' : 'false'}>
          {modules.map((module) => {
            const active = module._id === selectedId;
            const total = module.questions?.length || 0;
            return (
              <li key={module._id} className="cad-module">
                <button type="button" className="cdm-row cad-module__row" data-active={active ? 'true' : 'false'} aria-current={active ? 'true' : undefined} onClick={() => onSelect(module._id)}>
                  <span className="cdm-row__text">
                    <span className="cdm-row__title">{module.title}</span>
                    <span className="cdm-row__meta">{total > 0 ? pluralize(total, 'question') : 'No questions yet'}</span>
                  </span>
                </button>
                {canEdit && active ? (
                  // White buttons on the solid accent row, in either theme
                  <span className="cad-module__tools" data-theme="daylight">
                    <IconButton label={`Edit ${module.title}`} size="sm" onClick={() => onEdit(module)}>
                      <PencilSimpleIcon size={18} weight="regular" aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Delete ${module.title}`} size="sm" tone="danger" onClick={() => onDelete(module)}>
                      <TrashIcon size={18} weight="regular" aria-hidden="true" />
                    </IconButton>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
