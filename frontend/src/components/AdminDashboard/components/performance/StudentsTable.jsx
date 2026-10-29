import React from "react";
import {
  Box,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { LoadError, Panel } from "./Panel";
import { PAGE_SIZES, PLATFORM_LIST, columnsFor, formatDateTime, formatNumber, signed } from "./performanceFormat";

const VIEWS = [{ key: "summary", name: "Summary" }, ...PLATFORM_LIST.map((p) => ({ key: p.key, name: p.name }))];

/** One cell. A "gain" is a change (signed, green or red); null means not measured / not linked. */
function Cell({ column, row }) {
  const value = column.get(row);
  if (value === null || value === undefined || value === "") return <span style={{ opacity: 0.45 }}>-</span>;
  if (column.kind === "gain") {
    const color = value > 0 ? "#22c55e" : value < 0 ? "#ef4444" : undefined;
    return <span style={{ color }}>{signed(value)}</span>;
  }
  if (column.kind === "text" || column.kind === "plain") return <>{value}</>;
  return <>{formatNumber(value)}</>;
}

/**
 * The students of the current filters, one page at a time. Sorting, searching and paging
 * happen on the server; the columns change with the chosen view (summary or one platform).
 *
 * @param {{students: Array, pagination: object}|null} data
 * @param {{view, sort, order, page, limit, search}} query
 * @param {(patch: object) => void} onQueryChange
 */
const StudentsTable = ({ data, loading, error, onRetry, query, searchText, onSearchText, onQueryChange }) => {
  const theme = useTheme();
  const columns = columnsFor(query.view);

  const sortBy = (key) => {
    const text = columns.find((c) => c.key === key)?.kind === "text";
    onQueryChange({ sort: key, order: query.sort === key && query.order === "desc" ? "asc" : query.sort === key ? "desc" : text ? "asc" : "desc", page: 1 });
  };

  return (
    <Panel title="Students" subtitle="Everything a student has on each platform, and how it changed in the period">
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={query.view}
          onChange={(_event, view) => view && onQueryChange({ view, sort: view === "summary" ? "totalScore" : `${view}.score`, order: "desc", page: 1 })}
          sx={{ flexWrap: "wrap" }}
          aria-label="Table view"
        >
          {VIEWS.map((view) => (
            <ToggleButton key={view.key} value={view.key} sx={{ textTransform: "none", px: 1.5 }}>
              {view.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TextField
          size="small"
          placeholder="Search name or roll number"
          value={searchText}
          onChange={(event) => onSearchText(event.target.value)}
          inputProps={{ maxLength: 64, "aria-label": "Search students" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260, ml: "auto" }}
        />
      </Box>

      {error ? (
        <LoadError message={error} onRetry={onRetry} />
      ) : (
        <Paper variant="outlined" sx={{ backgroundColor: "transparent", borderColor: theme.palette.divider, opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
          <TableContainer sx={{ maxHeight: 620 }}>
            <Table size="small" stickyHeader aria-label="Students">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.kind === "text" ? "left" : "right"}
                      sortDirection={query.sort === column.key ? query.order : false}
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: 700,
                        ...(column.sticky && { position: "sticky", left: 0, zIndex: 3, backgroundColor: theme.palette.background.paper }),
                      }}
                    >
                      <TableSortLabel active={query.sort === column.key} direction={query.sort === column.key ? query.order : "desc"} onClick={() => sortBy(column.key)}>
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.students || []).map((row) => (
                  <TableRow key={row.id} hover>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        align={column.kind === "text" ? "left" : "right"}
                        sx={{
                          whiteSpace: "nowrap",
                          ...(column.sticky && { position: "sticky", left: 0, zIndex: 1, fontWeight: 600, backgroundColor: theme.palette.background.paper }),
                        }}
                      >
                        <Cell column={column} row={row} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {data && data.students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} sx={{ textAlign: "center", py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No students match these filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!data && loading && (
                  <TableRow>
                    <TableCell colSpan={columns.length} sx={{ textAlign: "center", py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Loading students...
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.pagination.total || 0}
            page={(data?.pagination.page || 1) - 1}
            rowsPerPage={query.limit}
            rowsPerPageOptions={PAGE_SIZES}
            onPageChange={(_event, page) => onQueryChange({ page: page + 1 })}
            onRowsPerPageChange={(event) => onQueryChange({ limit: Number(event.target.value), page: 1 })}
          />
        </Paper>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        "-" means the platform is not linked or nothing was recorded to measure a change from.
        {data ? ` Data loaded ${formatDateTime(data.generatedAt)}.` : ""}
      </Typography>
    </Panel>
  );
};

export default StudentsTable;
