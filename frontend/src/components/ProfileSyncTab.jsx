import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  LinearProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AccessTime as AccessTimeIcon,
  Assessment,
  FileDownload as FileDownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';
import { activeSyncState } from '../contexts/AuthContext';

const ProfileSyncTab = ({ token }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncId, setSyncId] = useState(null);
  const [error, setError] = useState(null);
  const [statusPolling, setStatusPolling] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [failedProfiles, setFailedProfiles] = useState([]);
  const [showFailedList, setShowFailedList] = useState(false);
  const [rejectedProfiles, setRejectedProfiles] = useState([]);
  const [showRejectedList, setShowRejectedList] = useState(false);

  // Function to check sync status
  const checkSyncStatus = async (id) => {
    try {
      if (!id || (syncStatus && !syncStatus.inProgress)) {
        return;
      }

      const response = await axios.get(`${apiUrl}/admin/sync-status/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      setSyncStatus(response.data);
      
      if (response.data.failedProfilesList?.length > 0) {
        setFailedProfiles(response.data.failedProfilesList);
      } else {
        setFailedProfiles([]);
      }
      
      if (response.data.rejectedProfilesList?.length > 0) {
        setRejectedProfiles(response.data.rejectedProfilesList);
      } else {
        setRejectedProfiles([]);
      }
      
      if (!response.data.inProgress) {
        if (statusPolling) {
          clearInterval(statusPolling);
          setStatusPolling(null);
        }
        
        activeSyncState.setInProgress(false);
        
        if (syncStatus && syncStatus.inProgress) {
          if (response.data.error) {
            toast.error(`Sync completed with errors: ${response.data.error}`);
          } else if (response.data.cancelled) {
            toast.info('Profile synchronization was cancelled');
          } else {
            toast.success('Profile synchronization completed successfully');
          }
        }
        return;
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (statusPolling) {
          clearInterval(statusPolling);
          setStatusPolling(null);
        }
        toast.error('Sync job not found. It may have been deleted or expired.');
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
      
      if (statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }
      
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
      
      toast.info('Starting profile synchronization...', { autoClose: 2000 });
      activeSyncState.setInProgress(true);
      
      const response = await axios.post(`${apiUrl}/admin/sync-profiles`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success && response.data.syncId) {
        const newSyncId = response.data.syncId;
        setSyncId(newSyncId);
        setSyncStatus(prevStatus => ({
          ...prevStatus,
          id: newSyncId
        }));
        
        setTimeout(() => checkSyncStatus(newSyncId), 1000);
        
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
        
        if (syncStatus) {
          setSyncStatus({
            ...syncStatus,
            inProgress: false,
            cancelled: true
          });
        }
        
        activeSyncState.setInProgress(false);
        
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
      window.onbeforeunload = null;
    }
    
    setPendingAction(null);
  };

  // Setup beforeunload event handler
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (syncStatus && syncStatus.inProgress) {
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
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, [statusPolling]);

  // Update global active sync state when component unmounts
  useEffect(() => {
    return () => {
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
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    onClick={() => setShowFailedList(!showFailedList)}
                    sx={{ cursor: 'pointer', mb: 1 }}
                  >
                    <Typography variant="h6" component="h3" color={failedProfiles.length > 0 ? "error" : "text.secondary"} gutterBottom>
                      <Badge badgeContent={failedProfiles.length} color="error" sx={{ mr: 2 }}>
                        <Assessment />
                      </Badge>
                      Failed Profiles
                    </Typography>
                    {showFailedList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  
                  <Collapse in={showFailedList}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      The following profiles failed to sync. Please check their platform usernames.
                    </Alert>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
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
                                  label={profile.platform.charAt(0).toUpperCase() + profile.platform.slice(1)}
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
                                <Tooltip title={`Visit ${profile.platformUsername}'s ${profile.platform} profile`}>
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
                  </Collapse>
                </Box>
                
                {/* Rejected Profiles Section */}
                <Box sx={{ mt: 4 }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    onClick={() => setShowRejectedList(!showRejectedList)}
                    sx={{ cursor: 'pointer', mb: 1 }}
                  >
                    <Typography variant="h6" component="h3" color={rejectedProfiles.length > 0 ? "warning.main" : "text.secondary"} gutterBottom>
                      <Badge badgeContent={rejectedProfiles.length} color="warning" sx={{ mr: 2 }}>
                        <Assessment />
                      </Badge>
                      Rejected Profiles
                    </Typography>
                    {showRejectedList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  
                  <Collapse in={showRejectedList}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      The following profiles were rejected during sync. These might require manual verification.
                    </Alert>
                    
                    {rejectedProfiles.length === 0 ? (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        No rejected profiles in this synchronization.
                      </Alert>
                    ) : (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Platform</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rejectedProfiles.map((profile, index) => (
                              <TableRow key={index} hover>
                                <TableCell>{profile.userName || 'Unknown'}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={profile.platform.charAt(0).toUpperCase() + profile.platform.slice(1)}
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
                                    title={profile.reason || 'Unknown reason'} 
                                    placement="top"
                                    arrow
                                    componentsProps={{
                                      tooltip: {
                                        sx: {
                                          maxWidth: 350,
                                          fontSize: '0.75rem',
                                          bgcolor: 'warning.dark',
                                          '& .MuiTooltip-arrow': {
                                            color: 'warning.dark',
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
                                        color: 'warning.main'
                                      }}
                                    >
                                      {profile.reason || 'Unknown reason'}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  <Tooltip title={`Visit ${profile.platformUsername}'s ${profile.platform} profile`}>
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
                    )}
                    
                    {rejectedProfiles.length > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FileDownloadIcon />}
                          onClick={() => {
                            const headers = ['User', 'Email', 'Platform', 'Username', 'Reason', 'Timestamp'];
                            const csvContent = [
                              headers.join(','),
                              ...rejectedProfiles.map(profile => [
                                profile.userName || 'Unknown',
                                profile.userEmail || '',
                                profile.platform,
                                profile.platformUsername,
                                profile.reason ? `"${profile.reason.replace(/"/g, '""')}"` : '',
                                profile.timestamp || new Date().toISOString()
                              ].join(','))
                            ].join('\n');
                            
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', `rejected-profiles-${new Date().toISOString().split('T')[0]}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            toast.success(`Exported ${rejectedProfiles.length} rejected profiles to CSV`);
                          }}
                        >
                          Export Rejected Profiles
                        </Button>
                      </Box>
                    )}
                  </Collapse>
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

export default ProfileSyncTab; 