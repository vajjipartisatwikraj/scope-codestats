import React, { useState, useEffect } from 'react';
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
  useTheme
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  InfoOutlined as InfoOutlinedIcon
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

const PushNotificationSettings = () => {
  const { token, user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [existingSubscriptions, setExistingSubscriptions] = useState([]);
  
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
      
      // Fetch existing subscriptions from server
      if (token) {
        const response = await axios.get(`${apiUrl}/notifications/push/subscriptions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.subscriptions) {
          setExistingSubscriptions(response.data.subscriptions);
        }
      }
    } catch (error) {
      toast.error('Failed to check notification status');
    } finally {
      setLoading(false);
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
      
      // Refresh the list of subscriptions
      await checkPushNotificationStatus();
    } catch (error) {
      toast.error(error.message || 'Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };
  
  // Send a test notification
  const sendTestNotification = async () => {
    if (!supported || !subscribed) {
      toast.error('Push notifications are not enabled');
      return;
    }
    
    if (!user || !user.id) {
      toast.error('User information not available');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(
        `${apiUrl}/notifications/admin/user/${user.id}`,
        {
          title: 'Test Notification',
          message: 'This is a test push notification from SCOPE'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success('Test notification sent');
    } catch (error) {
      toast.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };
  
  // Format device info
  const formatDeviceInfo = (infoString) => {
    try {
      const info = JSON.parse(infoString);
      return {
        platform: info.platform || 'Unknown',
        browser: info.userAgent ? getBrowserName(info.userAgent) : 'Unknown',
        date: info.timestamp ? new Date(info.timestamp).toLocaleDateString() : 'Unknown'
      };
    } catch (error) {
      return {
        platform: 'Unknown',
        browser: 'Unknown',
        date: 'Unknown'
      };
    }
  };
  
  // Extract browser name from user agent
  const getBrowserName = (userAgent) => {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    return 'Unknown';
  };
  
  // Initialize component
  useEffect(() => {
    checkPushNotificationStatus();
  }, [token]);
  
  // Show loading state
  if (loading && !existingSubscriptions.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Check if user is admin
  const isAdmin = user && user.userType === 'admin';
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}` 
      }}
    >
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Push Notification Settings
      </Typography>
      
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
          {isAdmin && (
            <Button
              variant="outlined"
              size="small"
              onClick={sendTestNotification}
              startIcon={<NotificationsActiveIcon />}
              sx={{ mr: 1 }}
            >
              Send Test Notification
            </Button>
          )}
          
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
      
      {existingSubscriptions.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          
          {isAdmin && (
            <>
              <Box sx={{ mt: 3, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Admin Controls
                      </Typography>
                    </Box>
            </>
          )}
        </>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
        <InfoOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          Push notifications allow you to receive alerts from SCOPE even when you're not using the website.
        </Typography>
      </Box>
    </Paper>
  );
};

export default PushNotificationSettings; 