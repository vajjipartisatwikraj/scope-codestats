import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  FormControlLabel,
  Switch,
  useTheme,
  useMediaQuery,
  FormHelperText,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccessTime as AccessTimeIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl } from '../config/apiConfig';
import { useNavigate } from 'react-router-dom';

const NotificationManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // Additional security check - ensure only admins can access this page
  useEffect(() => {
    if (user && user.userType !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  // State management
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [editNotificationId, setEditNotificationId] = useState(null);
  const [notificationFormData, setNotificationFormData] = useState({
    title: '',
    message: '',
    targetType: 'global',
    selectedUser: '',
    deletionTime: ''
  });

  // Fetch notifications for admin
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await axios.get(`${apiUrl}/notifications/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };
  
  // Fetch users for notification targeting
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${apiUrl}/notifications/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  // Format notification date
  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format deletion time for display
  const formatDeletionTime = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Create or update notification
  const handleNotificationSubmit = async () => {
    try {
      const { title, message, targetType, selectedUser, deletionTime } = notificationFormData;
      
      if (!title || !message) {
        toast.error('Title and message are required');
        return;
      }
      
      let endpoint = '';
      let method = 'post';
      let data = { 
        title, 
        message,
        deletionTime: deletionTime || null
      };
      
      console.log('Sending notification with data:', data);
      
      if (editNotificationId) {
        // Update existing notification
        endpoint = `${apiUrl}/notifications/admin/${editNotificationId}`;
        method = 'put';
      } else if (targetType === 'global') {
        // Create global notification
        endpoint = `${apiUrl}/notifications/admin/global`;
      } else {
        // Create user-specific notification
        if (!selectedUser) {
          toast.error('Please select a user');
          return;
        }
        endpoint = `${apiUrl}/notifications/admin/user/${selectedUser}`;
      }
      
      const response = await axios({
        method,
        url: endpoint,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      toast.success(editNotificationId ? 'Notification updated' : 'Notification created');
      fetchNotifications();
      setNotificationDialogOpen(false);
      resetNotificationForm();
    } catch (error) {
      console.error('Error with notification:', error);
      toast.error('Error processing notification');
    }
  };
  
  // Delete notification
  const handleDeleteNotification = async (id) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await axios.delete(`${apiUrl}/notifications/admin/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        toast.success('Notification deleted');
        fetchNotifications();
      } catch (error) {
        console.error('Error deleting notification:', error);
        toast.error('Failed to delete notification');
      }
    }
  };
  
  // Open edit notification dialog
  const handleEditNotification = (notification) => {
    setNotificationFormData({
      title: notification.title,
      message: notification.message,
      targetType: notification.type === 'global' ? 'global' : 'user',
      selectedUser: notification.user?._id || '',
      deletionTime: notification.deletionTime ? new Date(notification.deletionTime).toISOString().slice(0, 16) : ''
    });
    setEditNotificationId(notification.id);
    setNotificationDialogOpen(true);
  };
  
  // Reset notification form
  const resetNotificationForm = () => {
    setNotificationFormData({
      title: '',
      message: '',
      targetType: 'global',
      selectedUser: '',
      deletionTime: ''
    });
    setEditNotificationId(null);
  };
  
  // Run cleanup manually
  const handleRunCleanup = async () => {
    try {
      const response = await axios.post(`${apiUrl}/notifications/cleanup`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      toast.success(`Cleanup complete: Deleted ${response.data.deletedCount} expired notifications`);
      fetchNotifications();
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Failed to run cleanup');
    }
  };
  
  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, [token]);

  if (loadingNotifications && notifications.length === 0) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          height: '70vh',
          gap: 3
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6" color="text.secondary">
          Loading Notifications...
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
            p: 3, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #0088cc 0%, #003366 100%)',
            color: 'white',
            mb: 3
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Notification Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Create and manage notifications for your users. Send targeted messages or broadcast announcements.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<AccessTimeIcon />}
                onClick={handleRunCleanup}
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  fontWeight: 600
                }}
              >
                Clean Expired
              </Button>
              <Button 
                variant="contained" 
                startIcon={<NotificationsIcon />}
                onClick={() => {
                  resetNotificationForm();
                  setNotificationDialogOpen(true);
                }}
                sx={{ 
                  bgcolor: 'white',
                  color: '#0088cc',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                  },
                  fontWeight: 600,
                  px: 3
                }}
              >
                New Notification
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2,
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(0, 136, 204, 0.1)', color: '#0088cc' }}>
                  <NotificationsActiveIcon />
                </Avatar>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {notifications.filter(n => n.type === 'global').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Global Notifications
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2,
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(103, 58, 183, 0.1)', color: '#673AB7' }}>
                  <PersonIcon />
                </Avatar>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {notifications.filter(n => n.type !== 'global').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Individual Notifications
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2,
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {notifications.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Notifications
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2,
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#F44336' }}>
                  <GroupIcon />
                </Avatar>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Notifications List */}
        <Paper 
          sx={{ 
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}
        >
          <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
            <Typography variant="h6" fontWeight="bold">
              Recent Notifications
            </Typography>
          </Box>

          {loadingNotifications ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <NotificationsOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Notifications Yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first notification to get started
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Message</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Auto-Delete</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow 
                      key={notification.id}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
                        }
                      }}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {notification.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {notification.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          label={notification.type === 'global' ? 'Global' : 'Individual'}
                          color={notification.type === 'global' ? 'primary' : 'secondary'}
                          sx={{ 
                            fontWeight: 500,
                            bgcolor: notification.type === 'global' 
                              ? 'rgba(0, 136, 204, 0.1)' 
                              : 'rgba(103, 58, 183, 0.1)',
                            color: notification.type === 'global' ? '#0088cc' : '#673AB7',
                            border: 'none'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatNotificationDate(notification.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color={notification.deletionTime ? 'warning.main' : 'text.secondary'}
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          {notification.deletionTime && <AccessTimeIcon fontSize="small" />}
                          {formatDeletionTime(notification.deletionTime)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditNotification(notification)}
                          sx={{ 
                            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            mr: 1
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteNotification(notification.id)}
                          sx={{ 
                            color: '#f44336',
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>

      {/* Notification Dialog */}
      <Dialog 
        open={notificationDialogOpen} 
        onClose={() => setNotificationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editNotificationId ? 'Edit Notification' : 'Create New Notification'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              variant="outlined"
              value={notificationFormData.title}
              onChange={(e) => setNotificationFormData({ ...notificationFormData, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Message"
              variant="outlined"
              value={notificationFormData.message}
              onChange={(e) => setNotificationFormData({ ...notificationFormData, message: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              required
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Notification Type</InputLabel>
              <Select
                value={notificationFormData.targetType}
                label="Notification Type"
                onChange={(e) => setNotificationFormData({ 
                  ...notificationFormData, 
                  targetType: e.target.value,
                  selectedUser: e.target.value === 'global' ? '' : notificationFormData.selectedUser
                })}
              >
                <MenuItem value="global">Global (All Users)</MenuItem>
                <MenuItem value="user">Individual User</MenuItem>
              </Select>
            </FormControl>
            
            {notificationFormData.targetType === 'user' && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Select User</InputLabel>
                <Select
                  value={notificationFormData.selectedUser}
                  label="Select User"
                  onChange={(e) => setNotificationFormData({ ...notificationFormData, selectedUser: e.target.value })}
                >
                  {users.map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {/* Auto-deletion field */}
            <FormControl fullWidth margin="normal">
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 1 }} />
                Auto-Deletion Time 
                <Tooltip title="Set a time when this notification will be automatically deleted. Leave empty for no auto-deletion.">
                  <HelpOutlineIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary', fontSize: '16px' }} />
                </Tooltip>
              </Typography>
              <TextField
                type="datetime-local"
                value={notificationFormData.deletionTime}
                onChange={(e) => setNotificationFormData({ ...notificationFormData, deletionTime: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                fullWidth
              />
              <FormHelperText>
                Leave empty if you don't want the notification to be automatically deleted
              </FormHelperText>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleNotificationSubmit}
            color="primary"
          >
            {editNotificationId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationManagement;