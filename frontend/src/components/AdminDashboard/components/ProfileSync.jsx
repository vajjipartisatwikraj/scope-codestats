import React, { useState, useEffect, useRef } from "react";
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Badge,
  Divider,
  useTheme,
} from "@mui/material";
import {
  Sync as SyncIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  FileDownload as FileDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  Assessment,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import { capitalize } from "../utils/helpers";
import { apiUrl } from "../../../config/apiConfig";

// Global state for active sync
const activeSyncState = {
  inProgress: false,
  setInProgress: (value) => {
    activeSyncState.inProgress = value;
  },
};

const ProfileSync = ({
  token,
  loading: parentLoading,
  setLoading: parentSetLoading,
  setError: parentSetError,
}) => {
  const theme = useTheme();
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncId, setSyncId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusPolling, setStatusPolling] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [failedProfiles, setFailedProfiles] = useState([]);
  const [justCancelledIds, setJustCancelledIds] = useState(new Set());

  // Refs to avoid stale closures in setInterval callbacks
  const cancellingRef = useRef(false); // true while a cancel is in progress or just completed
  const justCancelledIdsRef = useRef(new Set()); // mirror of justCancelledIds for use in intervals
  const syncIdRef = useRef(null); // mirror of syncId for use in intervals

  // New state for history and stats
  const [syncHistory, setSyncHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
  const [syncStats, setSyncStats] = useState(null);
  const [selectedSync, setSelectedSync] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [nextCronRun, setNextCronRun] = useState(null);
  const [timeUntilCron, setTimeUntilCron] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Function to check sync status
  const checkSyncStatus = async (id) => {
    try {
      // If there's no sync ID, exit early
      if (!id) {
        return;
      }

      // If a cancel is in progress or was just completed, skip polling to avoid overwriting cancelled state
      if (cancellingRef.current) {
        return;
      }

      // If we already know the sync is complete, don't make more API calls
      if (syncStatus && !syncStatus.inProgress) {
        return;
      }

      const response = await axios.get(`${apiUrl}/admin/sync-status/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // Add timeout to prevent hanging requests
        timeout: 10000,
      });

      // Always update the status first so UI reflects latest state
      // But skip if a cancel is in progress (the response may be stale)
      if (cancellingRef.current) {
        return;
      }
      setSyncStatus(response.data);

      // Check if there are failed profiles in the response
      if (
        response.data.failedProfilesList &&
        response.data.failedProfilesList.length > 0
      ) {
        setFailedProfiles(response.data.failedProfilesList);
      } else {
        // Reset the failed profiles list if there are none
        setFailedProfiles([]);
      }

      // If sync is complete (not in progress), stop polling and show notification (only once)
      if (!response.data.inProgress) {
        // Clear the interval if it exists
        if (statusPolling) {
          clearInterval(statusPolling);
          setStatusPolling(null);
        }

        // Update global active sync state
        activeSyncState.setInProgress(false);

        // Clear sync ID
        setSyncId(null);
        syncIdRef.current = null;

        // Show appropriate notification ONLY ONCE
        // We check if this is the first time we're detecting completion
        if (syncStatus && syncStatus.inProgress) {
          if (response.data.error) {
            toast.error(`Sync completed with errors: ${response.data.error}`);
          } else if (response.data.cancelled) {
            toast.info("Profile synchronization was cancelled");
          } else {
            toast.success("Profile synchronization completed successfully");
          }

          // Optimistically update the sync history to show completion immediately
          setSyncHistory((prevHistory) => {
            if (!prevHistory) return prevHistory;
            return prevHistory.map((sync) => {
              if (sync._id === id) {
                return {
                  ...sync,
                  status: response.data.cancelled ? "cancelled" : "completed",
                  duration: Math.floor(response.data.elapsedTime || 0),
                  processedUsers: response.data.processedUsers || 0,
                  updatedProfiles: response.data.updatedProfiles || 0,
                  failedProfiles: response.data.failedProfiles || 0,
                };
              }
              return sync;
            });
          });

          // Wait 2 seconds before refreshing to allow backend database update to complete
          setTimeout(() => {
            fetchSyncHistory();
            fetchSyncStats();
          }, 2000);
        }

        // Early return if sync is complete
        return;
      }
    } catch (err) {
      // Only stop polling on critical errors (404 means job not found)
      // For other errors, we'll continue polling to recover from temporary issues
      if (err.response && err.response.status === 404) {
        if (statusPolling) {
          clearInterval(statusPolling);
          setStatusPolling(null);
        }

        // Show error message to user
        toast.error(`Sync job not found. It may have been deleted or expired.`);

        // Reset sync state
        setSyncStatus(null);
        setSyncId(null);
        syncIdRef.current = null;
        activeSyncState.setInProgress(false);
      }
    }
  };

  // Function to start profile sync
  const startSync = async () => {
    try {
      setLoading(true);
      setError(null);

      // Reset cancellation guard
      cancellingRef.current = false;

      // Clear any existing polling
      if (statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }

      // Pre-initialize UI with starting state BEFORE making API call
      const tempId = `temp-${Date.now()}`;
      setSyncId(tempId);
      syncIdRef.current = tempId;
      setSyncStatus({
        id: tempId,
        inProgress: true,
        progress: 0,
        totalUsers: 0,
        processedUsers: 0,
        updatedProfiles: 0,
        failedProfiles: 0,
        totalProfiles: 0,
        elapsedTime: 0,
        startTime: new Date().toISOString(),
        error: null,
        cancelled: false,
        completedTime: null,
      });

      // Show single toast notification for starting sync
      toast.info("Starting profile synchronization...", {
        autoClose: 2000, // close after 2 seconds
      });

      // Set global active sync state
      activeSyncState.setInProgress(true);

      const response = await axios.post(
        `${apiUrl}/admin/sync-profiles`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success && response.data.syncId) {
        const newSyncId = response.data.syncId;

        // Update the sync ID with the real one from the server
        setSyncId(newSyncId);
        syncIdRef.current = newSyncId;

        // Update status with the real ID
        setSyncStatus((prevStatus) => ({
          ...prevStatus,
          id: newSyncId,
        }));

        // Make an immediate first check
        setTimeout(() => {
          checkSyncStatus(newSyncId);
        }, 1000);

        // Start polling for status updates (after a short delay to avoid race conditions)
        const intervalId = setInterval(() => {
          checkSyncStatus(newSyncId);
        }, 3000);

        setStatusPolling(intervalId);
      } else {
        throw new Error("Invalid response from server: missing syncId");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to start profile synchronization",
      );
      toast.error("Failed to start profile synchronization");

      // Reset states on error
      setSyncId(null);
      syncIdRef.current = null;
      setSyncStatus(null);
      activeSyncState.setInProgress(false);
    } finally {
      setLoading(false);
    }
  };

  // Function to cancel sync
  const cancelSync = async () => {
    if (!syncId) {
      toast.error("No active sync to cancel");
      return;
    }

    try {
      setCancelLoading(true);

      // Set cancelling guard BEFORE the API call to prevent stale poll responses from overwriting state
      cancellingRef.current = true;

      // Stop polling BEFORE the cancel request to minimize race window
      if (statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }

      const response = await axios.post(
        `${apiUrl}/admin/cancel-sync/${syncId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        const newStatus =
          response.data.cancelled === false &&
          response.data.message?.includes("already completed")
            ? "completed"
            : "cancelled";

        // Add to justCancelledIds to preserve status during polling (both state and ref)
        const cancelledId = syncId;
        setJustCancelledIds((prev) => {
          const next = new Set(prev).add(cancelledId);
          justCancelledIdsRef.current = next;
          return next;
        });

        // Immediately update the history table - use a new array reference to force re-render
        setSyncHistory((prevHistory) => {
          const updatedHistory = prevHistory.map((sync) => {
            if (sync._id === cancelledId) {
              return { ...sync, status: newStatus, inProgress: false };
            }
            return sync;
          });
          return updatedHistory;
        });

        // Show appropriate message
        if (newStatus === "completed") {
          toast.info("Sync job already completed");
        } else {
          toast.info("Profile synchronization cancelled");
        }

        // Update the status immediately using functional update to avoid stale closure
        setSyncStatus((prev) =>
          prev
            ? { ...prev, inProgress: false, cancelled: newStatus === "cancelled" }
            : prev,
        );

        // Update global active sync state
        activeSyncState.setInProgress(false);

        // Clear sync ID (polling already stopped above)
        setSyncId(null);
        syncIdRef.current = null;

        // Refresh from server after a brief delay to ensure consistency
        setTimeout(() => {
          fetchSyncHistory();
          fetchSyncStats();
        }, 1000);
      }
    } catch (err) {
      // Cancel API failed — re-enable polling since the sync is still running
      cancellingRef.current = false;
      if (syncId) {
        const intervalId = setInterval(() => {
          checkSyncStatus(syncId);
        }, 3000);
        setStatusPolling(intervalId);
      }
      toast.error(
        err.response?.data?.message || "Failed to cancel synchronization",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  // Function to cancel a specific sync job by ID (from history table)
  const cancelSyncById = async (id) => {
    if (!id) {
      return;
    }

    try {
      setCancelLoading(true);

      // Set cancelling guard if this is the active sync
      if (syncId === id) {
        cancellingRef.current = true;
        // Stop polling BEFORE the cancel request
        if (statusPolling) {
          clearInterval(statusPolling);
          setStatusPolling(null);
        }
      }

      const response = await axios.post(
        `${apiUrl}/admin/cancel-sync/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        const newStatus =
          response.data.cancelled === false &&
          response.data.message?.includes("already completed")
            ? "completed"
            : "cancelled";

        // Add to justCancelledIds to preserve status during polling (both state and ref)
        setJustCancelledIds((prev) => {
          const next = new Set(prev).add(id);
          justCancelledIdsRef.current = next;
          return next;
        });

        // Immediately update the history table - use a new array reference to force re-render
        setSyncHistory((prevHistory) => {
          const updatedHistory = prevHistory.map((sync) => {
            if (sync._id === id) {
              return { ...sync, status: newStatus, inProgress: false };
            }
            return sync;
          });
          return updatedHistory;
        });

        // Show appropriate message
        if (newStatus === "completed") {
          toast.info("Sync job already completed");
        } else {
          toast.success("Sync job stopped successfully");
        }

        // If this is the current active sync, update its status
        if (syncId === id) {
          setSyncStatus((prev) =>
            prev
              ? { ...prev, inProgress: false, cancelled: newStatus === "cancelled" }
              : prev,
          );

          // Update global active sync state
          activeSyncState.setInProgress(false);

          // Clear the sync ID (polling already stopped above)
          setSyncId(null);
          syncIdRef.current = null;
        }

        // Refresh from server after a brief delay to ensure consistency
        setTimeout(() => {
          fetchSyncHistory();
          fetchSyncStats();
        }, 1000);
      }
    } catch (err) {
      // If cancel failed and this was the active sync, restore polling
      if (syncId === id) {
        cancellingRef.current = false;
        const intervalId = setInterval(() => {
          checkSyncStatus(id);
        }, 3000);
        setStatusPolling(intervalId);
      }
      toast.error(err.response?.data?.message || "Failed to stop sync job");
    } finally {
      setCancelLoading(false);
    }
  };

  // Helper function to generate platform-specific URLs
  const getPlatformUrl = (platform, username) => {
    switch (platform.toLowerCase()) {
      case "leetcode":
        return `https://leetcode.com/${username}`;
      case "codeforces":
        return `https://codeforces.com/profile/${username}`;
      case "codechef":
        return `https://www.codechef.com/users/${username}`;
      case "hackerrank":
        return `https://www.hackerrank.com/${username}`;
      case "github":
        return `https://github.com/${username}`;
      default:
        return "#";
    }
  };

  // Get platform color
  const getPlatformColor = (platform) => {
    switch (platform.toLowerCase()) {
      case "leetcode":
        return "#FFA116";
      case "codeforces":
        return "#1E88E5";
      case "codechef":
        return "#5B4638";
      case "hackerrank":
        return "#00EA64";
      case "github":
        return "#333333";
      default:
        return "#757575";
    }
  };

  // Handle confirmation dialog
  const handleConfirmationClose = (shouldProceed) => {
    setOpenConfirmation(false);

    if (shouldProceed && pendingAction === "cancel") {
      cancelSync();
    } else if (pendingAction === "unload" && shouldProceed) {
      // Allow the page to unload
      window.onbeforeunload = null;
    }

    setPendingAction(null);
  };

  // Fetch sync history
  const fetchSyncHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await axios.get(
        `${apiUrl}/profile-sync/history?page=1&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Merge server data with our optimistically updated cancellations
      // Use ref for justCancelledIds to avoid stale closure issues in setInterval callbacks
      const serverHistory = response.data.history || [];
      const cancelledIds = justCancelledIdsRef.current;
      const mergedHistory = serverHistory.map((sync) => {
        // If we just cancelled this sync, keep our local cancelled/completed status
        if (cancelledIds.has(sync._id)) {
          // Find the current state in our local history
          const localSync = syncHistory.find((s) => s._id === sync._id);
          if (
            localSync &&
            (localSync.status === "cancelled" ||
              localSync.status === "completed")
          ) {
            return { ...sync, status: localSync.status };
          }
        }
        return sync;
      });

      setSyncHistory(mergedHistory);

      // Clean up justCancelledIds for syncs that are no longer in history
      setJustCancelledIds((prev) => {
        const newSet = new Set();
        mergedHistory.forEach((sync) => {
          if (
            prev.has(sync._id) &&
            (sync.status === "cancelled" || sync.status === "completed")
          ) {
            newSet.add(sync._id);
          }
        });
        justCancelledIdsRef.current = newSet;
        return newSet;
      });

      // Check if there's a running sync in the history
      const runningSync = mergedHistory.find(
        (sync) => sync.status === "running",
      );

      // Only restart polling if we're NOT in a cancellation state
      if (runningSync && !syncIdRef.current && !cancellingRef.current) {
        // Found a running sync and we don't have one tracked yet
        setSyncId(runningSync._id);
        syncIdRef.current = runningSync._id;

        // Start checking its status
        checkSyncStatus(runningSync._id);

        // Start polling
        const intervalId = setInterval(() => {
          checkSyncStatus(runningSync._id);
        }, 3000);
        setStatusPolling(intervalId);

        // Update global state
        activeSyncState.setInProgress(true);
      }
    } catch (err) {
      console.error("Error fetching sync history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch sync statistics
  const fetchSyncStats = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/profile-sync/stats/summary?days=30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSyncStats(response.data);
    } catch (err) {
      console.error("Error fetching sync stats:", err);
    }
  };

  // Fetch sync details
  const fetchSyncDetails = async (id) => {
    try {
      const response = await axios.get(`${apiUrl}/profile-sync/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedSync(response.data);
      setDetailsDialogOpen(true);
    } catch (err) {
      toast.error("Failed to fetch sync details");
    }
  };

  // Calculate next cron run time (12:00 AM IST daily)
  const calculateNextCronRun = () => {
    const now = new Date();
    const nextRun = new Date(now);

    // Set to 12:00 AM (midnight)
    nextRun.setHours(0, 0, 0, 0);

    // If it's already past midnight today, set to tomorrow
    if (now >= nextRun) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    setNextCronRun(nextRun);
  };

  // Update time until next cron run
  const updateTimeUntilCron = () => {
    if (!nextCronRun) return;

    const now = new Date();
    const diff = nextCronRun - now;

    if (diff <= 0) {
      setTimeUntilCron("Running now...");
      calculateNextCronRun(); // Recalculate for next day
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeUntilCron(`${hours}h ${minutes}m ${seconds}s`);
  };

  // Export failed profiles to Excel
  const exportFailedProfilesToExcel = () => {
    if (
      !selectedSync?.failedProfileDetails ||
      selectedSync.failedProfileDetails.length === 0
    ) {
      toast.warning("No failed profiles to export");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = selectedSync.failedProfileDetails.map((fp, index) => ({
        "S.No": index + 1,
        "User Name": fp.userName || "N/A",
        Email: fp.userEmail || "N/A",
        Department: fp.userDepartment || "N/A",
        Section: fp.userSection || "N/A",
        "Graduating Year": fp.userYear || "N/A",
        Platform: capitalize(fp.platform) || "N/A",
        "Platform Username": fp.platformUsername || "N/A",
        "Error Code": fp.errorCode || "N/A",
        "Error Message": fp.error || "Unknown error",
        Timestamp: fp.timestamp
          ? new Date(fp.timestamp).toLocaleString()
          : "N/A",
      }));

      // Convert to CSV format
      const headers = Object.keys(excelData[0]);
      const csvContent = [
        headers.join(","),
        ...excelData.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // Escape commas and quotes in values
              const escaped = String(value).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(","),
        ),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const syncDate = selectedSync.startTime
        ? new Date(selectedSync.startTime).toISOString().split("T")[0]
        : "unknown";
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Failed_Profiles_${syncDate}_${selectedSync._id || "export"}.csv`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${excelData.length} failed profile(s) to CSV`);
    } catch (error) {
      console.error("Error exporting failed profiles:", error);
      toast.error("Failed to export failed profiles");
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "running":
        return "info";
      case "failed":
        return "error";
      case "cancelled":
        return "warning";
      default:
        return "default";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon />;
      case "running":
        return <CircularProgress size={16} />;
      case "failed":
        return <ErrorIcon />;
      case "cancelled":
        return <CancelIcon />;
      default:
        return null;
    }
  };

  // Pagination handlers
  const handleHistoryPageChange = (event, newPage) => {
    setHistoryPage(newPage);
  };

  const handleHistoryRowsPerPageChange = (event) => {
    setHistoryRowsPerPage(parseInt(event.target.value, 10));
    setHistoryPage(0);
  };

  // LAZY LOAD: Initialize on first mount only
  useEffect(() => {
    if (!hasLoadedData) {
      fetchSyncHistory(); // This will also check for running syncs
      fetchSyncStats();
      calculateNextCronRun();
      setHasLoadedData(true);
    }
  }, [token, hasLoadedData]);

  // Set up polling for history refresh
  useEffect(() => {
    // Poll every 3 seconds if there's a sync running, otherwise every 15 seconds
    const pollInterval = syncStatus && syncStatus.inProgress ? 3000 : 15000;

    const interval = setInterval(() => {
      fetchSyncHistory();
      if (syncStatus && syncStatus.inProgress) {
        fetchSyncStats();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [token, syncStatus?.inProgress]);

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (nextCronRun) {
        const now = new Date();
        const diff = nextCronRun - now;

        if (diff <= 0) {
          setTimeUntilCron("Running now...");
          calculateNextCronRun(); // Recalculate for next day
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeUntilCron(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextCronRun]);

  // Refresh history when sync completes
  useEffect(() => {
    if (syncStatus && !syncStatus.inProgress) {
      // Refresh history after a brief delay to ensure DB is updated
      setTimeout(() => {
        fetchSyncHistory();
        fetchSyncStats();
      }, 1000);
    }
  }, [syncStatus?.inProgress]);

  // Setup beforeunload event handler
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (syncStatus && syncStatus.inProgress) {
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue =
          "Profile sync is in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    if (syncStatus && syncStatus.inProgress) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [syncStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    // Return cleanup function
    return () => {
      // Always clear the interval when unmounting to prevent memory leaks
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, [statusPolling]);

  // Update global active sync state when component unmounts
  useEffect(() => {
    // Return cleanup function
    return () => {
      // Always reset the in-progress state when unmounting
      activeSyncState.setInProgress(false);
    };
  }, []);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Next Cron Run Card */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TimerIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Next Scheduled Profile Sync
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {timeUntilCron || "Calculating..."}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Daily at 12:00 AM IST
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics Summary */}
        {syncStats && (
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
              <Typography variant="h6" gutterBottom color="#ffffff">
                Sync Statistics (Last 30 Days)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid #232323"
                          : "1px solid rgba(0,0,0,0.1)",
                    }}
                  >
                    <Typography variant="h4" color="#ffffff">
                      {syncStats.totalSyncs || 0}
                    </Typography>
                    <Typography variant="body2" color="#cccccc">
                      Total Syncs
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      backgroundColor: "rgba(76, 175, 80, 0.1)",
                    }}
                  >
                    <Typography variant="h4" color="success.main">
                      {syncStats.successfulSyncs || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Successful
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      backgroundColor: "rgba(244, 67, 54, 0.1)",
                    }}
                  >
                    <Typography variant="h4" color="error.main">
                      {syncStats.failedSyncs || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      backgroundColor: "rgba(255, 152, 0, 0.1)",
                    }}
                  >
                    <Typography variant="h4" color="warning.main">
                      {syncStats.cancelledSyncs || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cancelled
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <Typography variant="h5">
                      {syncStats.totalProfilesUpdated || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Profiles Updated
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <Typography variant="h5">
                      {syncStats.averageDuration
                        ? `${Math.round(syncStats.averageDuration)}s`
                        : "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Duration
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <Typography variant="h5">
                      {syncStats.averageSuccessRate
                        ? `${syncStats.averageSuccessRate.toFixed(1)}%`
                        : "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Success Rate
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Current Sync/Manual Trigger */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Manual Profile Synchronization
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Manually trigger the synchronization of all user profiles with
              external platforms. This process normally runs automatically at
              12:00 AM daily.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SyncIcon />}
                onClick={startSync}
                disabled={loading || (syncStatus && syncStatus.inProgress)}
              >
                {loading ? "Starting..." : "Sync All Profiles"}
              </Button>

              {syncStatus && syncStatus.inProgress && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setOpenConfirmation(true);
                    setPendingAction("cancel");
                  }}
                  disabled={cancelLoading}
                  startIcon={
                    cancelLoading ? <CircularProgress size={20} /> : null
                  }
                >
                  {cancelLoading ? "Cancelling..." : "Cancel Sync"}
                </Button>
              )}
            </Box>

            {syncStatus && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Sync Progress{" "}
                  {syncStatus.inProgress
                    ? "(In Progress)"
                    : syncStatus.cancelled
                      ? "(Cancelled)"
                      : "(Completed)"}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant={
                      syncStatus.progress > 0 ? "determinate" : "indeterminate"
                    }
                    value={syncStatus.progress}
                    color={
                      syncStatus.error
                        ? "error"
                        : syncStatus.cancelled
                          ? "warning"
                          : "primary"
                    }
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {syncStatus.progress}% Complete
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="h5">
                        {syncStatus.processedUsers}/
                        {syncStatus.totalUsers || "?"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Users Processed
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="h5" color="success.main">
                        {syncStatus.updatedProfiles}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Profiles Updated
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="h5" color="error.main">
                        {syncStatus.failedProfiles}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Profiles Failed
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="h5">
                        {syncStatus.elapsedTime}s
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Elapsed Time
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Failed Profiles Section */}
                <Box sx={{ mt: 4 }}>
                  <Typography
                    variant="h6"
                    color={
                      failedProfiles.length > 0 ? "error" : "text.secondary"
                    }
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Badge
                      badgeContent={failedProfiles.length}
                      color="error"
                      sx={{ mr: 2 }}
                    >
                      <Assessment />
                    </Badge>
                    Failed Profiles
                  </Typography>

                  {failedProfiles.length === 0 ? (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      No failed profiles detected in this synchronization.
                    </Alert>
                  ) : (
                    <>
                      <TableContainer
                        component={Paper}
                        sx={{ mt: 2, maxHeight: 400, overflowY: "auto" }}
                      >
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: "bold" }}>
                                User
                              </TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>
                                Platform
                              </TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>
                                Username
                              </TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>
                                Error
                              </TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>
                                Actions
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {failedProfiles.map((profile, index) => (
                              <TableRow key={index} hover>
                                <TableCell>
                                  {profile.userName || "Unknown"}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={capitalize(profile.platform)}
                                    size="small"
                                    sx={{
                                      bgcolor: getPlatformColor(
                                        profile.platform,
                                      ),
                                      color: "white",
                                      fontWeight: "bold",
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {profile.platformUsername}
                                </TableCell>
                                <TableCell>
                                  <Tooltip
                                    title={profile.error || "Unknown error"}
                                    placement="top"
                                    arrow
                                    componentsProps={{
                                      tooltip: {
                                        sx: {
                                          maxWidth: 350,
                                          fontSize: "0.75rem",
                                          bgcolor: "error.dark",
                                          "& .MuiTooltip-arrow": {
                                            color: "error.dark",
                                          },
                                        },
                                      },
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        maxWidth: 250,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        cursor: "help",
                                        color: "error.main",
                                      }}
                                    >
                                      {profile.error || "Unknown error"}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  <Tooltip
                                    title={`Visit ${
                                      profile.platformUsername
                                    }'s ${capitalize(
                                      profile.platform,
                                    )} profile`}
                                  >
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      component="a"
                                      href={getPlatformUrl(
                                        profile.platform,
                                        profile.platformUsername,
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Assessment fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box
                        sx={{
                          mt: 2,
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FileDownloadIcon />}
                          onClick={() => {
                            // Export failed profiles to CSV
                            const headers = [
                              "User",
                              "Email",
                              "Platform",
                              "Username",
                              "Error",
                              "Timestamp",
                            ];
                            const csvContent = [
                              headers.join(","),
                              ...failedProfiles.map((profile) =>
                                [
                                  profile.userName || "Unknown",
                                  profile.userEmail || "",
                                  profile.platform,
                                  profile.platformUsername,
                                  profile.error
                                    ? `"${profile.error.replace(/"/g, '""')}"`
                                    : "",
                                  profile.timestamp || new Date().toISOString(),
                                ].join(","),
                              ),
                            ].join("\n");

                            const blob = new Blob([csvContent], {
                              type: "text/csv;charset=utf-8;",
                            });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute(
                              "download",
                              `failed-profiles-${
                                new Date().toISOString().split("T")[0]
                              }.csv`,
                            );
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);

                            toast.success(
                              `Exported ${failedProfiles.length} failed profiles to CSV`,
                            );
                          }}
                        >
                          Export Failed Profiles
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>

                {syncStatus.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    Error: {syncStatus.error}
                  </Alert>
                )}

                {syncStatus.cancelled && !syncStatus.inProgress && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Profile synchronization was cancelled.
                  </Alert>
                )}

                {!syncStatus.inProgress &&
                  !syncStatus.error &&
                  !syncStatus.cancelled && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Profile synchronization completed successfully!
                    </Alert>
                  )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Sync History Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Sync History</Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  fetchSyncHistory();
                  fetchSyncStats();
                }}
                disabled={historyLoading}
              >
                Refresh
              </Button>
            </Box>

            {historyLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Users</TableCell>
                        <TableCell>Profiles Updated</TableCell>
                        <TableCell>Failed</TableCell>
                        <TableCell>Success Rate</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {syncHistory && syncHistory.length > 0 ? (
                        syncHistory
                          .slice(
                            historyPage * historyRowsPerPage,
                            historyPage * historyRowsPerPage +
                              historyRowsPerPage,
                          )
                          .map((sync) => {
                            const totalAttempted =
                              (sync.updatedProfiles || 0) +
                              (sync.failedProfiles || 0);
                            const successRate =
                              totalAttempted > 0
                                ? (
                                    (sync.updatedProfiles / totalAttempted) *
                                    100
                                  ).toFixed(1)
                                : 0;

                            return (
                              <TableRow key={sync._id} hover>
                                <TableCell>
                                  <Chip
                                    icon={getStatusIcon(sync.status)}
                                    label={sync.status?.toUpperCase()}
                                    color={getStatusColor(sync.status)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={sync.jobType?.toUpperCase()}
                                    size="small"
                                    variant="outlined"
                                    color={
                                      sync.jobType === "manual"
                                        ? "primary"
                                        : "default"
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  {new Date(sync.startTime).toLocaleString(
                                    "en-IN",
                                    {
                                      timeZone: "Asia/Kolkata",
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    },
                                  )}
                                </TableCell>
                                <TableCell>{sync.duration || 0}s</TableCell>
                                <TableCell>
                                  {sync.processedUsers}/{sync.totalUsers || 0}
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    color="success.main"
                                  >
                                    {sync.updatedProfiles || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    color="error.main"
                                  >
                                    {sync.failedProfiles || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <LinearProgress
                                      variant="determinate"
                                      value={parseFloat(successRate)}
                                      sx={{
                                        flex: 1,
                                        height: 6,
                                        borderRadius: 3,
                                      }}
                                      color={
                                        parseFloat(successRate) >= 90
                                          ? "success"
                                          : parseFloat(successRate) >= 70
                                            ? "warning"
                                            : "error"
                                      }
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{ minWidth: 45 }}
                                    >
                                      {successRate}%
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: "flex", gap: 1 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => fetchSyncDetails(sync._id)}
                                      color="primary"
                                      title="View Details"
                                    >
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    {sync.status === "running" && (
                                      <IconButton
                                        size="small"
                                        onClick={() => cancelSyncById(sync._id)}
                                        color="error"
                                        title="Stop Sync"
                                        disabled={cancelLoading}
                                      >
                                        <CancelIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography color="text.secondary">
                              No sync history available
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={syncHistory?.length || 0}
                  rowsPerPage={historyRowsPerPage}
                  page={historyPage}
                  onPageChange={handleHistoryPageChange}
                  onRowsPerPageChange={handleHistoryRowsPerPageChange}
                />
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Sync Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor:
              theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
            color: "white",
            pb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h5" fontWeight="bold">
                Sync Details
              </Typography>
              {selectedSync && (
                <Chip
                  icon={getStatusIcon(selectedSync.status)}
                  label={selectedSync.status?.toUpperCase()}
                  color={getStatusColor(selectedSync.status)}
                  sx={{
                    fontWeight: "bold",
                    bgcolor:
                      theme.palette.mode === "dark" ? "grey.800" : "white",
                    color:
                      selectedSync.status === "completed"
                        ? "success.main"
                        : selectedSync.status === "failed"
                          ? "error.main"
                          : "primary.main",
                  }}
                />
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            bgcolor: theme.palette.mode === "dark" ? "#121212" : "grey.50",
          }}
        >
          {selectedSync && (
            <Box>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    Job Type
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {selectedSync.jobType?.toUpperCase()}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {selectedSync.duration || 0} seconds
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    Updated
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="600"
                    color="success.main"
                  >
                    {selectedSync.updatedProfiles || 0}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    Failed
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="600"
                    color="error.main"
                  >
                    {selectedSync.failedProfiles || 0}
                  </Typography>
                </Grid>
              </Grid>

              {/* Timing and User Details */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Start Time
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedSync.startTime).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    End Time
                  </Typography>
                  <Typography variant="body2">
                    {selectedSync.endTime
                      ? new Date(selectedSync.endTime).toLocaleString()
                      : "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Total Users
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {selectedSync.totalUsers || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Processed
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {selectedSync.processedUsers || 0}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {selectedSync.platformStats &&
                selectedSync.platformStats.length > 0 && (
                  <>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      fontWeight="600"
                      sx={{ mt: 2, mb: 1 }}
                    >
                      Platform Statistics
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Platform</TableCell>
                            <TableCell align="center">Total</TableCell>
                            <TableCell align="center">Success</TableCell>
                            <TableCell align="center">Failed</TableCell>
                            <TableCell align="center">Avg Time (ms)</TableCell>
                            <TableCell align="center">Success Rate</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedSync.platformStats.map((ps) => {
                            const successRate =
                              ps.totalProfiles > 0
                                ? (
                                    (ps.successfulProfiles / ps.totalProfiles) *
                                    100
                                  ).toFixed(1)
                                : 0;
                            return (
                              <TableRow key={ps.platform}>
                                <TableCell>{capitalize(ps.platform)}</TableCell>
                                <TableCell align="center">
                                  {ps.totalProfiles || 0}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ color: "success.main" }}
                                >
                                  {ps.successfulProfiles || 0}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ color: "error.main" }}
                                >
                                  {ps.failedProfiles || 0}
                                </TableCell>
                                <TableCell align="center">
                                  {ps.averageResponseTime || 0}ms
                                </TableCell>
                                <TableCell align="center">
                                  {successRate}%
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

              {selectedSync.failedProfiles === 0 &&
                selectedSync.updatedProfiles > 0 && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="600">
                      All Users Successfully Synced
                    </Typography>
                    <Typography variant="caption">
                      All {selectedSync.updatedProfiles} profile(s) were updated
                      successfully without any errors.
                    </Typography>
                  </Alert>
                )}

              {selectedSync.failedProfileDetails &&
                selectedSync.failedProfileDetails.length > 0 && (
                  <>
                    <Box
                      sx={{
                        mt: 3,
                        mb: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="600">
                        Failed Profiles (
                        {selectedSync.failedProfileDetails.length})
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<FileDownloadIcon />}
                        onClick={exportFailedProfilesToExcel}
                      >
                        Export to Excel
                      </Button>
                    </Box>

                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{
                        maxHeight: 300,
                        overflow: "auto",
                      }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>User Details</TableCell>
                            <TableCell>Class Info</TableCell>
                            <TableCell>Platform</TableCell>
                            <TableCell>Username</TableCell>
                            <TableCell>Error Details</TableCell>
                            <TableCell>Time</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedSync.failedProfileDetails.map((fp, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Box sx={{ py: 0.5 }}>
                                  <Typography variant="body2" fontWeight="600">
                                    {fp.userName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {fp.userEmail}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ py: 0.5 }}>
                                  <Typography variant="body2" fontWeight="600">
                                    {fp.userDepartment || "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    {fp.userSection
                                      ? `Section: ${fp.userSection}`
                                      : "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {fp.userYear
                                      ? `Year: ${fp.userYear}`
                                      : "N/A"}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {capitalize(fp.platform)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  fontFamily="monospace"
                                >
                                  {fp.platformUsername || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Tooltip
                                  title={fp.error || "Unknown error"}
                                  arrow
                                  placement="top"
                                >
                                  <Box>
                                    {fp.errorCode && (
                                      <Typography
                                        variant="caption"
                                        display="block"
                                        fontWeight="600"
                                      >
                                        {fp.errorCode}
                                      </Typography>
                                    )}
                                    <Typography
                                      variant="body2"
                                      color="error.main"
                                      sx={{
                                        maxWidth: 300,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        cursor: "help",
                                      }}
                                    >
                                      {fp.error || "Unknown error"}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  {fp.timestamp
                                    ? new Date(
                                        fp.timestamp,
                                      ).toLocaleTimeString()
                                    : "N/A"}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

              {selectedSync.errors && selectedSync.errors.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 3, mb: 1 }} color="error">
                    Errors ({selectedSync.errors.length})
                  </Typography>
                  <List dense>
                    {selectedSync.errors.slice(0, 5).map((err, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={`${err.phase}: ${err.message}`}
                          secondary={new Date(err.timestamp).toLocaleString()}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {selectedSync.errors.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      ...and {selectedSync.errors.length - 5} more errors
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmation}
        onClose={() => handleConfirmationClose(false)}
        container={() =>
          document.getElementById("dialog-container") || document.body
        }
        disableEnforceFocus
      >
        <DialogTitle>
          {pendingAction === "cancel"
            ? "Cancel Synchronization?"
            : "Leave Page?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {pendingAction === "cancel"
              ? "Are you sure you want to cancel the profile synchronization? This will stop updating any remaining user profiles."
              : "Profile synchronization is still in progress. Leaving this page will not stop the process, but you won't be able to see the progress. Are you sure you want to leave?"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleConfirmationClose(false)}
            color="primary"
          >
            No, Stay
          </Button>
          <Button
            onClick={() => handleConfirmationClose(true)}
            color="error"
            variant="contained"
          >
            Yes, {pendingAction === "cancel" ? "Cancel Sync" : "Leave Page"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileSync;
