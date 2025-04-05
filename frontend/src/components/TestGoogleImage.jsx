import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Avatar, CircularProgress, Paper, Alert } from '@mui/material';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component to test and debug Google profile image retrieval
 */
const TestGoogleImage = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);

  const fetchGoogleProfileInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${apiUrl}/auth/google/debug-profile`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setProfileInfo(response.data);
    } catch (err) {
      console.error('Error fetching Google profile info:', err);
      setError(err.response?.data?.message || 'Failed to fetch Google profile information');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Auto-fetch on component mount
    fetchGoogleProfileInfo();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Google Profile Image Test
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current User Profile
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            src={user?.profilePicture || ''}
            alt={user?.name || 'User'}
            sx={{ width: 80, height: 80, mr: 2 }}
          />
          <Box>
            <Typography variant="body1">
              <strong>Name:</strong> {user?.name || 'Not available'}
            </Typography>
            <Typography variant="body1">
              <strong>Email:</strong> {user?.email || 'Not available'}
            </Typography>
            <Typography variant="body1">
              <strong>Has Profile Picture:</strong> {user?.profilePicture ? 'Yes' : 'No'}
            </Typography>
          </Box>
        </Box>
        
        {user?.profilePicture ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Profile Picture URL:</strong>
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                p: 2, 
                bgcolor: 'rgba(0,0,0,0.05)', 
                borderRadius: 1, 
                overflow: 'auto',
                wordBreak: 'break-all'
              }}
            >
              {user.profilePicture}
            </Box>
          </Box>
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No profile picture found in user context
          </Alert>
        )}
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Debug API Response
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={fetchGoogleProfileInfo}
          disabled={loading}
          sx={{ mb: 3 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Fetch Profile Info'}
        </Button>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {profileInfo && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              <strong>Profile Information:</strong>
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                src={profileInfo.user.profilePictureUrl || ''}
                alt={profileInfo.user.name || 'User'}
                sx={{ width: 80, height: 80, mr: 2 }}
              />
              <Box>
                <Typography variant="body1">
                  <strong>Name:</strong> {profileInfo.user.name || 'Not available'}
                </Typography>
                <Typography variant="body1">
                  <strong>Email:</strong> {profileInfo.user.email || 'Not available'}
                </Typography>
                <Typography variant="body1">
                  <strong>Has Profile Picture:</strong> {profileInfo.user.hasProfilePicture ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body1">
                  <strong>Google ID:</strong> {profileInfo.user.googleId || 'Not available'}
                </Typography>
              </Box>
            </Box>
            
            {profileInfo.user.profilePictureUrl ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Profile Picture URL:</strong>
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(0,0,0,0.05)', 
                    borderRadius: 1, 
                    overflow: 'auto',
                    wordBreak: 'break-all'
                  }}
                >
                  {profileInfo.user.profilePictureUrl}
                </Box>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No profile picture URL found in API response
              </Alert>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TestGoogleImage; 