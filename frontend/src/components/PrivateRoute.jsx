import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { getDashboardPath, isPendingTeacher } from '../utils/userHelpers';

// adminOnly lets admins and teachers in; strictAdmin lets only admins in.
const PrivateRoute = ({ children, adminOnly = false, strictAdmin = false }) => {
  const auth = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  
  const refreshUserData = auth.refreshUserData;
  const hasToken = Boolean(auth.token);
  const needsUserData = hasToken && (!auth.user || auth.user.userType === undefined);

  // The spinner is for the first check only. It used to switch back on whenever the auth
  // context changed (a profile save, for example), which unmounted the page and lost its state.
  useEffect(() => {
    if (!auth.isInitialized) return undefined;

    let cancelled = false;
    const checkAccess = async () => {
      // The user record is missing its role, so fetch it before deciding where to send them
      if (needsUserData) {
        try {
          await refreshUserData();
        } catch (error) {
          // Silent error handling
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [auth.isInitialized, needsUserData, refreshUserData]);

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

  // Someone who signed in from the teacher page and is waiting for approval can only see
  // the teacher access page. Once approved, that page is no longer theirs to open.
  if (isPendingTeacher(auth.user) && location.pathname !== '/teacher-access') {
    return <Navigate to="/teacher-access" replace />;
  }
  if (!isPendingTeacher(auth.user) && location.pathname === '/teacher-access') {
    return <Navigate to={getDashboardPath(auth.user)} replace />;
  }

  // Pages only admins may open (teachers are sent back to their dashboard)
  if (strictAdmin && auth.user?.userType !== 'admin') {
    return <Navigate to={getDashboardPath(auth.user)} replace />;
  }

  // Check for admin access - explicit userType check (allow both admin and teacher)
  if (adminOnly && auth.user?.userType !== 'admin' && auth.user?.userType !== 'teacher') {
    return <Navigate to="/dashboard" replace />;
  }

  // Prevent admin/teacher users from accessing CodePad
  if (location.pathname === '/codepad' && (auth.user?.userType === 'admin' || auth.user?.userType === 'teacher')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Resume building is a student-only feature
  if (location.pathname.startsWith('/build-resume') && (auth.user?.userType === 'admin' || auth.user?.userType === 'teacher')) {
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
