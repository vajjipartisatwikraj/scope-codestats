import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ConditionalDashboard.css';

/**
 * Chooses what /dashboard shows.
 *
 * Admins are sent to the admin dashboard. Students get `children` (the student dashboard).
 */
const ConditionalDashboard = ({ children }) => {
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
            navigate('/admin/dashboard', { replace: true });
            return;
          }
        } catch (error) {
          // Silent error handling
        }
      } 
      // If we already know this is an admin user, redirect
      else if (user?.userType === 'admin') {
        navigate('/admin/dashboard', { replace: true });
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
      <div className="ds-gate" role="status">
        <span className="ds-gate__spinner" aria-hidden="true" />
        <p className="ds-gate__text">Preparing your dashboard...</p>
      </div>
    );
  }
  
  return children;
};

export default ConditionalDashboard; 