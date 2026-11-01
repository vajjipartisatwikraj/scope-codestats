import React from 'react';

/**
 * ResultTable: a `{ columns, rows }` result set as a table, exactly as compared (a SQL query's rows).
 * Monospace, hairlines between cells, a sticky header, and scrolling inside its own box when wide or
 * tall. A missing value reads NULL.
 *
 *   columns      [name]
 *   rows         [[value, ...]]
 *   caption      the accessible name of the table
 *   emptyLabel   what to say when there are no columns
 */
export default function ResultTable({ columns = [], rows = [], caption, emptyLabel = 'No rows' }) {
  if (columns.length === 0) return <p className="ps-muted">{emptyLabel}</p>;
  return (
    <div className="ps-result-table" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={`${column}-${index}`} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="ps-muted">
                0 rows returned
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((_, columnIndex) => {
                  const value = row?.[columnIndex];
                  return <td key={columnIndex}>{value === null || value === undefined ? <em>NULL</em> : String(value)}</td>;
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
