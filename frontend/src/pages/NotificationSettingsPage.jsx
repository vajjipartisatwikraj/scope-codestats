import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  useTheme
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Notifications as NotificationsIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import PushNotificationSettings from '../components/PushNotificationSettings';
import { useAuth } from '../contexts/AuthContext';

const NotificationSettingsPage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  
  // Redirect to login if not authenticated
  if (!user) {
    return null; // This will be handled by the ProtectedRoute component
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Notification Settings
        </Typography>
        
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link component={RouterLink} to="/dashboard" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/profile" color="inherit">
            Profile
          </Link>
          <Typography color="text.primary">Notification Settings</Typography>
        </Breadcrumbs>
        
        <Typography variant="body1" color="text.secondary">
          Configure how you want to receive notifications from SCOPE.
        </Typography>
      </Box>
      
      {/* Page Content */}
      <Box sx={{ mb: 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.1) 0%, rgba(0, 51, 102, 0.07) 100%)',
            mb: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              sx={{ 
                width: 48, 
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 136, 204, 0.1)',
                color: '#0088cc'
              }}
            >
              <NotificationsIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
                Push Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enable push notifications to stay updated with important announcements and opportunities.
              </Typography>
            </Box>
          </Box>
        </Paper>
        
        {/* Push Notification Settings Component */}
        <PushNotificationSettings />
      </Box>
    </Container>
  );
};

export default NotificationSettingsPage; 