import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ConditionalDashboard.css';

// The views of the old dashboard that have not been rebuilt yet (see deprecated/deprecated_Dashboard.jsx)
const LEGACY_VIEWS = new Set(['platforms', 'progress']);

/**
 * Chooses what /dashboard shows.
 *
 * Admins and teachers are sent to the admin dashboard. Students get `children` (the new
 * dashboard), except for ?view=platforms and ?view=progress, which get `legacy` (the old
 * dashboard) because linking platforms and the Progress tab only exist there so far.
 */
const ConditionalDashboard = ({ children, legacy = null }) => {
  const { user, isAuthenticated, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  
  // Students: the old dashboard for the two views it still owns, the new one otherwise
  if (legacy && LEGACY_VIEWS.has(searchParams.get('view'))) return legacy;
  return children;
};

export default ConditionalDashboard; 