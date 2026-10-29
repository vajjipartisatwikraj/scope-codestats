import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/ListMagnifyingGlass";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { Button, Card, EmptyState, Notice, Pagination, SearchField, SelectField, Skeleton, Toolbar } from "../../ui";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { adminApi, apiErrorMessage } from "../../../services/speechTestApi";
import DeleteSubmissionDialog from "./DeleteSubmissionDialog";
import ResultsList from "./ResultsList";
import ResultsTable from "./ResultsTable";
import { filterEntries, firstDirection, sortEntries, uniqueValues } from "./resultsModel";

/** Rows shaped like the real ones, while the results load. */
const LoadingRows = () => (
  <div className="sxl-loading" role="status" aria-label="Loading the results">
    {[0, 1, 2, 3, 4].map((key) => (
      <Skeleton key={key} height={56} radius="var(--ds-radius-md)" />
    ))}
  </div>
);

/**
 * Ranked results of a speech test, in the same table pattern as the main leaderboard.
 *
 * Students see finished attempts only. Staff also see attempts still in progress, so a teacher can
 * follow a live test, and can delete a submission (through a confirmation) so the student can take
 * the test again. Filters (search, department, section, year), sorting and paging happen on the
 * page; the ranks are the server's.
 *
 * Props
 *   testId, isAdmin, currentUserId
 *   data   the object returned by useSpeechLeaderboard: { loading, refreshing, error, meta, entries, reload }
 */
const SpeechTestLeaderboard = ({ testId, isAdmin = false, currentUserId = null, data }) => {
  const { loading, refreshing, error, meta, entries, reload } = data;
  const wide = useMediaQuery("(min-width: 900px)");

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState({ key: "rank", dir: "asc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteAttempt(testId, toDelete.attemptId);
      toast.success(`${toDelete.user.name} can now take the test again`);
      setToDelete(null);
      await reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete the submission"));
    } finally {
      setDeleting(false);
    }
  };

  const departments = useMemo(() => uniqueValues(entries, (u) => u.department), [entries]);
  const sections = useMemo(() => uniqueValues(entries, (u) => u.section), [entries]);
  const years = useMemo(() => uniqueValues(entries, (u) => u.graduatingYear), [entries]);

  const filtered = useMemo(
    () => filterEntries(entries, { search, department, section, year }),
    [entries, search, department, section, year]
  );
  const sorted = useMemo(() => sortEntries(filtered, sort), [filtered, sort]);

  useEffect(() => setPage(1), [search, department, section, year, rowsPerPage]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * rowsPerPage, current * rowsPerPage);

  const filtersActive = Boolean(search || department || section || year);
  const reset = () => {
    setSearch("");
    setDepartment("");
    setSection("");
    setYear("");
  };

  const onSort = (key) =>
    setSort((previous) =>
      previous.key === key ? { key, dir: previous.dir === "asc" ? "desc" : "asc" } : { key, dir: firstDirection(key) }
    );

  const filterSelect = (label, plural, value, setValue, options, prefix = "") => (
    <SelectField
      variant="pill"
      aria-label={label}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      options={[{ value: "", label: `All ${plural}` }, ...options.map((option) => ({ value: String(option), label: `${prefix}${option}` }))]}
    />
  );

  const activeFilters = [
    search ? `search "${search.trim()}"` : null,
    department ? `department ${department}` : null,
    section ? `section ${section}` : null,
    year ? `year ${year}` : null,
  ].filter(Boolean);

  if (loading) {
    return (
      <Card flush title={isAdmin ? "All results" : "Rankings"}>
        <LoadingRows />
      </Card>
    );
  }

  if (error && !meta) {
    return (
      <Notice
        tone="danger"
        title="Could not load the leaderboard"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  }

  const testSections = meta?.sections || [];

  let results;
  if (entries.length === 0) {
    results = (
      <EmptyState
        icon={<TrophyIcon size={28} aria-hidden="true" />}
        title="No results yet"
        text="Scores appear here as students finish the test."
      />
    );
  } else if (sorted.length === 0) {
    results = (
      <EmptyState
        icon={<ListMagnifyingGlassIcon size={28} aria-hidden="true" />}
        title="No students match the filters"
        text={`Nothing matches ${activeFilters.join(", ")}. Try adjusting your filters.`}
        action={
          <Button onClick={reset} startIcon={<XIcon size={16} weight="bold" aria-hidden="true" />}>
            Clear filters
          </Button>
        }
      />
    );
  } else if (wide) {
    results = (
      <ResultsTable
        rows={visible}
        sections={testSections}
        sort={sort}
        onSort={onSort}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onDelete={setToDelete}
        refreshing={refreshing}
      />
    );
  } else {
    results = (
      <ResultsList
        rows={visible}
        sections={testSections}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onDelete={setToDelete}
        refreshing={refreshing}
      />
    );
  }

  return (
    <>
      <Card
        flush
        title={isAdmin ? "All results" : "Rankings"}
        description={`Showing ${sorted.length} of ${entries.length} student${entries.length === 1 ? "" : "s"}`}
        actions={
          filtersActive ? (
            <Button variant="ghost" size="sm" onClick={reset} startIcon={<XIcon size={16} weight="bold" aria-hidden="true" />}>
              Reset filters
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={reload}
              loading={refreshing}
              startIcon={<ArrowClockwiseIcon size={16} weight="bold" aria-hidden="true" />}
            >
              Refresh
            </Button>
          )
        }
      >
        {entries.length > 0 ? (
          <div className="sxl-toolbar">
            <Toolbar
              label="Filter the results"
              search={<SearchField value={search} onChange={setSearch} placeholder="Search name or roll number" label="Search students" />}
            >
              {filterSelect("Department", "departments", department, setDepartment, departments)}
              {filterSelect("Section", "sections", section, setSection, sections, "Section ")}
              {filterSelect("Year", "years", year, setYear, years)}
            </Toolbar>
          </div>
        ) : null}

        {results}

        {sorted.length > 0 ? (
          <Pagination
            page={current}
            pageSize={rowsPerPage}
            total={sorted.length}
            onPage={setPage}
            onPageSize={setRowsPerPage}
            sizes={[5, 10, 25, 50, 100]}
          />
        ) : null}
      </Card>

      {isAdmin ? (
        <DeleteSubmissionDialog entry={toDelete} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
      ) : null}
    </>
  );
};

export default SpeechTestLeaderboard;
