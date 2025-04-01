import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const auth = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      
      // If we need to check for admin access and user type is missing or undefined
      if (auth.token && (!auth.user || auth.user.userType === undefined)) {
        try {
          // Wait for user data to be fetched
          await auth.refreshUserData();
        } catch (error) {
          // Silent error handling
        }
      }
      
      setIsLoading(false);
    };
    
    if (auth.isInitialized) {
      checkAccess();
    }
  }, [auth, location.pathname, adminOnly]);

  // If auth is still initializing or we're loading user data, show loading indicator
  if (!auth.isInitialized || isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ mt: 2 }}>
          {isLoading ? 'Verifying access...' : 'Loading authentication...'}
        </Typography>
      </Box>
    );
  }
  
  // Redirect users from /auth/success (should be handled by AuthContext but just in case)
  if (location.pathname.includes('/auth/success')) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // No auth token, redirect to login
  if (!auth.token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check for admin access - explicit userType check
  if (adminOnly && auth.user?.userType !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check if this is a new user that needs to complete profile setup
  if (auth.user?.newUser === true || auth.user?.profileCompleted === false) {
    // Only redirect if not already on profile setup page
    if (!location.pathname.includes('/profile') || !location.search.includes('setup=true')) {
      return <Navigate to="/profile?setup=true" replace />;
    }
  }

  // All checks passed, render the protected component
  return children;
};

export default PrivateRoute;
