import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Calculate as CalculateIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { rankingAdminApi } from "../../../services/rankingAdminApi";

const POLL_WHILE_RUNNING_MS = 3000;

const SOURCE_LABEL = {
  cron: "Nightly sync",
  admin: "Admin sync",
  recompute: "Recalculated",
};

const STATUS_COLOR = { completed: "success", failed: "error", running: "info" };

const formatDuration = (ms) => (ms === null || ms === undefined ? "-" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

/**
 * Admin panel for scores and ranks. Ranks are calculated by themselves after every profile
 * sync; this shows the latest calculations and lets an admin calculate now (for example to
 * start the history before the first nightly sync, or after fixing a student's department).
 * It uses the scores already stored, so it does not contact any platform.
 */
const RankingsPanel = ({ token }) => {
  const theme = useTheme();
  const [state, setState] = useState({ running: false, syncRunning: false, runs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await rankingAdminApi.status(token));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load the ranking history");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Nothing polls unless a calculation is running.
  useEffect(() => {
    if (!state.running) return undefined;
    const timer = setInterval(load, POLL_WHILE_RUNNING_MS);
    return () => clearInterval(timer);
  }, [state.running, load]);

  const recompute = async () => {
    setStarting(true);
    try {
      const { run } = await rankingAdminApi.recompute(token);
      toast.success(`Ranks calculated for ${run.students} students (${run.written} changed)`);
    } catch (err) {
      if (err.response?.status === 409) toast.info(err.response.data?.message || "Ranks cannot be calculated right now");
      else toast.error(err.response?.data?.message || "Could not calculate ranks");
    } finally {
      setStarting(false);
      load();
    }
  };

  const busy = starting || state.running || state.syncRunning;
  const buttonTitle = state.syncRunning
    ? "A profile sync is running. Ranks are calculated automatically when it finishes."
    : state.running
      ? "Ranks are being calculated"
      : "Calculate scores and ranks now from the scores already stored";

  return (
    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6">Scores &amp; ranks</Typography>
          <Typography variant="body2" color="text.secondary">
            Calculated automatically after every profile sync. Calculate now to use the scores already stored.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={load} aria-label="Refresh ranking history">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={buttonTitle}>
            <span>
              <Button
                variant="contained"
                startIcon={starting || state.running ? <CircularProgress size={18} color="inherit" /> : <CalculateIcon />}
                onClick={recompute}
                disabled={busy}
                sx={{ textTransform: "none" }}
              >
                {starting || state.running ? "Calculating..." : "Recalculate ranks now"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {state.syncRunning && (
        <Alert severity="info" sx={{ mb: 2 }}>
          A profile sync is running. Ranks are calculated when it finishes.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : state.runs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No ranks have been calculated yet. They are calculated after the next profile sync, or press the button to
          start now.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Latest score and rank calculations">
            <TableHead>
              <TableRow>
                <TableCell>Started</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Students</TableCell>
                <TableCell align="right">Records written</TableCell>
                <TableCell align="right">Unchanged</TableCell>
                <TableCell align="right">Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{run.startedAt ? new Date(run.startedAt).toLocaleString() : "-"}</TableCell>
                  <TableCell>{SOURCE_LABEL[run.source] || run.source}</TableCell>
                  <TableCell>
                    <Tooltip title={run.error || ""}>
                      <Chip size="small" variant="outlined" color={STATUS_COLOR[run.status] || "default"} label={run.status.toUpperCase()} />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{run.students}</TableCell>
                  <TableCell align="right">{run.written}</TableCell>
                  <TableCell align="right">{run.unchanged}</TableCell>
                  <TableCell align="right">{formatDuration(run.durationMs)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default RankingsPanel;
