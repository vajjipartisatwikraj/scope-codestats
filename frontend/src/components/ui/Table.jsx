import React from 'react';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { CaretUpDownIcon } from '@phosphor-icons/react/dist/csr/CaretUpDown';

/**
 * SortHeader (DESIGN.md, Tables and leaderboards): a sortable column header for the `.ui-table`
 * markup. It renders `<th scope="col" aria-sort>` with a button inside (44px high, the focus ring
 * from `.ui-table__sort`), the label and an arrow beside it: up for ascending, down for
 * descending, a quiet up-down mark on columns that are not the sort. The sorted state is announced
 * through aria-sort. The arrow is an icon, so the state is not colour alone.
 *
 *   label     the header text
 *   sortKey   this column's key
 *   sort      { key, dir } the table's current sort; dir is 'asc' or 'desc'
 *   onSort    called with sortKey when the header is pressed. The caller decides what a second
 *             press does (usually flips the direction).
 *   align     'start' (default) | 'end' (for a numeric column, to sit over right-aligned figures)
 *   className added to the th
 */
export function SortHeader({ label, sortKey, sort, onSort, align = 'start', className }) {
  const active = Boolean(sort) && sort.key === sortKey;
  const descending = active && sort.dir === 'desc';
  return (
    <th scope="col" className={className} data-sortable="true" aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="ui-table__sort" data-align={align} data-active={active ? 'true' : 'false'} onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span className="ui-table__sort-icon" aria-hidden="true">
          {!active ? <CaretUpDownIcon size={14} weight="bold" /> : descending ? <ArrowDownIcon size={14} weight="bold" /> : <ArrowUpIcon size={14} weight="bold" />}
        </span>
      </button>
    </th>
  );
}

export default SortHeader;
