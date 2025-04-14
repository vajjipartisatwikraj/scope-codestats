import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  useTheme,
  Tabs,
  Tab,
  Alert,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Chip,
  FormControl,
  Select,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Badge,
  useMediaQuery,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  TextField,
  LinearProgress,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
  TrendingUp,
  People,
  Assessment,
  FilterList,
  Code,
  PieChart as PieChartIcon,
  Leaderboard as LeaderboardIcon,
  FileDownload as FileDownloadIcon,
  Sync as SyncIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Sector,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area
} from 'recharts';
import axios from 'axios';
import * as XLSX from 'exceljs';
import { activeSyncState } from '../contexts/AuthContext';
import { apiUrl } from '../config/apiConfig';

// Color palette for charts
const PLATFORM_COLORS = {
  leetcode: '#FFA116',
  codeforces: '#1E88E5',
  codechef: '#5B4638',
  geeksforgeeks: '#2F8D46',
  hackerrank: '#00EA64'
};

// Fallback colors for platforms
const CHART_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];

// Capitalize first letter
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Function to format days in specific order: Wed, Thu, Fri, Sat, Sun, Mon, Tue
const formatDaysInOrder = (data) => {
  // Define the order of days (starting from Wednesday)
  const dayOrder = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
  
  // Sort data based on the day abbreviation
  if (Array.isArray(data)) {
    return [...data].sort((a, b) => {
      const dayA = a.day || new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      const dayB = b.day || new Date(b.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
    });
  }
  
  return data;
};

// Helper function to get ordered days for weekly data
const getOrderedWeeklyData = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  // Create an ordered template with all days
  const dayOrder = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
  const result = [];
  
  // Map the actual data to the ordered template
  dayOrder.forEach(dayAbbr => {
    const matchingDay = data.find(item => {
      const itemDay = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      return itemDay === dayAbbr;
    });
    
    if (matchingDay) {
      result.push(matchingDay);
    }
  });
  
  return result;
};

// Create a new component for profile sync management
const ProfileSyncTab = ({ token }) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncId, setSyncId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusPolling, setStatusPolling] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [failedProfiles, setFailedProfiles] = useState([]);

  // Function to check sync status
  const checkSyncStatus = async (id) => {
    try {
      // If there's no sync ID, exit early
      if (!id) {
        return;
      }

      // If we already know the sync is complete, don't make more API calls
      if (syncStatus && !syncStatus.inProgress) {
        return;
      }

      const response = await axios.get(`${apiUrl}/admin/sync-status/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging requests
        timeout: 10000
      });
      
      // Always update the status first so UI reflects latest state
      setSyncStatus(response.data);
      
      // Check if there are failed profiles in the response
      if (response.data.failedProfilesList && response.data.failedProfilesList.length > 0) {
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
        
        // Show appropriate notification ONLY ONCE
        // We check if this is the first time we're detecting completion
        if (syncStatus && syncStatus.inProgress) {
          if (response.data.error) {
            toast.error(`Sync completed with errors: ${response.data.error}`);
          } else if (response.data.cancelled) {
            toast.info('Profile synchronization was cancelled');
          } else {
            toast.success('Profile synchronization completed successfully');
          }
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
        activeSyncState.setInProgress(false);
      }
    }
  };

  // Function to start profile sync
  const startSync = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing polling
      if (statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }
      
      // Pre-initialize UI with starting state BEFORE making API call
      const tempId = `temp-${Date.now()}`;
      setSyncId(tempId);
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
        completedTime: null
      });
      
      // Show single toast notification for starting sync
      toast.info('Starting profile synchronization...', {
        autoClose: 2000 // close after 2 seconds
      });
      
      // Set global active sync state
      activeSyncState.setInProgress(true);
      
      const response = await axios.post(`${apiUrl}/admin/sync-profiles`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success && response.data.syncId) {
        const newSyncId = response.data.syncId;
        
        // Update the sync ID with the real one from the server
        setSyncId(newSyncId);
        
        // Update status with the real ID 
        setSyncStatus(prevStatus => ({
          ...prevStatus,
          id: newSyncId
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
        throw new Error('Invalid response from server: missing syncId');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start profile synchronization');
      toast.error('Failed to start profile synchronization');
      
      // Reset states on error
      setSyncId(null);
      setSyncStatus(null);
      activeSyncState.setInProgress(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to cancel sync
  const cancelSync = async () => {
    if (!syncId) return;
    
    try {
      setCancelLoading(true);
      
      const response = await axios.post(`${apiUrl}/admin/cancel-sync/${syncId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        toast.info('Profile synchronization cancelled');
        
        // Update the status immediately
        if (syncStatus) {
          setSyncStatus({
            ...syncStatus,
            inProgress: false,
            cancelled: true
          });
        }
        
        // Update global active sync state
        activeSyncState.setInProgress(false);
        
        // Stop polling
        if (statusPolling) {
          clearInterval(statusPolling);
          setStatusPolling(null);
        }
      }
    } catch (err) {
      toast.error('Failed to cancel synchronization');
    } finally {
      setCancelLoading(false);
    }
  };
  
  // Helper function to generate platform-specific URLs
  const getPlatformUrl = (platform, username) => {
    switch (platform.toLowerCase()) {
      case 'leetcode':
        return `https://leetcode.com/${username}`;
      case 'codeforces':
        return `https://codeforces.com/profile/${username}`;
      case 'codechef':
        return `https://www.codechef.com/users/${username}`;
      case 'geeksforgeeks':
        return `https://auth.geeksforgeeks.org/user/${username}`;
      case 'hackerrank':
        return `https://www.hackerrank.com/${username}`;
      case 'github':
        return `https://github.com/${username}`;
      default:
        return '#';
    }
  };
  
  // Get platform color
  const getPlatformColor = (platform) => {
    switch (platform.toLowerCase()) {
      case 'leetcode':
        return '#FFA116';
      case 'codeforces':
        return '#1E88E5';
      case 'codechef':
        return '#5B4638';
      case 'geeksforgeeks':
        return '#2F8D46';
      case 'hackerrank':
        return '#00EA64';
      case 'github':
        return '#333333';
      default:
        return '#757575';
    }
  };
  
  // Handle confirmation dialog
  const handleConfirmationClose = (shouldProceed) => {
    setOpenConfirmation(false);
    
    if (shouldProceed && pendingAction === 'cancel') {
      cancelSync();
    } else if (pendingAction === 'unload' && shouldProceed) {
      // Allow the page to unload
      window.onbeforeunload = null;
    }
    
    setPendingAction(null);
  };
  
  // Setup beforeunload event handler
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (syncStatus && syncStatus.inProgress) {
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue = 'Profile sync is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    if (syncStatus && syncStatus.inProgress) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Profile Synchronization
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Manually trigger the synchronization of all user profiles with external platforms.
              This process normally runs automatically at 12:00 AM daily.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SyncIcon />}
                onClick={startSync}
                disabled={loading || (syncStatus && syncStatus.inProgress)}
              >
                {loading ? 'Starting...' : 'Sync All Profiles'}
              </Button>
              
              {syncStatus && syncStatus.inProgress && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setOpenConfirmation(true);
                    setPendingAction('cancel');
                  }}
                  disabled={cancelLoading}
                  startIcon={cancelLoading ? <CircularProgress size={20} /> : null}
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Sync'}
                </Button>
              )}
            </Box>
            
            {syncStatus && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Sync Progress {syncStatus.inProgress ? '(In Progress)' : syncStatus.cancelled ? '(Cancelled)' : '(Completed)'}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <LinearProgress 
                    variant={syncStatus.progress > 0 ? "determinate" : "indeterminate"} 
                    value={syncStatus.progress} 
                    color={syncStatus.error ? "error" : syncStatus.cancelled ? "warning" : "primary"}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {syncStatus.progress}% Complete
                  </Typography>
                </Box>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5">
                        {syncStatus.processedUsers}/{syncStatus.totalUsers || '?'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Users Processed
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">
                        {syncStatus.updatedProfiles}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Profiles Updated
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main">
                        {syncStatus.failedProfiles}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Profiles Failed
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
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
                  <Typography variant="h6" color={failedProfiles.length > 0 ? "error" : "text.secondary"} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <Badge badgeContent={failedProfiles.length} color="error" sx={{ mr: 2 }}>
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
                      <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Platform</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Error</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {failedProfiles.map((profile, index) => (
                              <TableRow key={index} hover>
                                <TableCell>{profile.userName || 'Unknown'}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={capitalize(profile.platform)}
                                    size="small"
                                    sx={{ 
                                      bgcolor: getPlatformColor(profile.platform),
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{profile.platformUsername}</TableCell>
                                <TableCell>
                                  <Tooltip 
                                    title={profile.error || 'Unknown error'} 
                                    placement="top"
                                    arrow
                                    componentsProps={{
                                      tooltip: {
                                        sx: {
                                          maxWidth: 350,
                                          fontSize: '0.75rem',
                                          bgcolor: 'error.dark',
                                          '& .MuiTooltip-arrow': {
                                            color: 'error.dark',
                                          },
                                        },
                                      },
                                    }}
                                  >
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        maxWidth: 250, 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        cursor: 'help',
                                        color: 'error.main'
                                      }}
                                    >
                                      {profile.error || 'Unknown error'}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  <Tooltip title={`Visit ${profile.platformUsername}'s ${capitalize(profile.platform)} profile`}>
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      component="a"
                                      href={getPlatformUrl(profile.platform, profile.platformUsername)}
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
                      
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FileDownloadIcon />}
                          onClick={() => {
                            // Export failed profiles to CSV
                            const headers = ['User', 'Email', 'Platform', 'Username', 'Error', 'Timestamp'];
                            const csvContent = [
                              headers.join(','),
                              ...failedProfiles.map(profile => [
                                profile.userName || 'Unknown',
                                profile.userEmail || '',
                                profile.platform,
                                profile.platformUsername,
                                profile.error ? `"${profile.error.replace(/"/g, '""')}"` : '',
                                profile.timestamp || new Date().toISOString()
                              ].join(','))
                            ].join('\n');
                            
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', `failed-profiles-${new Date().toISOString().split('T')[0]}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            toast.success(`Exported ${failedProfiles.length} failed profiles to CSV`);
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
                
                {!syncStatus.inProgress && !syncStatus.error && !syncStatus.cancelled && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Profile synchronization completed successfully!
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmation}
        onClose={() => handleConfirmationClose(false)}
        container={() => document.getElementById('dialog-container') || document.body}
        disableEnforceFocus
      >
        <DialogTitle>
          {pendingAction === 'cancel' ? 'Cancel Synchronization?' : 'Leave Page?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {pendingAction === 'cancel' 
              ? 'Are you sure you want to cancel the profile synchronization? This will stop updating any remaining user profiles.'
              : 'Profile synchronization is still in progress. Leaving this page will not stop the process, but you won\'t be able to see the progress. Are you sure you want to leave?'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConfirmationClose(false)} color="primary">
            No, Stay
          </Button>
          <Button onClick={() => handleConfirmationClose(true)} color="error" variant="contained">
            Yes, {pendingAction === 'cancel' ? 'Cancel Sync' : 'Leave Page'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('weekly');
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState([]);
  // Add state for user registration statistics
  const [userRegistrationStats, setUserRegistrationStats] = useState(null);
  const [registrationTimeframe, setRegistrationTimeframe] = useState('daily');
  // Add state to track if component is mounted
  const [isMounted, setIsMounted] = useState(false);

  // Fetch admin stats
  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          timeframe: selectedTimeframe
        }
      });

      if (response.data) {
        // Debug: Log the admin stats response to see available properties
        
        // Process and order the days in weekly data
        const processWeeklyData = (data) => {
          if (!Array.isArray(data) || data.length === 0) return [];
          
          // Create a map of existing data by date
          const dataByDate = {};
          data.forEach(item => {
            if (item.date) {
              dataByDate[item.date] = item;
            }
          });
          
          // Get last 7 days including today (backward from today)
          const result = [];
          const today = new Date();
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Generate the last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const dateStr = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];
            
            // Use actual data if exists, otherwise create placeholder with zero value
            if (dataByDate[dateStr]) {
              // Ensure the day property is set correctly
              result.push({
                ...dataByDate[dateStr],
                day: dayName
              });
            } else {
              // Create placeholder with zero value
              result.push({
                date: dateStr,
                problemsSolved: 0,
                day: dayName
              });
            }
          }
          
          return result;
        };
          
        // Format the weekly data to have ordered days
        if (response.data.problemsStats && response.data.problemsStats.weeklyProblemsByPlatform) {
          response.data.problemsStats.weeklyProblemsByPlatform = response.data.problemsStats.weeklyProblemsByPlatform.map(platform => {
            return {
              ...platform,
              data: processWeeklyData(platform.data)
            };
          });
        }
        
        // Also order weekly activity data if it exists
        if (response.data.activityStats && response.data.activityStats.weeklyActivity) {
          response.data.activityStats.weeklyActivity = processWeeklyData(
            response.data.activityStats.weeklyActivity
          );
        }
        
        setStats(response.data);
        
        // Fetch leaderboard data for export
        try {
          const leaderboardResponse = await axios.get(`${apiUrl}/leaderboard`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          setLeaderboardData(leaderboardResponse.data || []);
          
          // Don't fetch individual platform details - this endpoint is causing 404 errors
          // We'll use what's available in the leaderboard response
        } catch (leaderboardError) {
          // Continue with the stats data we have
        }
      }
    } catch (error) {
      const errorMessage = error.response?.status === 404 
        ? 'API endpoint not found. Please check server configuration.'
        : error.response?.status === 401
        ? 'Unauthorized access. Please log in again.'
        : 'Failed to fetch dashboard statistics. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user registration statistics
  const fetchUserRegistrationStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/admin/user-registration-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        setUserRegistrationStats(response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch registration statistics';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
    fetchUserRegistrationStats();
    // Set isMounted to true after initial render
    setIsMounted(true);
    
    // Cleanup function to set isMounted to false when component unmounts
    return () => setIsMounted(false);
  }, [token]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    fetchAdminStats();
    toast.success('Dashboard data refreshed');
  };

  const handleTimeframeChange = (event) => {
    setSelectedTimeframe(event.target.value);
  };
  
  const onPieEnter = (_, index) => {
    setActivePieIndex(index);
  };

  const exportToExcel = () => {
    toast.info('Preparing data for export...', { autoClose: 2000 });
    fetchExportData();
  };

  const fetchExportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Use the export endpoint as it should return detailed data
      const response = await axios.get(`${apiUrl}/leaderboard/export`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          includeComplete: 'true',
          debug: 'true'
        }
      });
      
      // Check if we have valid data
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        toast.error('No data available for export');
        setLoading(false);
        return;
      }
      
      toast.info(`Processing export data for ${response.data.length} users...`, { autoClose: 2000 });
      
      // Sort users by totalScore in descending order (higher scores get higher ranks)
      const sortedData = [...response.data].sort((a, b) => {
        // Try different possible locations of the totalScore
        const scoreA = Math.max(
          Number(a.totalScore) || 0,
          Number(a.profiles?.totalScore) || 0, 
          Number(a.platformData?.totalScore) || 0
        );
        
        const scoreB = Math.max(
          Number(b.totalScore) || 0,
          Number(b.profiles?.totalScore) || 0, 
          Number(b.platformData?.totalScore) || 0
        );
        
        return scoreB - scoreA;
      });
      
      // Process the data for export
      const exportData = sortedData.map((user, index) => {
        // Calculate rank based on sorted position
        const calculatedRank = index + 1;
        
        // Try to find totalScore and totalProblems in various locations
        const totalScore = Math.max(
          Number(user.totalScore) || 0,
          Number(user.profiles?.totalScore) || 0,
          Number(user.platformData?.totalScore) || 0
        );
        
        const totalProblems = Math.max(
          Number(user.totalProblemsSolved) || 0,
          Number(user.problemStats?.totalProblemsSolved) || 0,
          Number(user.profiles?.problemsSolved) || 0
        );
        
        // Try all possible locations for platform data
        const platformData = user.platformData || {};
        const codingProfiles = user.codingProfiles || {};
        const profiles = user.profiles || {};
        const platforms = user.platforms || {};
        
        // Function to get platform score from various locations
        const getPlatformScore = (platform) => {
          return Math.max(
            Number(platforms[platform]?.score) || 0,
            Number(codingProfiles[platform]?.score) || 0,
            Number(platformData[platform]?.score) || 0,
            Number(user.platformScores?.[platform]) || 0
          );
        };
        
        // Function to get platform problems from various locations
        const getPlatformProblems = (platform) => {
          return Math.max(
            Number(platforms[platform]?.problemsSolved) || 0,
            Number(codingProfiles[platform]?.problemsSolved) || 0,
            Number(platformData[platform]?.problemsSolved) || 0,
            Number(platformData[platform]?.totalSolved) || 0
          );
        };
        
        // Function to get username for a platform
        const getPlatformUsername = (platform) => {
          return platforms[platform]?.username || 
                 codingProfiles[platform]?.username || 
                 platformData[platform]?.username || 
                 profiles[platform] || 
                 '-';
        };
        
        // Get GitHub stats from various possible locations
        const githubStats = user.githubStats || platforms.github || codingProfiles.github || {};
        
        return {
          'Rank': calculatedRank,
          'Name': user.name || '',
          'Roll Number': user.rollNumber || '-',
          'Department': user.department || platformData.department || '-',
          'Section': user.section || platformData.section || '-',
          'Email': user.email || '-',
          'Graduation Year': user.graduatingYear || platformData.graduatingYear || '-',
          'Total Score': totalScore,
          'Total Problems': totalProblems,
          
          // LeetCode data
          'LeetCode Username': getPlatformUsername('leetcode'),
          'LeetCode Score': getPlatformScore('leetcode'),
          'LeetCode Problems': getPlatformProblems('leetcode'),
          'LeetCode Rating': platforms.leetcode?.rating || 
                             codingProfiles.leetcode?.rating || 
                             platformData.leetcode?.rating || 0,
          
          // CodeForces data
          'CodeForces Username': getPlatformUsername('codeforces'),
          'CodeForces Score': getPlatformScore('codeforces'),
          'CodeForces Problems': getPlatformProblems('codeforces'),
          'CodeForces Rating': platforms.codeforces?.rating || 
                               codingProfiles.codeforces?.rating || 
                               platformData.codeforces?.rating || 0,
          
          // CodeChef data
          'CodeChef Username': getPlatformUsername('codechef'),
          'CodeChef Score': getPlatformScore('codechef'),
          'CodeChef Problems': getPlatformProblems('codechef'),
          'CodeChef Rating': platforms.codechef?.rating || 
                             codingProfiles.codechef?.rating || 
                             platformData.codechef?.rating || 0,
          
          // GeeksforGeeks data
          'GFG Username': getPlatformUsername('geeksforgeeks'),
          'GFG Score': getPlatformScore('geeksforgeeks'),
          'GFG Problems': getPlatformProblems('geeksforgeeks'),
          'GFG Rating': platforms.geeksforgeeks?.rating || 
                        platforms.geeksforgeeks?.codingScore ||
                        codingProfiles.geeksforgeeks?.rating || 
                        codingProfiles.geeksforgeeks?.codingScore || 
                        platformData.geeksforgeeks?.rating || 
                        platformData.geeksforgeeks?.codingScore || 0,
          
          // HackerRank data
          'HackerRank Username': getPlatformUsername('hackerrank'),
          'HackerRank Score': getPlatformScore('hackerrank'),
          'HackerRank Problems': getPlatformProblems('hackerrank'),
          
          // GitHub data
          'GitHub Username': getPlatformUsername('github'),
          'GitHub Score': getPlatformScore('github'),
          'GitHub Repositories': githubStats.publicRepos || 0,
          'GitHub Stars': githubStats.starsReceived || 0,
          'GitHub Followers': githubStats.followers || 0,
        };
      });

      // Create a workbook and worksheet using exceljs
      const workbook = new XLSX.Workbook();
      const worksheet = workbook.addWorksheet('Leaderboard');
      
      // Add headers
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        worksheet.columns = headers.map(header => ({
          header,
          key: header,
          width: header.length + 5 // Dynamic width based on header length
        }));
        
        // Customize column widths
        const colWidths = {
          'Rank': 5,
          'Name': 25,
          'Roll Number': 15,
          'Department': 20,
          'Section': 10,
          'Email': 25,
          'Graduation Year': 15,
          'Total Score': 10,
          'Total Problems': 12
        };
        
        worksheet.columns.forEach(column => {
          if (colWidths[column.header]) {
            column.width = colWidths[column.header];
          } else if (column.header.includes('Username')) {
            column.width = 20;
          } else if (column.header.includes('Score')) {
            column.width = 15;
          } else {
            column.width = 15;
          }
        });
      }
      
      // Add data rows
      exportData.forEach(data => {
        worksheet.addRow(data);
      });
      
      // Add generated date
      const dateCell = worksheet.getCell(`A${exportData.length + 3}`);
      dateCell.value = `Generated: ${new Date().toLocaleString()}`;
      
      // Style the headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4167B8' }
      };
      worksheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFF' }
      };
      
      toast.info('Generating Excel file...', { autoClose: 1500 });
      
      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Create a blob and trigger download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CodeTracker_Detailed_Leaderboard.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Successfully exported data for ${exportData.length} users`);
    } catch (error) {
      let errorMessage = 'Failed to export data. Please try again.';
      
      if (error.response) {
        // Server responded with a status code outside of 2xx range
        errorMessage = `Server error ${error.response.status}: ${error.response.data?.message || 'Failed to fetch data'}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
    return (
      <g>
        {/* Black background rectangle */}
        <rect 
          x={cx - 60} 
          y={cy - 40} 
          width={120} 
          height={80} 
          fill="#121212" 
          rx={4}
          ry={4}
        />
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#fff">
          {payload.department}
        </text>
        <text x={cx} y={cy} textAnchor="middle" fill="#fff">
          {`${value} users`}
        </text>
        <text x={cx} y={cy} dy={20} textAnchor="middle" fill="rgba(255,255,255,0.7)">
          {`${(percent * 100).toFixed(1)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
      </g>
    );
  };

  // Helper function to format time label based on timeframe
  const formatTimeLabel = (dataPoint) => {
    if (selectedTimeframe === 'weekly') {
      // Format as day of week
      return new Date(dataPoint.date).toLocaleDateString('en-US', { weekday: 'short' });
    } else if (selectedTimeframe === 'monthly') {
      // Format as week number in month
      const date = new Date(dataPoint.date);
      const weekNum = Math.ceil(date.getDate() / 7);
      return `Week ${weekNum}`;
    } else {
      // Format as month name for yearly view
      return new Date(dataPoint.date).toLocaleDateString('en-US', { month: 'short' });
    }
  };

  // Effect to check for active sync job on component mount
  useEffect(() => {
    const checkForActiveSyncJob = async () => {
      // Look for syncId in localStorage or other storage (you might need to implement this)
      // If no stored ID is found, we can't restore the sync state
      if (!token) return;

      try {
        // You can implement a backend endpoint to check for active jobs
        // For now, we'll reset the global state to be safe
        activeSyncState.setInProgress(false);
      } catch (err) {
        // Handle error if needed
      }
    };

    checkForActiveSyncJob();
  }, [token]);

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100vh',
          gap: 3
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading Admin Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f7',
        minHeight: '100vh',
        pt: 3,
        pb: 8
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            mb: 3, 
            borderRadius: 2, 
            background: 'linear-gradient(135deg, #6b73ff 0%, #000dff 100%)',
            color: 'white'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
            Admin Dashboard
          </Typography>
              <Typography variant={isMobile ? "body2" : "subtitle1"}>
                Monitor user performance metrics and department analytics
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', mt: { xs: 1, md: 0 } }}>
              <Tooltip title="Refresh data">
                <IconButton 
                  onClick={handleRefresh} 
                  sx={{ 
                    color: 'white', 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                    mr: 2
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            <Button
              variant="contained"
              color="secondary"
                startIcon={<FileDownloadIcon />}
                onClick={exportToExcel}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 2, sm: 3 }
                }}
              >
                {isMobile ? 'Export' : 'Export Leaderboard'}
            </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#4CAF50' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', mr: 2 }}>
                    <People />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Users
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.userStats.totalUsers || 0}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="primary.main" fontWeight="medium">
                        Admin Users
                      </Typography>
                      <Typography variant="h6">
                        {stats?.userStats.adminUsers || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium">
                        Regular Users
                      </Typography>
                      <Typography variant="h6">
                        {stats?.userStats.regularUsers || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#673AB7' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(103, 58, 183, 0.1)', color: '#673AB7', mr: 2 }}>
                    <TrendingUp />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Contributions
                  </Typography>
                </Box>
                <Box>
                  <Tooltip title="Total number of problems solved by all users across all coding platforms">
                    <Typography variant="h4" fontWeight="bold" sx={{ cursor: 'help' }}>
                      {stats?.problemsStats?.totalProblems?.toLocaleString() || stats?.problemsStats?.platformStats?.reduce((sum, platform) => sum + (platform.totalProblems || 0), 0).toLocaleString() || 0}
                    </Typography>
                  </Tooltip>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Problems solved across all platforms
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#2196F3' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3', mr: 2 }}>
                    <Code />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Platforms
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.platformEngagement?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {Math.round(stats?.problemsStats?.platformStats?.reduce((sum, platform) => sum + (platform.avgProblems || 0), 0) / (stats?.platformEngagement?.length || 1))} avg problems per platform
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#F44336' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', mr: 2 }}>
                    <PieChartIcon />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Departments
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.departmentStats?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Tracking performance across departments
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#FF9800' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800', mr: 2 }}>
                    <LeaderboardIcon />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Top Performer
                  </Typography>
                </Box>
                <Box>
                  <Typography variant={isMobile ? "h6" : "h6"} fontWeight="bold" noWrap>
                    {stats?.userStats.topUsers?.[0]?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Score: {stats?.userStats.topUsers?.[0]?.totalScore || 0} 
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs Navigation */}
        <Box sx={{ mb: 3, overflowX: 'auto' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            sx={{ 
              '& .MuiTabs-indicator': { 
                height: 3,
                borderRadius: '3px 3px 0 0' 
              },
              '& .MuiTab-root': { 
                textTransform: 'none', 
                fontWeight: 600,
                fontSize: isMobile ? '0.875rem' : '1rem',
                minWidth: isMobile ? 100 : 120
              } 
            }}
          >
            <Tab label="Problem Analytics" icon={<BarChartIcon />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label="Department Stats" icon={<PieChartIcon />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label="User Registrations" icon={<CalendarIcon />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label="Profile Sync" icon={<SyncIcon />} iconPosition={isMobile ? "top" : "start"} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Timeframe Filter */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Problem Solving Analytics
                  </Typography>
                  
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
                    <Select
                      labelId="timeframe-select-label"
                      value={selectedTimeframe}
                      label="Timeframe"
                      onChange={handleTimeframeChange}
                      size="small"
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="all">All Time</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Paper>
            </Grid>
            
            {/* Platform Comparison Chart */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Problems Solved by Platform
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedTimeframe === 'weekly' ? 'Last 7 days' : selectedTimeframe === 'monthly' ? 'Last 3 months' : 'Overall comparison'}
                </Typography>
                
                <Box sx={{ 
                  height: isTablet ? 300 : 400, 
                  mt: isMobile ? 1 : 2,
                  minHeight: 300,
                  minWidth: 200,
                  position: 'relative'
                }}>
                  {activeTab === 0 && (
                    <ResponsiveContainer width="100%" height="100%" aspect={isTablet ? 1.5 : 2}>
                      <BarChart
                        data={stats?.problemsStats?.platformStats
                          ?.filter(platform => platform.platform !== 'github')
                          ?.map(platform => ({
                            name: capitalize(platform.platform),
                            totalProblems: platform.totalProblems,
                            avgProblems: platform.avgProblems,
                            userCount: platform.userCount,
                            fill: PLATFORM_COLORS[platform.platform] || CHART_COLORS[0]
                          })) || []}
                        margin={{ top: 20, right: 30, left: isMobile ? 0 : 20, bottom: isMobile ? 120 : 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={isMobile ? 120 : 80}
                        />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name, props) => {
                            if (name === 'totalProblems') return [`${value} problems`, 'Total Problems'];
                            if (name === 'avgProblems') return [`${value} problems/user`, 'Avg Per User'];
                            if (name === 'userCount') return [`${value} users`, 'Users'];
                            return [value, name];
                          }}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '4px',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="totalProblems" 
                          name="Total Problems" 
                          fill={theme.palette.primary.main}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="avgProblems" 
                          name="Avg Per User" 
                          fill={theme.palette.secondary.main}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
                </Paper>
              </Grid>
            
            {/* Top Performers */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom>
                  Top Performers
                  </Typography>
                  <Box 
                    sx={{ 
                    mt: 2, 
                      flexGrow: 1,
                      maxHeight: '400px', 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.25)',
                      }
                    }
                    }}
                  >
                  {stats?.userStats?.topUsers?.map((user, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        p: 1.5,
                        mb: 1.5,
                          mx: 1,
                        borderRadius: 1,
                        bgcolor: index === 0 ? 'rgba(255, 193, 7, 0.1)' : 'transparent',
                            border: index === 0 ? '1px solid rgba(255, 193, 7, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <Avatar 
                        sx={{ 
                          bgcolor: index === 0 ? '#FFC107' : index === 1 ? '#9E9E9E' : index === 2 ? '#CD7F32' : theme.palette.primary.main,
                          color: 'white',
                          width: 36,
                          height: 36,
                          mr: 2
                        }}
                      >
                        {index + 1}
                      </Avatar>
                          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                        <Typography variant="body1" fontWeight="medium" noWrap>
                          {user.name}
                    </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {user.department || 'No department'}
                    </Typography>
                      </Box>
                      <Chip 
                        label={`${user.totalScore} pts`} 
                        size="small" 
                        sx={{ 
                          fontWeight: 'bold',
                              bgcolor: index === 0 ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: index === 0 ? '#FF6D00' : 'text.primary'
                        }}
                      />
                    </Box>
                  ))}
                  </Box>
                </Paper>
            </Grid>
            
            {/* Problems Over Time */}
            <Grid item xs={12}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                  Problems Solved Over Time
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTimeframe === 'weekly' ? 'Daily trend for the past week' : 
                    selectedTimeframe === 'monthly' ? 'Weekly trend for the past 3 months' : 
                    'Monthly trend for the past year'}
                  </Typography>
                  <Tooltip title="Refresh data">
                    <IconButton onClick={handleRefresh} size="small">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ 
                  height: isMobile ? 300 : 400, 
                  mt: isMobile ? 2 : 3,
                  minHeight: 300,
                  minWidth: 200,
                  position: 'relative'
                }}>
                  {loading ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: '100%',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary">
                        Loading chart data...
                      </Typography>
                    </Box>
                  ) : (
                    activeTab === 0 && (
                      <ResponsiveContainer width="100%" height="100%" aspect={isMobile ? 1.2 : 2}>
                        <LineChart
                          margin={{ top: 20, right: 30, left: isMobile ? 0 : 20, bottom: isMobile ? 20 : 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="day" 
                            type="category" 
                            allowDuplicatedCategory={false}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                          />
                          <YAxis />
                          <RechartsTooltip 
                            formatter={(value, name) => [`${value} problems`, capitalize(name)]}
                            labelFormatter={(label) => {
                              // If it's a day abbreviation, get the full day name
                              if (typeof label === 'string' && label.length === 3) {
                                const days = {
                                  'Sun': 'Sunday',
                                  'Mon': 'Monday',
                                  'Tue': 'Tuesday',
                                  'Wed': 'Wednesday',
                                  'Thu': 'Thursday',
                                  'Fri': 'Friday',
                                  'Sat': 'Saturday'
                                };
                                return days[label] || label;
                              }
                              return label;
                            }}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid rgba(0,0,0,0.1)',
                              borderRadius: '4px',
                              color: '#000'
                            }}
                            labelStyle={{ color: '#333' }}
                          />
                          <Legend layout={isMobile ? "horizontal" : "vertical"} verticalAlign={isMobile ? "bottom" : "middle"} align={isMobile ? "center" : "right"} />
                          
                          {selectedTimeframe === 'weekly' && stats?.problemsStats?.weeklyProblemsByPlatform?.length > 0
                            ? stats?.problemsStats?.weeklyProblemsByPlatform?.map((platform, index) => (
                                <Line
                                  key={platform.platform}
                                  data={platform.data}
                                  name={capitalize(platform.platform)}
                                  type="monotone"
                                  dataKey="problemsSolved"
                                  stroke={PLATFORM_COLORS[platform.platform] || CHART_COLORS[index % CHART_COLORS.length]}
                                  activeDot={{ r: isMobile ? 6 : 8 }}
                                  strokeWidth={isMobile ? 1.5 : 2}
                                  connectNulls={true}
                                />
                              ))
                            : selectedTimeframe === 'monthly' && stats?.problemsStats?.monthlyProblemsByPlatform?.length > 0
                            ? stats?.problemsStats?.monthlyProblemsByPlatform?.map((platform, index) => (
                                <Line
                                  key={platform.platform}
                                  data={platform.data}
                                  name={capitalize(platform.platform)}
                                  type="monotone"
                                  dataKey="problemsSolved"
                                  stroke={PLATFORM_COLORS[platform.platform] || CHART_COLORS[index % CHART_COLORS.length]}
                                  activeDot={{ r: isMobile ? 6 : 8 }}
                                  strokeWidth={isMobile ? 1.5 : 2}
                                  connectNulls={true}
                                />
                              ))
                            : stats?.problemsStats?.yearlyProblemsByPlatform?.length > 0
                            ? stats?.problemsStats?.yearlyProblemsByPlatform?.map((platform, index) => (
                                <Line
                                  key={platform.platform}
                                  data={platform.data}
                                  name={capitalize(platform.platform)}
                                  type="monotone"
                                  dataKey="problemsSolved"
                                  stroke={PLATFORM_COLORS[platform.platform] || CHART_COLORS[index % CHART_COLORS.length]}
                                  activeDot={{ r: isMobile ? 6 : 8 }}
                                  strokeWidth={isMobile ? 1.5 : 2}
                                  connectNulls={true}
                                />
                              ))
                            : (
                              <Line
                                key="placeholder"
                                data={[{day: 'No Data', problemsSolved: 0}]}
                                name="No Data Available"
                                type="monotone"
                                dataKey="problemsSolved"
                                stroke="#ccc"
                                strokeDasharray="5 5"
                                connectNulls={true}
                              />
                            )
                          }
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {activeTab === 1 && (
          <Grid container spacing={3}>
            {/* Department Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Department Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  User count by department
                </Typography>
                
                <Box sx={{ 
                  height: isMobile ? 300 : 400, 
                  display: 'flex', 
                  justifyContent: 'center',
                  minHeight: 300,
                  minWidth: 200,
                  position: 'relative'
                }}>
                  {activeTab === 1 && (
                    <ResponsiveContainer width="100%" height="100%" aspect={isMobile ? 1 : 1.5}>
                      <PieChart>
                        <Pie
                          activeIndex={activePieIndex}
                          activeShape={renderActiveShape}
                          data={stats?.departmentStats?.map((dept, index) => ({
                            department: dept.department,
                            value: dept.userCount
                          })) || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 50 : 70}
                          outerRadius={isMobile ? 80 : 100}
                          dataKey="value"
                          onMouseEnter={onPieEnter}
                        >
                          {stats?.departmentStats?.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[index % CHART_COLORS.length]} 
                            />
                          )) || []}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>
            
            {/* Average Score by Department */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Average Score by Department
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Performance comparison across departments
                </Typography>
                
                <Box sx={{ 
                  height: isMobile ? 300 : 400,
                  mt: 6,
                  minHeight: 300,
                  minWidth: 200,
                  position: 'relative'
                }}>
                  {activeTab === 1 && (
                    <ResponsiveContainer width="100%" height="100%" aspect={isMobile ? 1 : 1.5}>
                      <BarChart
                        data={stats?.departmentStats?.map((dept, index) => ({
                          name: dept.department,
                          score: dept.avgScore,
                          fill: CHART_COLORS[index % CHART_COLORS.length]
                        })) || []}
                        margin={{ 
                          top: 20, 
                          right: 30, 
                          left: 40,
                          bottom: isMobile ? 80 : 50 
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="name"
                          tick={{ 
                            fontSize: isMobile ? 10 : 12,
                            fill: 'rgba(255,255,255,0.7)'
                          }}
                          angle={-45}
                          textAnchor="end"
                          height={isMobile ? 80 : 60}
                          interval={0}
                        />
                        <YAxis 
                          type="number"
                          tick={{ 
                            fontSize: isMobile ? 10 : 12,
                            fill: 'rgba(255,255,255,0.7)'
                          }}
                          label={{ 
                            value: 'Average Score', 
                            angle: -90, 
                            position: 'insideLeft',
                            offset: -30,  // Adjusted offset for better positioning
                            style: { 
                              textFill: 'rgba(255,255,255,0.7)',
                              fontSize: 12
                            }
                          }}
                        />
                        <RechartsTooltip 
                          formatter={(value) => [`${value} points`, 'Avg Score']}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '4px',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                        />
                        <Bar 
                          dataKey="score" 
                          name="Average Score" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        >
                          {stats?.departmentStats?.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[index % CHART_COLORS.length]} 
                            />
                          )) || []}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
                </Paper>
              </Grid>
          </Grid>
        )}
        
        {activeTab === 2 && (
          <Grid container spacing={3}>
            {/* Registration Statistics Header */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    User Registration Analytics
                  </Typography>
                  
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel id="registration-timeframe-select-label">View By</InputLabel>
                    <Select
                      labelId="registration-timeframe-select-label"
                      value={registrationTimeframe}
                      label="View By"
                      onChange={(e) => setRegistrationTimeframe(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="department">By Department</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Tooltip title="Refresh data">
                    <IconButton onClick={fetchUserRegistrationStats} size="small">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            </Grid>
            
            {/* Summary Cards */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {registrationTimeframe !== 'department' && (
                  <Grid item xs={6} md={4}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                      backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#fff',
                      overflow: 'hidden',
                      height: '100%'
                    }}>
                      <Box sx={{ height: 5, bgcolor: '#4CAF50' }}></Box>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2" gutterBottom>
                          {registrationTimeframe === 'daily' ? "Today's Registrations" : 
                           registrationTimeframe === 'weekly' ? "This Week" : 
                           "This Month"}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {registrationTimeframe === 'daily' ? (userRegistrationStats?.summary?.today || 0) : 
                           registrationTimeframe === 'weekly' ? (userRegistrationStats?.summary?.thisWeek || 0) : 
                           (userRegistrationStats?.summary?.thisMonth || 0)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                <Grid item xs={6} md={registrationTimeframe === 'department' ? 6 : 4}>
                  <Card sx={{ 
                    borderRadius: 2, 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#fff',
                    overflow: 'hidden',
                    height: '100%'
                  }}>
                    <Box sx={{ height: 5, bgcolor: '#FF9800' }}></Box>
                    <CardContent>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Total Users
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {userRegistrationStats?.summary?.totalUsers || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6} md={registrationTimeframe === 'department' ? 6 : 4}>
                  <Card sx={{ 
                    borderRadius: 2, 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#fff',
                    overflow: 'hidden',
                    height: '100%'
                  }}>
                    <Box sx={{ height: 5, bgcolor: '#00BCD4' }}></Box>
                    <CardContent>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Regular Users
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {userRegistrationStats?.summary?.regularUsers || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
            
            {/* Registration Chart */}
            <Grid item xs={12}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {registrationTimeframe === 'daily' ? 'Daily Registrations (Last 30 Days)' : 
                   registrationTimeframe === 'weekly' ? 'Weekly Registrations (Last 12 Weeks)' : 
                   registrationTimeframe === 'monthly' ? 'Monthly Registrations (Last 12 Months)' :
                   'Registration by Department'}
                </Typography>
                
                <Box sx={{ 
                  height: isMobile ? 300 : 400, 
                  mt: 3,
                  position: 'relative'
                }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {registrationTimeframe === 'department' ? (
                        <BarChart
                          data={userRegistrationStats?.departmentRegistrations || []}
                          margin={{ top: 20, right: 30, left: 30, bottom: isMobile ? 130 : 50 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="department" 
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={isMobile ? 130 : 60}
                            interval={0}
                          />
                          <YAxis />
                          <RechartsTooltip 
                            formatter={(value, name) => {
                              if (name === 'regularCount') return [`${value} users`, 'Users'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="regularCount" name="Regular Users" fill="#4CAF50" />
                        </BarChart>
                      ) : (
                        <AreaChart 
                          data={registrationTimeframe === 'daily' 
                            ? userRegistrationStats?.dailyRegistrations?.map(item => ({
                                date: item._id,
                                display: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                regularCount: item.regularCount,
                              }))
                            : registrationTimeframe === 'weekly'
                            ? userRegistrationStats?.weeklyRegistrations?.map(item => ({
                                date: item.weekLabel,
                                display: item.weekLabel,
                                regularCount: item.regularCount,
                              }))
                            : userRegistrationStats?.monthlyRegistrations?.map(item => ({
                                date: item.monthLabel,
                                display: item.monthLabel,
                                regularCount: item.regularCount,
                              }))
                          }
                          margin={{ top: 20, right: 30, left: 30, bottom: isMobile ? 60 : 30 }}
                        >
                          <defs>
                            <linearGradient id="colorRegular" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="display" 
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={isMobile ? 60 : 30}
                            interval={registrationTimeframe === 'daily' ? (isMobile ? 3 : 1) : 0}
                          />
                          <YAxis />
                          <RechartsTooltip 
                            formatter={(value, name) => {
                              if (name === 'regularCount') return [`${value} users`, 'Users'];
                              return [value, name];
                            }}
                            labelFormatter={(label) => {
                              return `Date: ${label}`;
                            }}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="regularCount" 
                            name="Users"
                            stroke="#4CAF50" 
                            fillOpacity={1} 
                            fill="url(#colorRegular)" 
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {activeTab === 3 && (
          <ProfileSyncTab token={token} />
        )}
      </Container>
    </Box>
  );
};

export default AdminDashboard;