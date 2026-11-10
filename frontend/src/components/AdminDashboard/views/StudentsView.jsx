import React from 'react';
import { Card, EmptyState, Pagination, PillTabs, SearchField, SkeletonRows, SortHeader } from '../../ui';
import { formatNumber, loadedAt, signed } from '../model/format';
import { PAGE_SIZES, columnsFor } from '../model/performanceModel';
import { PLATFORMS } from '../model/platforms';
import AnalyticsFilters from '../parts/AnalyticsFilters';
import { LoadError } from '../parts/States';

const VIEWS = [{ key: 'summary', label: 'Summary' }, ...PLATFORMS.map((platform) => ({ key: platform.key, label: platform.name }))];

/**
 * One cell. A "gain" is a change: a signed figure, with the sign (and not the colour alone) saying
 * which way. null means the platform is not linked or nothing was recorded to measure from.
 */
function Value({ column, row }) {
  const value = column.get(row);
  if (value === null || value === undefined || value === '') return <span className="ad-none">{'\u2013'}</span>;
  if (column.kind === 'gain') return <span data-gain={value > 0 ? 'up' : value < 0 ? 'down' : 'flat'}>{signed(value)}</span>;
  if (column.kind === 'text' || column.kind === 'plain') return <>{value}</>;
  return <>{formatNumber(value)}</>;
}

/**
 * Students: every student of the current filters, a page at a time, from /api/admin/analytics/students.
 * Sorting, searching and paging happen on the server. The columns change with the view (a summary
 * or one platform); the name stays in view while the other columns scroll sideways. "-" means the
 * platform is not linked or nothing was recorded to measure a change from.
 */
export default function StudentsView({ analytics }) {
  const { options, students, filters, filtering, changeFilters, resetFilters, table, changeTable, searchText, setSearchText } = analytics;
  const { data, loading, error, reload } = students;
  const columns = columnsFor(table.view);
  const rows = data ? data.students : [];

  const sortBy = (key) => {
    const text = columns.find((column) => column.key === key)?.kind === 'text';
    const next = table.sort === key ? (table.order === 'desc' ? 'asc' : 'desc') : text ? 'asc' : 'desc';
    changeTable({ sort: key, order: next, page: 1 });
  };

  const changeView = (view) => changeTable({ view, sort: view === 'summary' ? 'totalScore' : `${view}.score`, order: 'desc', page: 1 });

  let body;
  if (error && !data) {
    body = <LoadError title="We could not load the students" message={error} onRetry={reload} />;
  } else if (!data && loading) {
    body = <SkeletonRows count={8} height={56} />;
  } else if (rows.length === 0) {
    body = <EmptyState compact title="No students match" text="Change the filters or the search to see students." />;
  } else {
    body = (
      <div className="ui-table-wrap ad-wrap" data-busy={loading ? 'true' : 'false'}>
        <table className="ui-band-table ad-table ad-table--students">
          <caption className="ui-sr">Students, sorted by {columns.find((column) => column.key === table.sort)?.label || 'score'}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <SortHeader
                  key={column.key}
                  label={column.label}
                  sortKey={column.key}
                  sort={{ key: table.sort, dir: table.order }}
                  onSort={sortBy}
                  align={column.kind === 'text' ? 'start' : 'end'}
                  className={column.sticky ? 'ad-sticky' : undefined}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className={`${column.kind === 'text' || column.kind === 'plain' ? '' : 'ui-num'}${column.sticky ? ' ad-sticky ad-strong' : ''}`.trim() || undefined}>
                    <Value column={column} row={row} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="ad-view">
      <AnalyticsFilters options={options.data} value={filters} onChange={changeFilters} onReset={resetFilters} filtering={filtering} />

      <Card title="Students" description="Everything a student has on each platform, and how it changed in the period." className="ad-card">
        <div className="ad-students-bar">
          <PillTabs role="radiogroup" label="Table view" items={VIEWS} value={table.view} onChange={changeView} />
          <SearchField className="ad-students-bar__search" value={searchText} onChange={setSearchText} placeholder="Search name or roll number" label="Search students" />
        </div>

        {error && data ? <LoadError title="We could not refresh the students" message={`${error} You are looking at the last page that loaded.`} onRetry={reload} /> : null}
        {body}

        {data && data.pagination.total > 0 ? (
          <Pagination
            page={data.pagination.page}
            pageSize={table.limit}
            total={data.pagination.total}
            onPage={(page) => changeTable({ page })}
            onPageSize={(limit) => changeTable({ limit, page: 1 })}
            sizes={PAGE_SIZES}
          />
        ) : null}

        <p className="ad-note">
          {'\u201c\u2013\u201d'} means the platform is not linked or nothing was recorded to measure a change from.
          {data ? ` Data loaded ${loadedAt(data.generatedAt)}.` : ''}
        </p>
      </Card>
    </div>
  );
}
