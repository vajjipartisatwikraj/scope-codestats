import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const auth = useAuth();
  
  if (!auth || !auth.token) {
    return <Navigate to="/login" />;
  }

  // Check for admin access
  if (adminOnly && auth.user?.userType !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default PrivateRoute;
