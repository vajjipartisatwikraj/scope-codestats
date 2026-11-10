import React, { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Button, Card, EmptyState, Pagination, SearchField, formatNumber, pluralize } from '../ui';
import useMediaQuery from '../../hooks/useMediaQuery';
import RouteDrawer from './RouteDrawer';
import RouteTable from './RouteTable';
import { nextSort, searchRows, sortRows } from './monitoringModel';

const GETTERS = {
  route: (r) => r.route,
  count: (r) => r.count,
  success: (r) => r.success,
  clientErrors: (r) => r.clientErrors,
  serverErrors: (r) => r.serverErrors,
  p50: (r) => r.p50,
  p95: (r) => r.p95,
  bytes: (r) => r.bytes,
};

/**
 * Every route of the API with its calls, outcomes and response times: search, sort, pages of ten,
 * and a drawer with the status codes of the route you press.
 *
 *   routes   the `routes` of the API overview
 */
export default function RoutesCard({ routes }) {
  const phone = useMediaQuery('(max-width: 899.95px)');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'count', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);

  const found = useMemo(() => searchRows(routes, query, (r) => `${r.method} ${r.route}`), [routes, query]);
  const sorted = useMemo(() => sortRows(found, sort, GETTERS), [found, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const changeQuery = (value) => {
    setQuery(value);
    setPage(1);
  };
  const changeSort = (key) => {
    setSort((now) => nextSort(now, key));
    setPage(1);
  };

  return (
    <Card
      flush
      className="mon-card"
      title="Routes"
      description={`${pluralize(routes.length, 'route')} called in this range. Press one to see its status codes.`}
      actions={
        <SearchField className="mon-search" value={query} onChange={changeQuery} label="Search routes" placeholder="Search routes" />
      }
    >
      {routes.length === 0 ? (
        <EmptyState compact title="No requests in this range" text="Routes appear here about a minute after they are called." />
      ) : sorted.length === 0 ? (
        <EmptyState
          compact
          icon={<MagnifyingGlassIcon size={28} aria-hidden="true" />}
          title="No route matches"
          text={`Nothing matches \u201c${query.trim()}\u201d.`}
          action={<Button onClick={() => changeQuery('')}>Clear search</Button>}
        />
      ) : (
        <>
          <RouteTable rows={rows} phone={phone} sort={sort} onSort={changeSort} onOpen={setSelected} />
          <Pagination
            page={current}
            pageSize={pageSize}
            total={sorted.length}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}
      <p className="ui-sr" role="status">
        {query ? `${formatNumber(sorted.length)} routes match` : ''}
      </p>
      <RouteDrawer route={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}
