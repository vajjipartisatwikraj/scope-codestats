import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputBase,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";
import DeleteSubmissionDialog from "./DeleteSubmissionDialog";
import useNotFoundRedirect from "./useNotFoundRedirect";
import { adminApi, leaderboard as fetchLeaderboard, apiErrorMessage } from "../../services/speechTestApi";
import { BRAND, formatClock, formatScore, typeLabel } from "./speechTestMeta";

const MEDALS = ["#FFD700", "#C0C0C0", "#CD7F32"];

/**
 * Ranked results of a speech test, styled like the cohort leaderboard.
 *
 * Students see finished attempts only. Staff also see attempts still in
 * progress, so a teacher can follow a live test.
 */
const SpeechTestLeaderboard = ({ testId, isAdmin = false, currentUserId = null }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [loading, setLoading] = useState(true);
  const redirectIfNotFound = useNotFoundRedirect();
  const [meta, setMeta] = useState(null);
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");
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
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not delete the submission"));
    } finally {
      setDeleting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = isAdmin ? await adminApi.results(testId) : await fetchLeaderboard(testId);
      setMeta(data.test);
      setEntries(data.entries || []);
    } catch (error) {
      if (redirectIfNotFound(error)) return;
      toast.error(apiErrorMessage(error, "Could not load the leaderboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, isAdmin]);

  const unique = (pick) => [...new Set(entries.map((e) => pick(e.user)).filter(Boolean))];
  const departments = unique((u) => u.department);
  const sections = unique((u) => u.section);
  const years = unique((u) => u.graduatingYear);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter(({ user }) => {
      const matchesSearch =
        !term ||
        user.name?.toLowerCase().includes(term) ||
        user.rollNumber?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term);
      return (
        matchesSearch &&
        (!department || user.department === department) &&
        (!section || user.section === section) &&
        (!year || String(user.graduatingYear) === year)
      );
    });
  }, [entries, search, department, section, year]);

  useEffect(() => setPage(1), [search, department, section, year, rowsPerPage]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const visible = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const filtersActive = Boolean(search || department || section || year);
  const reset = () => {
    setSearch("");
    setDepartment("");
    setSection("");
    setYear("");
  };

  const textMuted = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const selectSx = {
    color: isDark ? "#fff" : "#000",
    bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
  };

  const filterSelect = (label, value, setValue, options, prefix = "") => (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(e) => setValue(e.target.value)} sx={selectSx}>
        <MenuItem value="">All</MenuItem>
        {options.map((option) => (
          <MenuItem key={option} value={String(option)}>
            {prefix}
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "14px",
          border: `1px solid ${border}`,
          bgcolor: isDark ? "#0A0A0A" : undefined,
          backgroundImage: "none",
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            minWidth: 240,
            flexGrow: 1,
            maxWidth: 360,
          }}
        >
          <SearchIcon sx={{ color: textMuted, fontSize: 20 }} />
          <InputBase
            placeholder="Search name or roll number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, color: isDark ? "#fff" : "#000", fontSize: "0.9rem" }}
            inputProps={{ "aria-label": "Search students" }}
          />
        </Box>
        {filterSelect("Department", department, setDepartment, departments)}
        {filterSelect("Section", section, setSection, sections, "Section ")}
        {filterSelect("Year", year, setYear, years)}
        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={filtersActive ? reset : load}
          sx={{ textTransform: "none", color: BRAND }}
        >
          {filtersActive ? "Reset filters" : "Refresh"}
        </Button>
        <Typography variant="body2" sx={{ ml: "auto", color: textMuted }}>
          Showing {filtered.length} of {entries.length} students
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "14px",
          border: `1px solid ${border}`,
          bgcolor: isDark ? "#0A0A0A" : undefined,
          backgroundImage: "none",
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table
            sx={{
              "& .MuiTableCell-root": {
                color: isDark ? "#fff" : "#000",
                borderBottom: `1px solid ${border}`,
                padding: "12px 16px",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
              },
            }}
          >
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? "rgba(0,136,204,0.35)" : "#f3f8fc" }}>
                {["Rank", "Name", "Roll No", "Dept", "Section", "Year"].map((label) => (
                  <TableCell key={label} sx={{ fontWeight: 700 }}>
                    {label}
                  </TableCell>
                ))}
                {(meta?.sections || []).map((s) => (
                  <TableCell key={s._id} sx={{ fontWeight: 700 }} title={typeLabel(s.type)}>
                    {s.title}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Score</TableCell>
                {isAdmin && <TableCell sx={{ width: 56 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10 + (meta?.sections?.length || 0)} align="center">
                    <Box sx={{ py: 5 }}>
                      <CircularProgress size={36} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10 + (meta?.sections?.length || 0)} align="center">
                    <Box sx={{ py: 5, color: textMuted }}>
                      <Typography variant="h6" gutterBottom>
                        {entries.length === 0 ? "No results yet" : "No students match the filters"}
                      </Typography>
                      <Typography variant="body2">
                        {entries.length === 0
                          ? "Scores appear here as students finish the test."
                          : "Try adjusting your filters."}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((entry, i) => {
                  const mine = currentUserId && entry.user._id === currentUserId;
                  const top3 = entry.rank && entry.rank <= 3;
                  const inProgress = entry.status !== "completed";
                  return (
                    <TableRow
                      key={entry.user._id}
                      hover
                      sx={{
                        bgcolor: mine
                          ? alpha(BRAND, isDark ? 0.15 : 0.06)
                          : top3
                          ? isDark
                            ? "rgba(0,136,204,0.1)"
                            : "rgba(0,136,204,0.05)"
                          : isDark && i % 2 === 0
                          ? "rgba(255,255,255,0.03)"
                          : "transparent",
                      }}
                    >
                      <TableCell align="center" sx={{ width: 60 }}>
                        {entry.rank ? (
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              bgcolor: top3 ? MEDALS[entry.rank - 1] : "transparent",
                              color: top3 ? "#000" : "inherit",
                            }}
                          >
                            {entry.rank}
                          </Box>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            alt={entry.user.name}
                            src={entry.user.profilePicture}
                            sx={{ width: 38, height: 38, border: `2px solid ${alpha(BRAND, 0.4)}` }}
                          >
                            {entry.user.name?.charAt(0)?.toUpperCase() || "U"}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <Typography variant="body1" fontWeight="medium">
                                {entry.user.name || "Anonymous"}
                              </Typography>
                              {mine && (
                                <Chip size="small" label="YOU" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                              )}
                              {isAdmin && inProgress && (
                                <Chip size="small" label="In progress" color="warning" sx={{ height: 20, fontSize: "0.7rem" }} />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{entry.user.rollNumber ? entry.user.rollNumber.toUpperCase() : "-"}</TableCell>
                      <TableCell>{entry.user.department || "-"}</TableCell>
                      <TableCell>{entry.user.section || "-"}</TableCell>
                      <TableCell>{entry.user.graduatingYear || "-"}</TableCell>
                      {entry.sectionScores.map((s) => (
                        <TableCell key={s.sectionId}>{formatScore(s.score)}</TableCell>
                      ))}
                      <TableCell>{entry.totalTimeUsedSeconds ? formatClock(entry.totalTimeUsedSeconds) : "—"}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: BRAND, fontWeight: 700 }}>
                          {inProgress ? "—" : formatScore(entry.finalScore)}
                        </Typography>
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <Tooltip title="Delete submission so the student can retake the test">
                            <IconButton
                              size="small"
                              onClick={() => setToDelete(entry)}
                              aria-label={`Delete submission of ${entry.user.name}`}
                            >
                              <DeleteOutlineIcon fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            p: 2,
            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(e.target.value)}
              size="small"
              sx={{ minWidth: 65, height: 32, color: isDark ? "#fff" : "#000" }}
            >
              {[5, 10, 25, 50, 100].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="body2" sx={{ color: textMuted }}>
              per page
            </Typography>
          </Box>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            size="small"
          />
        </Box>
      </Paper>

      {isAdmin && (
        <DeleteSubmissionDialog
          entry={toDelete}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Box>
  );
};

export default SpeechTestLeaderboard;
