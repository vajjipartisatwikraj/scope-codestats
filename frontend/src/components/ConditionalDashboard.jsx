import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';

const ConditionalDashboard = () => {
  const { user, isAuthenticated, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkUserType = async () => {
      setIsLoading(true);
      
      // If we have authentication but missing user data, fetch it
      if (isAuthenticated && (!user || !user.userType)) {
        try {
          const updatedUser = await refreshUserData();
          
          // If user is admin, redirect to admin dashboard
          if (updatedUser?.userType === 'admin') {
            navigate('/admin', { replace: true });
            return;
          }
        } catch (error) {
          // Silent error handling
        }
      } 
      // If we already know this is an admin user, redirect
      else if (user?.userType === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
      
      // If we reach here, user is authenticated but not an admin
      setIsLoading(false);
    };
    
    checkUserType();
  }, [user, navigate, isAuthenticated, refreshUserData]);
  
  // Show loading indicator while checking
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        flexDirection: 'column'
      }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Preparing your dashboard...
        </Typography>
      </Box>
    );
  }
  
  // For non-admin users, render the Dashboard
  return <Dashboard />;
};

export default ConditionalDashboard; 