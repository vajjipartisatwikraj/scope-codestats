import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Tab, Tabs, Typography, useTheme } from "@mui/material";
import { adminAnalyticsApi, analyticsErrorMessage } from "../../../../services/adminAnalyticsApi";
import AnalyticsFilters from "./AnalyticsFilters";
import GroupComparison from "./GroupComparison";
import { LoadError, LoadingBlock } from "./Panel";
import PlatformsView from "./PlatformsView";
import StudentInsights from "./StudentInsights";
import StudentsTable from "./StudentsTable";
import SummaryCards from "./SummaryCards";
import TrendCharts from "./TrendCharts";
import { DEFAULT_PERIOD, PAGE_SIZES, formatDateTime, longDate, pluralize } from "./performanceFormat";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "platforms", label: "Platforms" },
  { key: "students", label: "Students" },
];

const NO_FILTERS = { department: "", graduatingYear: "", section: "" };
const SEARCH_DEBOUNCE_MS = 350;

/** Loads one answer; ignores a slow answer that was replaced by a newer request. */
function useAnswer(load, deps, enabled = true) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    // Keep the previous answer on screen while the new one loads.
    setState((previous) => ({ ...previous, loading: true, error: null }));
    load(controller.signal)
      .then((data) => !controller.signal.aborted && setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({ ...previous, loading: false, error: analyticsErrorMessage(error) }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  return { ...state, reload: useCallback(() => setTick((value) => value + 1), []) };
}

/**
 * Admin screen: how all students perform over CodeStats and the coding platforms (problems
 * solved, scores, contests, ratings, GitHub), filtered by department, graduating year and
 * section, with changes measured over a chosen period.
 *
 * The data comes from /api/admin/analytics; filters and tables are cheap for the server
 * because it keeps the loaded data for a few minutes.
 */
const PerformanceAnalytics = () => {
  const darkMode = useTheme().palette.mode === "dark";
  const [tab, setTab] = useState("overview");
  const [filters, setFilters] = useState({ ...NO_FILTERS, days: DEFAULT_PERIOD });
  const [groupBy, setGroupBy] = useState("department");
  const [table, setTable] = useState({ view: "summary", sort: "totalScore", order: "desc", page: 1, limit: PAGE_SIZES[0] });
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");

  // Dropdown values, once.
  const options = useAnswer((signal) => adminAnalyticsApi.filters({ signal }), []);

  const overview = useAnswer(
    (signal) => adminAnalyticsApi.overview({ ...filters, groupBy }, { signal }),
    [filters.department, filters.graduatingYear, filters.section, filters.days, groupBy]
  );

  const students = useAnswer(
    (signal) =>
      adminAnalyticsApi.students(
        { ...filters, sort: table.sort, order: table.order, page: table.page, limit: table.limit, search },
        { signal }
      ),
    [filters.department, filters.graduatingYear, filters.section, filters.days, table.sort, table.order, table.page, table.limit, search],
    tab === "students"
  );

  // Typing waits a moment before it asks the server.
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

  const reloadAll = () => {
    overview.reload();
    if (tab === "students") students.reload();
  };

  const answer = overview.data;
  const selectedGroupValue = useMemo(
    () => (groupBy === "department" ? filters.department : groupBy === "section" ? filters.section : filters.graduatingYear),
    [groupBy, filters]
  );

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Student performance
        </Typography>
        <Typography variant="body2" color="text.secondary">
          CodeStats and the coding platforms: problems solved, scores, contests, ratings and GitHub activity of all students.
        </Typography>
      </Box>

      <AnalyticsFilters
        options={options.data}
        value={filters}
        onChange={changeFilters}
        onReset={resetFilters}
        onRefresh={reloadAll}
        refreshing={overview.loading}
      />

      {options.error && <Alert severity="warning">The filter lists could not be loaded: {options.error}</Alert>}

      {overview.error && !answer ? (
        <LoadError message={overview.error} onRetry={overview.reload} />
      ) : !answer ? (
        <LoadingBlock label="Loading analytics... the first load can take a few seconds." />
      ) : (
        <>
          {overview.error && <LoadError message={overview.error} onRetry={overview.reload} />}
          <Box sx={{ opacity: overview.loading ? 0.6 : 1, transition: "opacity 0.15s", display: "grid", gap: 3 }}>
            <Typography variant="caption" color="text.secondary">
              {pluralize(answer.summary.students, "student")} selected · changes over {longDate(answer.range.start)} to{" "}
              {longDate(answer.range.end)} (IST) · data loaded {formatDateTime(answer.generatedAt)}
            </Typography>

            <SummaryCards summary={answer.summary} days={answer.range.days} />

            <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ borderBottom: 1, borderColor: "divider", "& .MuiTab-root": { textTransform: "none", fontWeight: 600 } }}>
              {TABS.map((t) => (
                <Tab key={t.key} value={t.key} label={t.label} />
              ))}
            </Tabs>

            {tab === "overview" && (
              <Box sx={{ display: "grid", gap: 3 }}>
                <TrendCharts trend={answer.trend} range={answer.range} tracking={answer.tracking} darkMode={darkMode} />
                <GroupComparison comparison={answer.comparison} onGroupByChange={setGroupBy} selected={selectedGroupValue} />
                <StudentInsights distributions={answer.distributions} leaders={answer.leaders} />
              </Box>
            )}

            {tab === "platforms" && <PlatformsView platforms={answer.platforms} darkMode={darkMode} />}

            {tab === "students" && (
              <StudentsTable
                data={students.data}
                loading={students.loading}
                error={students.error}
                onRetry={students.reload}
                query={table}
                searchText={searchText}
                onSearchText={setSearchText}
                onQueryChange={changeTable}
              />
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default PerformanceAnalytics;
