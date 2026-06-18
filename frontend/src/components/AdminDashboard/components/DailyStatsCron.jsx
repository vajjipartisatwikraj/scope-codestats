import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  List,
  ListItem,
  ListItemText,
  useTheme,
} from "@mui/material";
import {
  PlayArrow as PlayArrowIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import { apiUrl } from "../../../config/apiConfig";

const DailyStatsCron = ({
  token,
  loading: parentLoading,
  setLoading: parentSetLoading,
  setError: parentSetError,
}) => {
  const theme = useTheme();
  const [cronStatus, setCronStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeUntilNextRun, setTimeUntilNextRun] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Fetch cron status
  const fetchCronStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/admin/daily-maintenance-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setCronStatus(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching cron status:", err);
      setError(err.response?.data?.message || "Failed to fetch cron status");
      toast.error("Failed to load cron status");
    } finally {
      setLoading(false);
    }
  };

  // Manually trigger cron job
  const triggerCron = async () => {
    try {
      setTriggerLoading(true);
      const response = await axios.post(
        `${apiUrl}/admin/trigger-cron`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Daily maintenance job triggered successfully!");

      // Refresh status after a delay
      setTimeout(() => {
        fetchCronStatus();
      }, 2000);
    } catch (err) {
      console.error("Error triggering cron:", err);
      toast.error(err.response?.data?.message || "Failed to trigger cron job");
    } finally {
      setTriggerLoading(false);
    }
  };

  // Cancel running job
  const cancelJob = async () => {
    if (!cronStatus?.latestJob?._id) {
      toast.error("No job ID found to cancel");
      return;
    }

    try {
      setCancelLoading(true);
      const response = await axios.post(
        `${apiUrl}/admin/cancel-daily-maintenance/${cronStatus.latestJob._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success("Daily maintenance job cancelled successfully!");

        // Refresh status immediately
        fetchCronStatus();
      }
    } catch (err) {
      console.error("Error cancelling job:", err);
      toast.error(err.response?.data?.message || "Failed to cancel job");
    } finally {
      setCancelLoading(false);
    }
  };

  // Calculate time until next run (Fixed to 5:00 AM IST)
  useEffect(() => {
    const updateTimer = () => {
      // Get current time in IST directly
      const now = new Date();
      const istNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );

      // Create next 5:00 AM IST
      const nextRun = new Date(istNow);
      nextRun.setHours(5, 0, 0, 0);

      // If it's already past 5:00 AM today in IST, set to tomorrow
      if (istNow.getTime() >= nextRun.getTime()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      // Calculate difference in IST time
      const diff = nextRun.getTime() - istNow.getTime();

      if (diff <= 0) {
        setTimeUntilNextRun("Running soon...");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilNextRun(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  // LAZY LOAD: Fetch status on first mount and set up polling
  useEffect(() => {
    if (!hasLoadedData) {
      fetchCronStatus();
      setHasLoadedData(true);
    }

    // Poll every 3 seconds when running, otherwise every 15 seconds (only if data loaded)
    if (hasLoadedData) {
      const pollInterval =
        cronStatus?.latestJob?.status === "running" ? 3000 : 15000;
      const interval = setInterval(fetchCronStatus, pollInterval);

      return () => clearInterval(interval);
    }
  }, [token, cronStatus?.latestJob?.status, hasLoadedData]);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "success";
      case "partial":
        return "warning";
      case "failed":
        return "error";
      case "running":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon />;
      case "partial":
      case "failed":
        return <ErrorOutlineIcon />;
      case "running":
        return <PlayArrowIcon />;
      default:
        return null;
    }
  };

  if (loading && !cronStatus) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Header Section */}
      <Grid item xs={12}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            backgroundColor:
              theme.palette.mode === "dark" ? "#0A0A0A" : "white",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color:
                  theme.palette.mode === "dark" ? "#ffffff" : "text.primary",
              }}
            >
              Daily Stats Cron Job Monitor
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchCronStatus}
                disabled={loading}
              >
                Refresh
              </Button>
              {cronStatus?.latestJob?.status === "running" ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={cancelJob}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "Cancelling..." : "Cancel Job"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={triggerCron}
                  disabled={triggerLoading}
                >
                  {triggerLoading ? "Triggering..." : "Trigger Manual Run"}
                </Button>
              )}
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Next Run Timer */}
          <Card
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              mb: 2,
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TimerIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Next Scheduled Run
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {timeUntilNextRun || "Loading..."}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Daily at 5:00 AM IST
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Latest Execution Status */}
          {cronStatus?.latestJob && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Latest Execution{" "}
                  {cronStatus.latestJob.status === "running" && "(In Progress)"}
                </Typography>

                {/* Progress Bar - Show only when job is running */}
                {cronStatus.latestJob.status === "running" && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant={
                        cronStatus.latestJob.totalUsers > 0
                          ? "determinate"
                          : "indeterminate"
                      }
                      value={
                        cronStatus.latestJob.totalUsers > 0
                          ? ((cronStatus.latestJob.totalUsersProcessed || 0) /
                              cronStatus.latestJob.totalUsers) *
                            100
                          : 0
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {cronStatus.latestJob.totalUsers > 0
                        ? `${Math.round(
                            ((cronStatus.latestJob.totalUsersProcessed || 0) /
                              cronStatus.latestJob.totalUsers) *
                              100
                          )}% Complete`
                        : "Starting..."}
                    </Typography>
                  </Box>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        icon={getStatusIcon(cronStatus.latestJob.status)}
                        label={cronStatus.latestJob.status?.toUpperCase()}
                        color={getStatusColor(cronStatus.latestJob.status)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="h6">
                        {cronStatus.latestJob.duration || 0}s
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Users Processed
                      </Typography>
                      <Typography variant="h6">
                        {cronStatus.latestJob.totalUsersProcessed || 0}/
                        {cronStatus.latestJob.totalUsers || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Started At
                      </Typography>
                      <Typography variant="body1">
                        {new Date(
                          cronStatus.latestJob.startTime
                        ).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Success/Failed Stats - Show when job has processed users */}
                {cronStatus.latestJob.totalUsersProcessed > 0 && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Paper
                        sx={{
                          p: 2,
                          textAlign: "center",
                          backgroundColor: "rgba(76, 175, 80, 0.1)",
                          border: "1px solid rgba(76, 175, 80, 0.3)",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          ✅ Successful
                        </Typography>
                        <Typography
                          variant="h5"
                          color="success.main"
                          sx={{ fontWeight: 600 }}
                        >
                          {cronStatus.latestJob.successfulUsers || 0}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper
                        sx={{
                          p: 2,
                          textAlign: "center",
                          backgroundColor: "rgba(244, 67, 54, 0.1)",
                          border: "1px solid rgba(244, 67, 54, 0.3)",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          ❌ Failed
                        </Typography>
                        <Typography
                          variant="h5"
                          color="error.main"
                          sx={{ fontWeight: 600 }}
                        >
                          {cronStatus.latestJob.failedUsers || 0}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                {/* Document Counts */}
                {cronStatus.latestJob.documentCounts &&
                  Object.keys(cronStatus.latestJob.documentCounts).length >
                    0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Document Counts
                      </Typography>
                      <Grid container spacing={1}>
                        {Object.entries(
                          cronStatus.latestJob.documentCounts
                        ).map(([key, value]) => (
                          <Grid item xs={6} sm={4} md={2} key={key}>
                            <Paper
                              sx={{
                                p: 1,
                                textAlign: "center",
                                backgroundColor: "rgba(0,0,0,0.02)",
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block" }}
                              >
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </Typography>
                              <Typography variant="h6">{value}</Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                {/* Rank Calculation Stats */}
                {cronStatus.latestJob.rankCalculation && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Rank Calculation
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Paper
                          sx={{
                            p: 1,
                            textAlign: "center",
                            backgroundColor: "rgba(0,0,0,0.02)",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Ranked Users
                          </Typography>
                          <Typography variant="h6">
                            {cronStatus.latestJob.rankCalculation
                              .totalRankedUsers || 0}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper
                          sx={{
                            p: 1,
                            textAlign: "center",
                            backgroundColor: "rgba(0,0,0,0.02)",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Departments
                          </Typography>
                          <Typography variant="h6">
                            {cronStatus.latestJob.rankCalculation
                              .departmentsProcessed || 0}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper
                          sx={{
                            p: 1,
                            textAlign: "center",
                            backgroundColor: "rgba(0,0,0,0.02)",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Duration
                          </Typography>
                          <Typography variant="h6">
                            {cronStatus.latestJob.rankCalculation.duration || 0}
                            s
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Summary */}
                {cronStatus.latestJob.summary && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {cronStatus.latestJob.summary}
                  </Alert>
                )}

                {/* Errors */}
                {cronStatus.latestJob.errorLog &&
                  cronStatus.latestJob.errorLog.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Errors Encountered:{" "}
                        {cronStatus.latestJob.errorLog.length}
                      </Typography>
                      <List dense>
                        {cronStatus.latestJob.errorLog
                          .slice(0, 5)
                          .map((error, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={`${error.phase}: ${error.message}`}
                                secondary={
                                  error.userId
                                    ? `User ID: ${error.userId}`
                                    : new Date(error.timestamp).toLocaleString()
                                }
                              />
                            </ListItem>
                          ))}
                      </List>
                      {cronStatus.latestJob.errorLog.length > 5 && (
                        <Typography variant="caption" color="text.secondary">
                          ...and {cronStatus.latestJob.errorLog.length - 5} more
                          errors
                        </Typography>
                      )}
                    </Alert>
                  )}
              </CardContent>
            </Card>
          )}
        </Paper>
      </Grid>

      {/* Execution History Table */}
      <Grid item xs={12}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            backgroundColor:
              theme.palette.mode === "dark" ? "#0A0A0A" : "white",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            color={theme.palette.mode === "dark" ? "#ffffff" : "text.primary"}
          >
            Execution History
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Users</TableCell>
                  <TableCell>Success Rate</TableCell>
                  <TableCell>Job Type</TableCell>
                  <TableCell>Errors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cronStatus?.history && cronStatus.history.length > 0 ? (
                  cronStatus.history
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((execution, index) => (
                      <TableRow key={execution._id || index} hover>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(execution.status)}
                            label={execution.status?.toUpperCase()}
                            color={getStatusColor(execution.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(execution.startTime).toLocaleString(
                            "en-IN",
                            {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "short",
                              timeStyle: "short",
                            }
                          )}
                        </TableCell>
                        <TableCell>{execution.duration || 0}s</TableCell>
                        <TableCell>
                          {execution.successfulUsers || 0}/
                          {execution.totalUsers || 0}
                        </TableCell>
                        <TableCell>
                          {execution.totalUsers > 0
                            ? (
                                (execution.successfulUsers /
                                  execution.totalUsers) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={execution.jobType?.toUpperCase() || "AUTO"}
                            size="small"
                            variant="outlined"
                            color={
                              execution.jobType === "manual"
                                ? "primary"
                                : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>{execution.errorLog?.length || 0}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        No execution history available
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={cronStatus?.history?.length || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Grid>
    </Grid>
  );
};

export default DailyStatsCron;
