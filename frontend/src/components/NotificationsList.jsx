import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  Divider,
  IconButton,
  CircularProgress,
  Container,
  Paper,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

const NotificationsList = () => {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load notifications',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${apiUrl}/notifications/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update the local state
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification._id !== notificationId)
      );
      
      setSnackbar({
        open: true,
        message: 'Notification deleted',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete notification',
        severity: 'error'
      });
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${apiUrl}/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update the local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Add a mark all as read function
  const markAllAsRead = async () => {
    try {
      await axios.put(`${apiUrl}/notifications/read-all`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update local state after successful API call
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      setSnackbar({
        open: true,
        message: 'All notifications marked as read',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setSnackbar({
        open: true,
        message: 'Failed to mark all notifications as read',
        severity: 'error'
      });
    }
  };

  // Format date for notifications
  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (diffDays === 0) {
      // Today
      return `Today, ${time}`;
    } else if (diffDays === 1) {
      // Yesterday
      return `Yesterday, ${time}`;
    } else if (diffDays < 7) {
      // Within a week - show day name and time
      return `${date.toLocaleDateString(undefined, { weekday: 'short' })}, ${time}`;
    } else {
      // More than a week ago - show full date and time
      return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
    }
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  // Theme-aware colors
  const themeColors = {
    background: darkMode ? '#121212' : '#f5f5f5',
    paper: darkMode ? '#1e1e1e' : '#ffffff',
    text: darkMode ? '#ffffff' : '#191919',
    border: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    menuHover: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
  };

  return (
    <Container maxWidth="md" sx={{ mb: 4 }}>
      <Paper 
        elevation={0} 
        sx={{
          p: 3,
          backgroundColor: themeColors.paper,
          borderRadius: 2,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: themeColors.text }}>
            All Notifications
          </Typography>
          {notifications.length > 0 && (
            <Button 
              variant="outlined" 
              size="small"
              onClick={markAllAsRead}
              sx={{ 
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                color: themeColors.text,
                '&:hover': {
                  borderColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                }
              }}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={30} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 2,
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
              }}
            >
              <img 
                src="/codestats.png" 
                alt="CodeStats" 
                style={{ 
                  width: 30, 
                  height: 30,
                  objectFit: 'contain'
                }} 
              />
            </Box>
            <Typography variant="body1" color="text.secondary">
              You have no notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification._id}>
                <ListItem 
                  sx={{ 
                    p: 2,
                    backgroundColor: !notification.read ? 
                      (darkMode ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)') : 
                      'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: darkMode ? 
                        'rgba(255, 255, 255, 0.05)' : 
                        'rgba(0, 0, 0, 0.02)'
                    },
                    borderRadius: 1,
                    position: 'relative'
                  }}
                  onClick={() => !notification.read && markAsRead(notification._id)}
                >
                  <Box sx={{ 
                    width: '100%', 
                    display: 'flex', 
                    gap: 2,
                    pr: 6
                  }}>
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        borderRadius: '8px'
                      }}
                    >
                      <img 
                        src="/codestats.png" 
                        alt="CodeStats" 
                        style={{ 
                          width: 24, 
                          height: 24,
                          objectFit: 'contain'
                        }} 
                      />
                    </Box>
                    
                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ 
                            fontWeight: notification.read ? 500 : 600,
                            color: !notification.read ? 
                              (darkMode ? '#ffffff' : '#000000') : 
                              (darkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'),
                            mr: 1
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.75rem',
                            flexShrink: 0
                          }}
                        >
                          {formatNotificationDate(notification.createdAt)}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ 
                          color: notification.read ? 
                            (darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)') : 
                            (darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'),
                          lineHeight: 1.5
                        }}
                      >
                        {notification.message}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Delete button */}
                  <IconButton 
                    aria-label="delete notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    sx={{ 
                      position: 'absolute',
                      right: 8,
                      top: 8,
                      color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                      '&:hover': { 
                        backgroundColor: darkMode ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                        color: '#ff4d4d'
                      }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </ListItem>
                {index < notifications.length - 1 && (
                  <Divider 
                    sx={{ 
                      my: 1.5,
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
                    }} 
                  />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default NotificationsList; 