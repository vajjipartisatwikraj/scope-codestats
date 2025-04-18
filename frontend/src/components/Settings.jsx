import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  alpha,
  Container,
  Breadcrumbs,
  Link,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Snackbar,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Badge,
  Card,
  CardContent,
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  InfoOutlined as InfoOutlinedIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon,
  Public as PublicIcon,
  AccessTime as AccessTimeIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Laptop as LaptopIcon,
  Tablet as TabletIcon,
  BugReport as BugReportIcon,
  Send as SendIcon,
  Report as ReportIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Circle as CircleIcon,
  LineStyle as LineStyleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';
import {
  isPushNotificationSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushNotificationSubscription,
  getPushNotificationPermission,
  requestPushNotificationPermission,
  registerServiceWorker
} from '../utils/pushNotificationUtil';

// Component for a single login session item
const SessionItem = ({ session, isCurrentSession, onTerminate }) => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const { logout } = useAuth();

  // Format login time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get device icon based on platform and device type
  const getDeviceIcon = () => {
    const { deviceType, platform } = session.deviceInfo;
    
    if (deviceType && deviceType !== 'Desktop') {
      if (deviceType.toLowerCase().includes('ipad') || deviceType.toLowerCase().includes('tablet')) {
        return <TabletIcon />;
      } else {
        return <PhoneAndroidIcon />;
      }
    }
    
    return <LaptopIcon />;
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleTerminate = () => {
    onTerminate(session.id);
    handleCloseDialog();
  };

  const handleLogout = async () => {
    try {
      // Use the existing session endpoint
      await axios.delete(`${apiUrl}/sessions/${session.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Then perform the local logout
      logout();
    } catch (error) {
      console.error('Error during logout:', error);
      // Still perform local logout even if server request fails
      logout();
    }
  };

  return (
    <>
      <ListItem
        sx={{
          p: 2, 
          mb: 2, 
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: isCurrentSession ? alpha(theme.palette.primary.main, 0.1) : theme.palette.background.paper
        }}
      >
        <Box sx={{ mr: 2, color: theme.palette.text.secondary }}>
          {getDeviceIcon()}
        </Box>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2">
                {session.deviceInfo.browser} on {session.deviceInfo.platform}
              </Typography>
              {isCurrentSession && (
                <Chip 
                  size="small" 
                  label="Current Session" 
                  color="primary" 
                  variant="outlined" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatTime(session.loginTime)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PublicIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {session.location.city}, {session.location.country}
                </Typography>
              </Box>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          {isCurrentSession ? (
            <Tooltip title="Logout from this device">
              <IconButton edge="end" onClick={handleLogout} color="error" size="small">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Terminate Session">
              <IconButton edge="end" onClick={handleOpenDialog} color="error" size="small">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </ListItemSecondaryAction>
      </ListItem>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Terminate Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to terminate this session? The device will be logged out immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleTerminate} color="error" variant="contained">
            Terminate
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const Settings = () => {
  const { token, user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  
  // Push notification states
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  
  // Login session states
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [openTerminateAllDialog, setOpenTerminateAllDialog] = useState(false);

  // Issue reporting states
  const [issueType, setIssueType] = useState('bug');
  const [issuePage, setIssuePage] = useState('dashboard');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueSubmitSuccess, setIssueSubmitSuccess] = useState(false);
  
  // Issue reports state
  const [userIssues, setUserIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueDetailsOpen, setIssueDetailsOpen] = useState(false);

  // Check if push notifications are supported and get current status
  const checkPushNotificationStatus = async () => {
    setLoading(true);
    
    try {
      // Check if push notifications are supported
      const isSupported = isPushNotificationSupported();
      setSupported(isSupported);
      
      if (!isSupported) {
        setLoading(false);
        return;
      }
      
      // Register service worker if not registered yet
      if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
        await registerServiceWorker();
      }
      
      // Get current permission status
      const currentPermission = getPushNotificationPermission();
      setPermission(currentPermission);
      
      // Check if already subscribed
      const { subscribed: isSubscribed } = await checkPushNotificationSubscription();
      setSubscribed(isSubscribed);
    } catch (error) {
      toast.error('Failed to check notification status');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch login sessions
  const fetchLoginSessions = async () => {
    setSessionsLoading(true);
    
    try {
      // Use the existing sessions endpoint
      const response = await axios.get(`${apiUrl}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.sessions) {
        // Filter out duplicate sessions and only keep the most recent one for each device
        const sessionsByDevice = {};
        
        response.data.sessions.forEach(session => {
          const deviceKey = `${session.deviceInfo.browser}-${session.deviceInfo.platform}-${session.deviceInfo.deviceType}-${session.location.city}`;
          
          if (!sessionsByDevice[deviceKey] || new Date(session.loginTime) > new Date(sessionsByDevice[deviceKey].loginTime)) {
            sessionsByDevice[deviceKey] = session;
          }
        });
        
        // Convert back to array and sort by login time (most recent first)
        const uniqueSessions = Object.values(sessionsByDevice).sort((a, b) => 
          new Date(b.loginTime) - new Date(a.loginTime)
        );
        
        setSessions(uniqueSessions);
      }
    } catch (error) {
      console.error('Failed to fetch login sessions:', error);
      toast.error('Failed to fetch login sessions');
    } finally {
      setSessionsLoading(false);
    }
  };
  
  // Handle subscription toggle
  const handleSubscriptionToggle = async () => {
    if (!supported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }
    
    setLoading(true);
    
    try {
      if (subscribed) {
        // Unsubscribe
        await unsubscribeFromPushNotifications(token);
        setSubscribed(false);
        toast.success('Successfully unsubscribed from push notifications');
      } else {
        // Check permission first
        if (permission !== 'granted') {
          const newPermission = await requestPushNotificationPermission();
          setPermission(newPermission);
          
          if (newPermission !== 'granted') {
            toast.error('Permission denied for notifications');
            setLoading(false);
            return;
          }
        }
        
        // Subscribe
        await subscribeToPushNotifications(token);
        setSubscribed(true);
        toast.success('Successfully subscribed to push notifications');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };
  
  // Terminate a specific session
  const handleTerminateSession = async (sessionId) => {
    try {
      await axios.delete(`${apiUrl}/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Remove session from state
      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      
      toast.success('Session terminated successfully');
    } catch (error) {
      toast.error('Failed to terminate session');
    }
  };
  
  // Terminate all other sessions
  const handleTerminateAllSessions = async () => {
    try {
      await axios.delete(`${apiUrl}/sessions/all/except-current`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Keep only the current session in state
      setSessions(prevSessions => prevSessions.filter(session => session.isCurrentSession));
      
      setOpenTerminateAllDialog(false);
      toast.success('All other sessions terminated successfully');
    } catch (error) {
      toast.error('Failed to terminate sessions');
    }
  };
  
  // Handle issue report submission
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    
    if (!issueDescription.trim()) {
      toast.error('Please provide a description of the issue');
      return;
    }
    
    setIssueSubmitting(true);
    
    try {
      const response = await axios.post(`${apiUrl}/issues/report`, {
        type: issueType,
        page: issuePage,
        description: issueDescription
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        setIssueSubmitSuccess(true);
        setIssueDescription('');
        toast.success('Your issue has been reported successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit issue report');
    } finally {
      setIssueSubmitting(false);
    }
  };
  
  // Handle issue form reset
  const handleIssueFormReset = () => {
    setIssueType('bug');
    setIssuePage('dashboard');
    setIssueDescription('');
  };
  
  // Fetch user's reported issues
  const fetchUserIssues = async () => {
    setIssuesLoading(true);
    
    try {
      const response = await axios.get(`${apiUrl}/issues/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        setUserIssues(response.data.issues || []);
      }
    } catch (error) {
      console.error('Failed to fetch user issues:', error);
    } finally {
      setIssuesLoading(false);
    }
  };
  
  // Handle opening issue details
  const handleOpenIssueDetails = (issue) => {
    setSelectedIssue(issue);
    setIssueDetailsOpen(true);
  };

  // Handle closing issue details
  const handleCloseIssueDetails = () => {
    setIssueDetailsOpen(false);
    setSelectedIssue(null);
  };
  
  // Initialize component
  useEffect(() => {
    checkPushNotificationStatus();
    fetchLoginSessions();
    fetchUserIssues();
    
    // Poll for sessions every minute
    const interval = setInterval(fetchLoginSessions, 60000);
    
    return () => clearInterval(interval);
  }, [token]);
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Render status chip
  const renderStatusChip = (status) => {
    switch (status) {
      case 'new':
        return (
          <Chip
            label="New"
            size="small"
            color="primary"
            icon={<BugReportIcon fontSize="small" />}
          />
        );
      case 'in_progress':
        return (
          <Chip
            label="In Progress"
            size="small"
            color="warning"
            icon={<BuildIcon fontSize="small" />}
          />
        );
      case 'resolved':
        return (
          <Chip
            label="Resolved"
            size="small"
            color="success"
            icon={<CheckCircleIcon fontSize="small" />}
          />
        );
      case 'rejected':
        return (
          <Chip
            label="Rejected"
            size="small"
            color="error"
            icon={<CancelIcon fontSize="small" />}
          />
        );
      default:
        return null;
    }
  };
  
  // Render type chip
  const renderTypeChip = (type) => {
    switch (type) {
      case 'bug':
        return (
          <Chip
            label="Bug"
            size="small"
            variant="outlined"
            color="error"
          />
        );
      case 'feature':
        return (
          <Chip
            label="Feature"
            size="small"
            variant="outlined"
            color="primary"
          />
        );
      case 'improvement':
        return (
          <Chip
            label="Improvement"
            size="small"
            variant="outlined"
            color="secondary"
          />
        );
      case 'other':
        return (
          <Chip
            label="Other"
            size="small"
            variant="outlined"
            color="default"
          />
        );
      default:
        return null;
    }
  };
  
  // Show loading state
  if (loading && sessionsLoading && !sessions.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Settings
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link href="/dashboard" color="inherit" underline="hover">
            Dashboard
          </Link>
          <Typography color="text.primary">Settings</Typography>
        </Breadcrumbs>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Manage your account settings and preferences.
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        display: 'grid', 
        gap: 3,
        gridTemplateColumns: '1fr',
        maxWidth: '800px'
      }}>
        {/* Push Notifications Card */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NotificationsActiveIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" fontWeight="bold">
                Push Notifications
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Enable push notifications to stay updated with important announcements and opportunities.
            </Typography>
          </Box>

          {!supported && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Push notifications are not supported in your browser.
            </Alert>
          )}
          
          {supported && permission === 'denied' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Notification permission has been denied. Please update your browser settings to allow notifications.
            </Alert>
          )}
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={subscribed}
                  onChange={handleSubscriptionToggle}
                  disabled={loading || !supported || permission === 'denied'}
                  color="primary"
                />
              }
              label={
                <Typography>
                  {subscribed ? 'Push notifications enabled' : 'Enable push notifications'}
                </Typography>
              }
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subscribed 
                ? 'You will receive push notifications even when the browser is closed.'
                : 'Turn on to receive notifications even when the browser is closed.'}
            </Typography>
          </Box>
          
          {subscribed && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleSubscriptionToggle}
                startIcon={<NotificationsOffIcon />}
                disabled={loading}
              >
                Disable Push Notifications
              </Button>
            </Box>
          )}
        </Paper>

        {/* Login Sessions Card */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LaptopIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" fontWeight="bold">
                Login Sessions
              </Typography>
            </Box>
            
            {sessions.filter(session => !session.isCurrentSession).length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setOpenTerminateAllDialog(true)}
              >
                Logout All Other Devices
              </Button>
            )}
          </Box>
          
          {sessionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : sessions.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No active login sessions found.
            </Alert>
          ) : (
            <List sx={{ p: 0 }}>
              {sessions.map(session => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isCurrentSession={session.isCurrentSession}
                  onTerminate={handleTerminateSession}
                />
              ))}
            </List>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
            <InfoOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              These are your active login sessions across different devices. You can terminate any session that you don't recognize.
            </Typography>
          </Box>
        </Paper>

        {/* My Reported Issues Card */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BugReportIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6" fontWeight="bold">
                  My Reported Issues
                </Typography>
              </Box>
              
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchUserIssues}
                disabled={issuesLoading}
              >
                Refresh
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Track the status of issues you've reported to help improve the platform.
            </Typography>
          </Box>
          
          {issuesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : userIssues.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              You haven't reported any issues yet. Use the "Report an Issue" section below to submit feedback.
            </Alert>
          ) : (
            <TableContainer 
              component={Paper} 
              variant="outlined" 
              sx={{ 
                maxHeight: 400,
                mb: 2,
                borderRadius: 1
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width="15%">Type</TableCell>
                    <TableCell width="15%">Status</TableCell>
                    <TableCell width="15%">Page</TableCell>
                    <TableCell width="30%">Description</TableCell>
                    <TableCell width="25%">Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userIssues.map((issue) => (
                    <TableRow 
                      key={issue._id} 
                      hover
                      onClick={() => handleOpenIssueDetails(issue)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{renderTypeChip(issue.type)}</TableCell>
                      <TableCell>{renderStatusChip(issue.status)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={issue.page} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip 
                          title={issue.description}
                          arrow
                          placement="top"
                        >
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 200,
                              cursor: 'help'
                            }}
                          >
                            {issue.description}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(issue.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {userIssues.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {userIssues.filter(issue => issue.adminResponse).length > 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    {userIssues.filter(issue => issue.adminResponse).length} of your issues have admin responses. Click on an issue to view the response.
                  </Alert>
                )}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Report Issue Card */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BugReportIcon sx={{ mr: 1, color: theme.palette.error.main }} />
              <Typography variant="h6" fontWeight="bold">
                Report an Issue
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Found a bug or have a feature request? Let us know so we can improve your experience.
            </Typography>
          </Box>
          
          <form onSubmit={handleIssueSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="issue-type-label">Issue Type</InputLabel>
                  <Select
                    labelId="issue-type-label"
                    id="issue-type"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    label="Issue Type"
                    required
                  >
                    <MenuItem value="bug">Bug Report</MenuItem>
                    <MenuItem value="feature">Feature Request</MenuItem>
                    <MenuItem value="improvement">Improvement Suggestion</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="issue-page-label">Page / Section</InputLabel>
                  <Select
                    labelId="issue-page-label"
                    id="issue-page"
                    value={issuePage}
                    onChange={(e) => setIssuePage(e.target.value)}
                    label="Page / Section"
                    required
                  >
                    <MenuItem value="dashboard">Dashboard</MenuItem>
                    <MenuItem value="leaderboard">Leaderboard</MenuItem>
                    <MenuItem value="profile">User Profile</MenuItem>
                    <MenuItem value="admin">Admin Panel</MenuItem>
                    <MenuItem value="settings">Settings</MenuItem>
                    <MenuItem value="authentication">Login / Registration</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  id="issue-description"
                  label="Description"
                  multiline
                  rows={4}
                  fullWidth
                  variant="outlined"
                  placeholder="Please provide details about the issue you're experiencing or the feature you'd like to request..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  required
                  inputProps={{ maxLength: 1000 }}
                  helperText={`${issueDescription.length}/1000 characters`}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                  <Button
                    type="button"
                    onClick={handleIssueFormReset}
                    disabled={issueSubmitting}
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    disabled={issueSubmitting || !issueDescription.trim()}
                  >
                    {issueSubmitting ? 'Submitting...' : 'Submit Issue'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
          
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'flex-start' }}>
            <InfoOutlinedIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Your feedback helps us improve the platform. Our team reviews all submitted issues and may contact you for additional information if needed.
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Dialog for terminating all sessions */}
      <Dialog
        open={openTerminateAllDialog}
        onClose={() => setOpenTerminateAllDialog(false)}
      >
        <DialogTitle>Logout From All Other Devices</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will terminate all your active sessions except the current one. All other devices will be logged out immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTerminateAllDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleTerminateAllSessions} color="error" variant="contained">
            Logout All Devices
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={issueSubmitSuccess}
        autoHideDuration={6000}
        onClose={() => setIssueSubmitSuccess(false)}
        message="Your issue has been reported successfully"
      />

      {/* Issue Details Dialog */}
      <Dialog
        open={issueDetailsOpen}
        onClose={handleCloseIssueDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedIssue && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BugReportIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="h6">Issue Details</Typography>
                </Box>
                {renderStatusChip(selectedIssue.status)}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Type
                  </Typography>
                  <Box sx={{ mt: 1, mb: 2 }}>
                    {renderTypeChip(selectedIssue.type)}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Page / Section
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
                    {selectedIssue.page}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date Submitted
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
                    {formatDate(selectedIssue.createdAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
                    {formatDate(selectedIssue.updatedAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ 
                      p: 2, 
                      mt: 1, 
                      mb: 2, 
                      bgcolor: theme.palette.background.default,
                      minHeight: '100px'
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedIssue.description}
                    </Typography>
                  </Paper>
                </Grid>
                
                {selectedIssue.adminResponse && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Admin Response
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ 
                        p: 2, 
                        mt: 1, 
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        minHeight: '80px',
                        border: `1px solid ${theme.palette.primary.light}`
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedIssue.adminResponse}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                
                {selectedIssue.status === 'rejected' && !selectedIssue.adminResponse && (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ mt: 1 }}>
                      This issue was rejected without a specific response.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseIssueDetails}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default Settings; 