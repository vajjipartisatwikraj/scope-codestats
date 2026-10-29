import React from 'react';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { Badge, IconButton } from '../ui';
import { rowState, yearLabel } from './academicYearModel';

/** "New" or "Changed" beside a row that differs from what is saved: a word, not only a tint */
function Pending({ state }) {
  if (!state) return null;
  return <Badge tone="info">{state === 'new' ? 'New' : 'Changed'}</Badge>;
}

function RowActions({ mapping, onEdit, onRemove }) {
  return (
    <div className="ui-table__actions">
      <IconButton label={`Edit mapping for ${mapping.graduationYear}`} size="sm" onClick={() => onEdit(mapping)}>
        <PencilSimpleIcon size={18} weight="regular" aria-hidden="true" />
      </IconButton>
      <IconButton label={`Remove mapping for ${mapping.graduationYear}`} size="sm" tone="danger" onClick={() => onRemove(mapping)}>
        <TrashIcon size={18} weight="regular" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

/**
 * The mappings, newest graduating year first: a table from 900px, rows below that.
 *
 *   mappings   sorted list
 *   saved      { mappings, startMonth } as last saved, to mark unsaved rows
 *   compact    rows instead of a table
 */
export default function MappingTable({ mappings, saved, compact, onEdit, onRemove }) {
  if (compact) {
    return (
      <ul className="ui-list ay-list">
        {mappings.map((mapping) => (
          <li key={mapping.graduationYear} className="ay-item">
            <div className="ay-item__main">
              <span className="ay-year">{mapping.graduationYear}</span>
              <Pending state={rowState(saved, mapping)} />
            </div>
            <p className="ay-item__text">
              <span className="ui-table__title">{mapping.displayName}</span>
              <span className="ui-table__meta">{yearLabel(mapping.academicYear)}</span>
            </p>
            <RowActions mapping={mapping} onEdit={onEdit} onRemove={onRemove} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap ay-table-wrap">
      <table className="ui-table" data-density="compact">
        <caption className="ui-sr">Graduating year mappings, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Graduating year</th>
            <th scope="col">Academic year</th>
            <th scope="col">Display name</th>
            <th scope="col">
              <span className="ui-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => (
            <tr key={mapping.graduationYear}>
              <td>
                <span className="ay-year-cell">
                  <span className="ay-year">{mapping.graduationYear}</span>
                  <Pending state={rowState(saved, mapping)} />
                </span>
              </td>
              <td>{yearLabel(mapping.academicYear)}</td>
              <td>{mapping.displayName}</td>
              <td>
                <RowActions mapping={mapping} onEdit={onEdit} onRemove={onRemove} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
