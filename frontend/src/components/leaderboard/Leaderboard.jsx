import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { GearSixIcon } from '@phosphor-icons/react/dist/csr/GearSix';
import { UsersThreeIcon } from '@phosphor-icons/react/dist/csr/UsersThree';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { PillTabs } from '../custom-components';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { useAuth } from '../../contexts/AuthContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import './leaderboard.css';
import Filters from './Filters';
import Hint from './Hint';
import LeaderboardList from './LeaderboardList';
import LeaderboardTable from './LeaderboardTable';
import Pagination from './Pagination';
import PositionBar from './PositionBar';
import StudentSheet from './StudentSheet';
import { Highlights, Leaders, YourPlace } from './Summary';
import exportCsv from './exportCsv';
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  TABS,
  departmentRankMap,
  filterRows,
  findOwnRow,
  firstDirection,
  hasFilters,
  nextSort,
  rankMap,
  sortRows,
} from './leaderboardModel';
import useLeaderboard from './useLeaderboard';

/**
 * The leaderboard (route /leaderboard): every ranked student, by total score or by problems
 * solved, with filters, sortable columns, the signed-in student's own place and, for teachers and
 * admins, a CSV of what is on screen.
 *
 * It follows design/screens.md section 6:
 *   - the figure the student came for comes first: their rank, in the one inverted band, then the
 *     three champions and four highlights (Summary.jsx)
 *   - below it the board itself: tabs, search and filters, then a real table (900px and wider) or a
 *     list of rows with a sheet for the rest (a phone)
 *   - ranks are worked out here, after every filter, from the figure of the list; students with the
 *     same figure share a rank
 *   - the colours, type, radii and spacing are the design tokens that ThemeContext publishes, so
 *     both themes work without any theme code in this component
 *
 * The server sends every student in one answer (useLeaderboard); nothing is asked of it again when
 * a filter, a sort or the tab changes.
 */
export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getAcademicYear, getDisplayName, academicYears } = useAcademicYear();
  const { rows, loading, refreshing, error, reload } = useLeaderboard();

  const wide = useMediaQuery('(min-width: 900px)');
  const phone = useMediaQuery('(max-width: 599.95px)');

  const [tab, setTab] = useState('score');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sheetId, setSheetId] = useState(null);

  const pageRef = useRef(null);
  const boardRef = useRef(null);

  const isStaff = user?.userType === 'admin' || user?.userType === 'teacher';
  const isAdmin = user?.userType === 'admin';

  const yearName = useCallback((graduatingYear) => (graduatingYear ? getDisplayName(graduatingYear) : '\u2013'), [getDisplayName]);
  const years = useMemo(() => academicYears.filter((name) => name !== 'Graduated'), [academicYears]);

  // ---- The list, step by step ---------------------------------------------------------------
  // Graduated students are not on the board (the server leaves them out as well)
  const eligible = useMemo(
    () => rows.filter((row) => !row.graduatingYear || getAcademicYear(row.graduatingYear) !== 'Graduated'),
    [rows, getAcademicYear]
  );
  const overallRanks = useMemo(() => rankMap(eligible, tab), [eligible, tab]);
  const departmentRanks = useMemo(() => departmentRankMap(eligible, tab), [eligible, tab]);

  const filtered = useMemo(() => filterRows(eligible, filters, getAcademicYear), [eligible, filters, getAcademicYear]);
  const ranks = useMemo(() => rankMap(filtered, tab), [filtered, tab]);
  const sorted = useMemo(() => sortRows(filtered, sort, tab), [filtered, sort, tab]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = useMemo(() => sorted.slice((current - 1) * pageSize, current * pageSize), [sorted, current, pageSize]);
  const leaders = useMemo(() => sortRows(filtered, DEFAULT_SORT, tab), [filtered, tab]);

  // ---- The signed-in student -----------------------------------------------------------------
  const own = useMemo(() => findOwnRow(eligible, user), [eligible, user]);
  const ownRank = own ? overallRanks.get(own._id) : null;
  const ownIndex = own ? sorted.findIndex((row) => row._id === own._id) : -1;
  const ownOnPage = ownIndex >= (current - 1) * pageSize && ownIndex < current * pageSize && ownIndex !== -1;
  const ownFilteredRank = ownIndex === -1 ? null : ranks.get(own._id);

  // ---- Actions --------------------------------------------------------------------------------
  const bringBoardIntoView = useCallback(() => {
    const node = boardRef.current;
    if (!node) return;
    const top = node.getBoundingClientRect().top;
    if (top < 0) {
      const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      node.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    }
  }, []);

  const changeFilters = useCallback((next) => {
    setFilters(next);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const changeTab = useCallback((next) => {
    setTab(next);
    setSort(DEFAULT_SORT);
    setPage(1);
  }, []);

  const changeSort = useCallback((key) => {
    setSort((currentSort) => nextSort(currentSort, key));
    setPage(1);
  }, []);

  const changePage = useCallback(
    (next) => {
      setPage(Math.max(1, Math.min(pages, next)));
      bringBoardIntoView();
    },
    [pages, bringBoardIntoView]
  );

  const changePageSize = useCallback((size) => {
    setPageSize(size);
    setPage(1);
  }, []);

  // Brings the student's own row on screen: on its page, with the filters cleared if they hide it
  const showMyRow = useCallback(() => {
    if (!own) return;
    let list = sorted;
    if (ownIndex === -1) {
      setFilters(EMPTY_FILTERS);
      list = sortRows(eligible, sort, tab);
    }
    const index = list.findIndex((row) => row._id === own._id);
    if (index === -1) return;
    setPage(Math.floor(index / pageSize) + 1);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const node = document.getElementById('lb-own');
        if (node) {
          const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          node.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
        }
      });
    });
  }, [own, ownIndex, sorted, eligible, sort, tab, pageSize]);

  const download = useCallback(() => {
    exportCsv({ rows: sorted, tab, ranks, departmentRanks, yearName });
  }, [sorted, tab, ranks, departmentRanks, yearName]);

  // The order of a list without column headers is chosen from a menu
  const sortOptions = useMemo(
    () => [
      { value: 'value', label: TABS.find((entry) => entry.key === tab).valueLabel },
      { value: 'consistency', label: 'Consistency' },
      { value: 'change', label: 'Score change' },
      { value: 'name', label: 'Name' },
    ],
    [tab]
  );
  const sortKey = sortOptions.some((option) => option.value === sort.key) ? sort.key : 'value';
  const chooseSortKey = useCallback((key) => {
    setSort({ key, dir: key === 'value' ? 'desc' : firstDirection(key) });
    setPage(1);
  }, []);

  const sheetRow = sheetId ? eligible.find((row) => row._id === sheetId) : null;
  const filtersOn = hasFilters(filters);
  const nothingYet = !loading && !error && eligible.length === 0;

  // ---- The board --------------------------------------------------------------------------------
  let board;
  if (loading) {
    board = (
      <div className="lb-skeleton" role="status" aria-label="Loading the leaderboard">
        {Array.from({ length: wide ? 10 : 8 }, (_, index) => (
          <div key={index} className="lb-skeleton__row" />
        ))}
      </div>
    );
  } else if (nothingYet) {
    board = (
      <div className="lb-empty">
        <UsersThreeIcon size={32} weight="regular" aria-hidden="true" />
        <h3 className="lb-empty__title">Nobody is ranked yet</h3>
        <p className="lb-empty__text">The board fills up after the first profile update. Check back after tonight&rsquo;s update.</p>
      </div>
    );
  } else if (sorted.length === 0) {
    board = (
      <div className="lb-empty">
        <UsersThreeIcon size={32} weight="regular" aria-hidden="true" />
        <h3 className="lb-empty__title">No students match</h3>
        <p className="lb-empty__text">Try another department, year or section, or clear the search.</p>
        <button type="button" className="lb-secondary" onClick={resetFilters}>
          Reset filters
        </button>
      </div>
    );
  } else if (wide) {
    board = (
      <LeaderboardTable
        rows={pageRows}
        tab={tab}
        ranks={ranks}
        departmentRanks={departmentRanks}
        sort={sort}
        onSort={changeSort}
        ownId={own ? own._id : null}
        yearName={yearName}
        refreshing={refreshing}
      />
    );
  } else {
    board = (
      <LeaderboardList
        rows={pageRows}
        tab={tab}
        ranks={ranks}
        ownId={own ? own._id : null}
        yearName={yearName}
        onOpen={(row) => setSheetId(row._id)}
        refreshing={refreshing}
      />
    );
  }

  return (
    <div className="lb" ref={pageRef} data-bar={own && !loading && !ownOnPage ? 'true' : 'false'}>
      <header className="lb-header">
        <h1 className="lb-sr">Leaderboard</h1>
        <div className="lb-header__actions">
          {isAdmin && (
            <button type="button" className="lb-secondary" onClick={() => navigate('/admin/academic-year-config')}>
              <GearSixIcon size={18} weight="regular" aria-hidden="true" />
              <span>Academic years</span>
            </button>
          )}
          {isStaff && (
            <button type="button" className="lb-spotlight" onClick={download} disabled={loading || sorted.length === 0}>
              <DownloadSimpleIcon size={18} weight="regular" aria-hidden="true" />
              <span>Export</span>
            </button>
          )}
          <Hint text="Refresh the leaderboard">
            <button
              type="button"
              className="lb-icon-button"
              onClick={reload}
              disabled={loading || refreshing}
              aria-label="Refresh the leaderboard"
              data-spinning={refreshing ? 'true' : 'false'}
            >
              <ArrowsClockwiseIcon size={20} weight="regular" aria-hidden="true" />
            </button>
          </Hint>
        </div>
      </header>

      <div className="lb-top">
        {loading ? (
          <>
            <section className="lb-champs" aria-hidden="true">
              <div className="lb-champs__stage">
                <div className="lb-champs__grid">
                  <div className="lb-champ lb-champ--loading" />
                  <div className="lb-champ lb-champ--loading" />
                  <div className="lb-champ lb-champ--loading" />
                </div>
              </div>
            </section>
            <section className="lb-highlights" aria-hidden="true">
              <div className="lb-highlights__list">
                <div className="lb-highlight lb-highlight--loading" />
                <div className="lb-highlight lb-highlight--loading" />
                <div className="lb-highlight lb-highlight--loading" />
                <div className="lb-highlight lb-highlight--loading" />
              </div>
            </section>
            <div className="lb-place lb-place--loading" role="status" aria-label="Loading your rank" />
          </>
        ) : (
          <>
            <Leaders tab={tab} rows={leaders} ranks={ranks} />
            <Highlights rows={filtered} />
            <YourPlace tab={tab} own={own} rank={ownRank} total={eligible.length} rows={eligible} onShowMe={showMyRow} />
          </>
        )}
      </div>

      <section className="lb-board" ref={boardRef} aria-labelledby="lb-board-title">
        <div className="lb-board__head">
          <h2 className="lb-sr" id="lb-board-title">
            Ranking
          </h2>
          <PillTabs role="radiogroup" label="Ranking" value={tab} onChange={changeTab} items={TABS.map((entry) => ({ key: entry.key, label: entry.label }))} />
        </div>

        <Filters
          filters={filters}
          onChange={changeFilters}
          years={years}
          active={filtersOn}
          onReset={resetFilters}
          compact={!wide}
          open={filtersOpen}
          onToggle={() => setFiltersOpen((open) => !open)}
          sortKey={sortKey}
          sortOptions={sortOptions}
          onSortKey={chooseSortKey}
        />

        {error && (
          <div className="lb-notice" role="alert">
            <WarningIcon size={20} weight="regular" aria-hidden="true" />
            <p>{error}</p>
            <button type="button" className="lb-secondary" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {board}

        {!loading && sorted.length > 0 && (
          <Pagination page={current} pageSize={pageSize} total={sorted.length} onPage={changePage} onPageSize={changePageSize} compact={phone} />
        )}
      </section>

      {own && !loading && !ownOnPage && (
        <PositionBar anchorRef={pageRef} row={own} tab={tab} rank={ownFilteredRank} onGo={ownIndex === -1 ? resetFilters : showMyRow} />
      )}

      {sheetRow && (
        <StudentSheet
          row={sheetRow}
          tab={tab}
          rank={ranks.get(sheetRow._id)}
          departmentRank={departmentRanks.get(sheetRow._id)}
          own={own ? own._id === sheetRow._id : false}
          yearName={yearName}
          onClose={() => setSheetId(null)}
        />
      )}
    </div>
  );
}
