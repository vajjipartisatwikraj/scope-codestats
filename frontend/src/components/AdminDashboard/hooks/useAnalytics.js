import { useEffect, useMemo, useState } from 'react';
import { adminAnalyticsApi, analyticsErrorMessage } from '../../../services/adminAnalyticsApi';
import { DEFAULT_PERIOD, PAGE_SIZES } from '../model/performanceModel';
import useRemote from './useRemote';

const NO_FILTERS = { department: '', graduatingYear: '', section: '' };
const SEARCH_DEBOUNCE_MS = 350;

/**
 * The state of the student performance screens (Performance, Platforms, Students): the filters
 * (department, graduating year, section and the period changes are measured over), how the
 * comparison is grouped, the students table (view, sort, page, search), and the three answers from
 * /api/admin/analytics. The filters are shared by the three screens, so they stay when the admin
 * moves between them. The overview loads when Performance or Platforms is open and the students
 * when Students is open; typing in the search waits a moment before it asks the server.
 *
 *   overviewOn, studentsOn   which answers are needed right now
 */
export default function useAnalytics({ overviewOn, studentsOn }) {
  const [filters, setFilters] = useState({ ...NO_FILTERS, days: DEFAULT_PERIOD });
  const [groupBy, setGroupBy] = useState('department');
  const [table, setTable] = useState({ view: 'summary', sort: 'totalScore', order: 'desc', page: 1, limit: PAGE_SIZES[0] });
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');

  // The values of the dropdowns, once
  const options = useRemote((signal) => adminAnalyticsApi.filters({ signal }), [], overviewOn || studentsOn, analyticsErrorMessage);

  const overview = useRemote(
    (signal) => adminAnalyticsApi.overview({ ...filters, groupBy }, { signal }),
    [filters.department, filters.graduatingYear, filters.section, filters.days, groupBy],
    overviewOn,
    analyticsErrorMessage
  );

  const students = useRemote(
    (signal) => adminAnalyticsApi.students({ ...filters, sort: table.sort, order: table.order, page: table.page, limit: table.limit, search }, { signal }),
    [filters.department, filters.graduatingYear, filters.section, filters.days, table.sort, table.order, table.page, table.limit, search],
    studentsOn,
    analyticsErrorMessage
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setTable((previous) => ({ ...previous, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const changeFilters = (patch) => {
    setFilters((previous) => ({ ...previous, ...patch }));
    setTable((previous) => ({ ...previous, page: 1 }));
  };
  const resetFilters = () => changeFilters(NO_FILTERS);
  const changeTable = (patch) => setTable((previous) => ({ ...previous, ...patch }));

  const filtering = Boolean(filters.department || filters.graduatingYear || filters.section);

  const selectedGroup = useMemo(
    () => (groupBy === 'department' ? filters.department : groupBy === 'section' ? filters.section : filters.graduatingYear),
    [groupBy, filters]
  );

  return {
    filters,
    filtering,
    changeFilters,
    resetFilters,
    groupBy,
    setGroupBy,
    selectedGroup,
    table,
    changeTable,
    searchText,
    setSearchText,
    options,
    overview,
    students,
  };
}
