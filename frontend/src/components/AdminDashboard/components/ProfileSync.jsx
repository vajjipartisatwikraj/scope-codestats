import React, { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Assessment,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Error as ErrorIcon,
  FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Timer as TimerIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import { capitalize } from "../utils/helpers";
import { apiUrl } from "../../../config/apiConfig";
import RankingsPanel from "./RankingsPanel";

// How often things refresh. Nothing polls unless a run is actually running.
const LIST_POLL_RUNNING_MS = 4000; // job list while a run is going
const LIST_POLL_IDLE_MS = 30000; // job list when nothing is running
const DETAIL_POLL_MS = 2000; // an open run's detail, only while it runs

const STATUS_COLOR = {
  running: "info",
  completed: "success",
  failed: "error",
  cancelled: "warning",
};

const PLATFORM_URL = {
  leetcode: (u) => `https://leetcode.com/${u}`,
  codeforces: (u) => `https://codeforces.com/profile/${u}`,
  codechef: (u) => `https://www.codechef.com/users/${u}`,
  hackerrank: (u) => `https://www.hackerrank.com/${u}`,
  github: (u) => `https://github.com/${u}`,
};

const PLATFORM_COLOR = {
  leetcode: "#FFA116",
  codeforces: "#1E88E5",
  codechef: "#5B4638",
  hackerrank: "#00EA64",
  github: "#333333",
};

// The nightly sync runs at 12:00 AM IST (18:30 UTC the day before).
const nextScheduledRun = () => {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 30)
  );
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
};

const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${m}m ${total % 60}s`;
};

const formatDuration = (seconds = 0) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

const successRate = (job) => {
  const total = (job.updatedProfiles || 0) + (job.failedProfiles || 0);
  return total > 0 ? Math.round((job.updatedProfiles / total) * 100) : 0;
};

const StatusChip = ({ status }) => (
  <Chip
    size="small"
    color={STATUS_COLOR[status] || "default"}
    variant="outlined"
    label={status.toUpperCase()}
    icon={
      status === "running" ? (
        <CircularProgress size={14} />
      ) : status === "completed" ? (
        <CheckCircleIcon />
      ) : status === "failed" ? (
        <ErrorIcon />
      ) : status === "cancelled" ? (
        <CancelIcon />
      ) : undefined
    }
  />
);

const Stat = ({ label, value, color }) => (
  <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
    <Typography variant="h5" color={color}>
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Paper>
);

const ProfileSync = ({ token }) => {
  const theme = useTheme();
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const paperSx = {
    p: 3,
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
  };

  // Job list
  const [jobs, setJobs] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);

  // Starting / cancelling
  const [starting, setStarting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // job id awaiting confirmation
  const [cancelling, setCancelling] = useState(false);

  // The run whose detail is open
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  // Next scheduled run
  const [nextRun, setNextRun] = useState(nextScheduledRun);
  const [countdown, setCountdown] = useState("");

  const hasRunning = jobs.some((job) => job.status === "running");

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadJobs = useCallback(async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/admin/sync-jobs`, {
        ...authHeaders,
        params: { page: page + 1, limit: rowsPerPage },
      });
      setJobs(data.syncs || []);
      setTotal(data.pagination?.total || 0);
      setListError(null);
    } catch (err) {
      setListError(err.response?.data?.message || "Could not load sync history");
    } finally {
      setListLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, rowsPerPage]);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/admin/sync-jobs/stats`, {
        ...authHeaders,
        params: { days: 30 },
      });
      setStats(data);
    } catch (err) {
      console.error("Error fetching sync stats:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadDetail = useCallback(
    async (id) => {
      try {
        const { data } = await axios.get(`${apiUrl}/admin/sync-jobs/${id}`, authHeaders);
        setDetail(data);
        setDetailError(null);
        return data;
      } catch (err) {
        setDetailError(err.response?.data?.message || "Could not load this sync");
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  // The list and the stats load once; the list refreshes on its own schedule.
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadJobs();
    const timer = setInterval(loadJobs, hasRunning ? LIST_POLL_RUNNING_MS : LIST_POLL_IDLE_MS);
    return () => clearInterval(timer);
  }, [loadJobs, hasRunning]);

  // Open run: fetch it when selected, and keep fetching only while it runs.
  const detailRunning = detail?.inProgress === true && detail?.id === selectedId;
  useEffect(() => {
    if (!selectedId) return undefined;
    setDetail(null);
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedId || !detailRunning) return undefined;
    const timer = setInterval(async () => {
      const latest = await loadDetail(selectedId);
      if (latest && !latest.inProgress) {
        // Finished: refresh the list and stats once, polling stops by itself.
        loadJobs();
        loadStats();
      }
    }, DETAIL_POLL_MS);
    return () => clearInterval(timer);
  }, [selectedId, detailRunning, loadDetail, loadJobs, loadStats]);

  // Countdown to the next scheduled run
  useEffect(() => {
    const tick = () => {
      const ms = nextRun - Date.now();
      if (ms <= 0) {
        setNextRun(nextScheduledRun());
        setCountdown("Starting now...");
        return;
      }
      setCountdown(formatCountdown(ms));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextRun]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const startSync = async () => {
    setStarting(true);
    try {
      const { data } = await axios.post(`${apiUrl}/admin/sync-jobs`, {}, authHeaders);
      toast.success("Profile sync started");
      setPage(0);
      setSelectedId(data.syncId);
      loadJobs();
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.syncId) {
        toast.info("A sync is already running. Showing it.");
        setSelectedId(err.response.data.syncId);
      } else {
        toast.error(err.response?.data?.message || "Failed to start profile sync");
      }
    } finally {
      setStarting(false);
    }
  };

  const confirmCancel = async () => {
    const id = cancelTarget;
    setCancelling(true);
    try {
      await axios.post(`${apiUrl}/admin/sync-jobs/${id}/cancel`, {}, authHeaders);
      toast.info("Profile sync cancelled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel the sync");
    } finally {
      setCancelling(false);
      setCancelTarget(null);
      loadJobs();
      loadStats();
      if (id === selectedId) loadDetail(id);
    }
  };

  const exportFailedProfiles = () => {
    const rows = detail?.failedProfilesList || [];
    if (rows.length === 0) return toast.warning("No failed profiles to export");

    const headers = ["User", "Email", "Department", "Section", "Platform", "Username", "Error code", "Error", "Time"];
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(cell).join(","),
      ...rows.map((fp) =>
        [
          fp.userName,
          fp.userEmail,
          fp.userDepartment,
          fp.userSection,
          capitalize(fp.platform || ""),
          fp.platformUsername,
          fp.errorCode,
          fp.error,
          fp.timestamp ? new Date(fp.timestamp).toLocaleString() : "",
        ]
          .map(cell)
          .join(",")
      ),
    ].join("\n");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = `Failed_Profiles_${new Date(detail.startTime).toISOString().split("T")[0]}_${detail.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${rows.length} failed profile(s)`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Next scheduled run */}
        <Grid item xs={12}>
          <Card sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TimerIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Next Scheduled Profile Sync
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {countdown || "Calculating..."}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Daily at 12:00 AM IST
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Last 30 days */}
        {stats && (
          <Grid item xs={12}>
            <Paper sx={paperSx}>
              <Typography variant="h6" gutterBottom>
                Sync Statistics (Last 30 Days)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md>
                  <Stat label="Total Syncs" value={stats.totalSyncs || 0} />
                </Grid>
                <Grid item xs={6} md>
                  <Stat label="Successful" value={stats.successfulSyncs || 0} color="success.main" />
                </Grid>
                <Grid item xs={6} md>
                  <Stat label="Failed" value={stats.failedSyncs || 0} color="error.main" />
                </Grid>
                <Grid item xs={6} md>
                  <Stat label="Cancelled" value={stats.cancelledSyncs || 0} color="warning.main" />
                </Grid>
                <Grid item xs={12} md>
                  <Stat label="Profiles Updated" value={stats.totalProfilesUpdated || 0} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Scores and ranks (calculated after each sync; can be recalculated now) */}
        <Grid item xs={12}>
          <RankingsPanel token={token} />
        </Grid>

        {/* Run + history */}
        <Grid item xs={12}>
          <Paper sx={paperSx}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="h6">Profile Sync Jobs</Typography>
                <Typography variant="body2" color="text.secondary">
                  Every run, scheduled or manual. Click a run to see its progress and failed profiles.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    loadJobs();
                    loadStats();
                  }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={starting ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
                  onClick={startSync}
                  disabled={starting || hasRunning}
                >
                  {starting ? "Starting..." : hasRunning ? "Sync running" : "Run Profile Sync"}
                </Button>
              </Box>
            </Box>

            {listError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {listError}
              </Alert>
            )}

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Passed</TableCell>
                    <TableCell>Failed</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>Progress</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                          No sync has run yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job) => (
                      <TableRow key={job.id} hover sx={{ cursor: "pointer" }} onClick={() => setSelectedId(job.id)}>
                        <TableCell>
                          <StatusChip status={job.status} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" variant="outlined" label={job.jobType === "scheduled" ? "SCHEDULED" : "MANUAL"} />
                        </TableCell>
                        <TableCell>{new Date(job.startTime).toLocaleString()}</TableCell>
                        <TableCell>{formatDuration(job.elapsedSeconds)}</TableCell>
                        <TableCell>
                          {job.processedUsers}/{job.totalUsers}
                        </TableCell>
                        <TableCell sx={{ color: "success.main" }}>{job.updatedProfiles}</TableCell>
                        <TableCell sx={{ color: "error.main" }}>{job.failedProfiles}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={job.progress}
                              color={job.status === "running" ? "primary" : STATUS_COLOR[job.status] || "primary"}
                              sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">{job.progress}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="View details">
                            <IconButton size="small" onClick={() => setSelectedId(job.id)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {job.status === "running" && (
                            <Tooltip title="Cancel this sync">
                              <IconButton size="small" color="error" onClick={() => setCancelTarget(job.id)}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_e, next) => setPage(next)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* One run in detail */}
      <Dialog open={Boolean(selectedId)} onClose={() => setSelectedId(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            Sync Details
            {detail && detail.id === selectedId && <StatusChip status={detail.status} />}
          </Box>
          <IconButton onClick={() => setSelectedId(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailError && <Alert severity="error">{detailError}</Alert>}

          {!detailError && (!detail || detail.id !== selectedId) && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {detail && detail.id === selectedId && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {detail.jobType === "scheduled" ? "Scheduled" : "Manual"} run started{" "}
                {new Date(detail.startTime).toLocaleString()}
                {detail.triggeredBy?.name ? ` by ${detail.triggeredBy.name}` : ""}
              </Typography>

              <Box sx={{ my: 2 }}>
                <LinearProgress
                  variant={detail.inProgress && detail.progress === 0 ? "indeterminate" : "determinate"}
                  value={detail.progress}
                  color={STATUS_COLOR[detail.status] || "primary"}
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {detail.progress}% complete
                  {detail.inProgress && detail.totalUsers === 0 ? " (preparing...)" : ""}
                </Typography>
              </Box>

              {detail.error && detail.status !== "completed" && (
                <Alert severity={detail.status === "cancelled" ? "warning" : "error"} sx={{ mb: 2 }}>
                  {detail.error}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Stat label="Users processed" value={`${detail.processedUsers}/${detail.totalUsers}`} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Stat label="Profiles passed" value={detail.updatedProfiles} color="success.main" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Stat label="Profiles failed" value={detail.failedProfiles} color="error.main" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Stat label="Elapsed" value={formatDuration(detail.elapsedSeconds)} />
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mt: 3, mb: 1 }} color={detail.failedProfilesList.length ? "error" : "text.secondary"}>
                Failed Profiles ({detail.failedProfilesList.length})
              </Typography>

              {detail.failedProfilesList.length === 0 ? (
                <Alert severity="success">No failed profiles in this sync.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Platform</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.failedProfilesList.map((fp, index) => (
                        <TableRow key={`${fp.userId}-${fp.platform}-${index}`} hover>
                          <TableCell>{fp.userName || "Unknown"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={capitalize(fp.platform || "")}
                              sx={{ bgcolor: PLATFORM_COLOR[fp.platform] || "#757575", color: "white", fontWeight: "bold" }}
                            />
                          </TableCell>
                          <TableCell>{fp.platformUsername}</TableCell>
                          <TableCell>
                            <Tooltip title={fp.error || "Unknown error"} arrow>
                              <Typography
                                variant="body2"
                                sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "error.main", cursor: "help" }}
                              >
                                {fp.errorCode ? `[${fp.errorCode}] ` : ""}
                                {fp.error || "Unknown error"}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {PLATFORM_URL[fp.platform] && fp.platformUsername && (
                              <Tooltip title={`Open ${fp.platformUsername}'s profile`}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  component="a"
                                  href={PLATFORM_URL[fp.platform](fp.platformUsername)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Assessment fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {detail && detail.id === selectedId && detail.failedProfilesList.length > 0 && (
            <Button startIcon={<FileDownloadIcon />} onClick={exportFailedProfiles}>
              Export failed profiles
            </Button>
          )}
          {detail && detail.id === selectedId && detail.inProgress && (
            <Button color="error" onClick={() => setCancelTarget(detail.id)}>
              Cancel sync
            </Button>
          )}
          <Button onClick={() => setSelectedId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm cancel */}
      <Dialog open={Boolean(cancelTarget)} onClose={() => !cancelling && setCancelTarget(null)}>
        <DialogTitle>Cancel this sync?</DialogTitle>
        <DialogContent>
          <Typography>
            The sync stops after the profiles it is working on. Profiles already updated keep their new stats.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>
            Keep running
          </Button>
          <Button color="error" variant="contained" onClick={confirmCancel} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Cancel sync"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileSync;
